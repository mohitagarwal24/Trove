import { beginGoogle, finishGoogle, googleCookie } from "@/server/google-auth";
import { discoverySchema } from "@/lib/research";
import { discoverData } from "@/server/discovery";
import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, assert } from "@/lib/errors";
import { appUrl, capabilities, paymentEnvironment } from "@/lib/config";
import {
  authenticate,
  checkOrigin,
  login,
  sessionCookie,
  requireBrowser,
  issueToken,
  logoutSession,
  updateProfile,
  changePassword,
  closeAccount,
  register,
  requestPasswordReset,
  resetPassword,
} from "@/server/auth";
import { searchOffers, getOffer } from "@/server/catalog";
import { planTask } from "@/server/planner";
import { createQuote, getQuote } from "@/server/quotes";
import {
  createPurchase,
  getPurchase,
  createPayPalOrder,
  approvePurchase,
  cancelPurchase,
  getResult,
  enqueue,
  purchaseInclude,
} from "@/server/purchases";
import { requestRefund } from "@/server/settlement";
import {
  sellerDashboard,
  editOffer,
  onboardSeller,
  publishDataset,
} from "@/server/sellers";
import { verifyWebhook } from "@/server/paypal";
import { draftAnswer } from "@/server/answers";
import { persistVerifiedWebhook } from "@/server/webhooks";
import { drainJobs, wakeEmbeddedJobs } from "@/server/embedded-jobs";
import { rateLimit } from "@/server/rate-limit";
import { categories } from "@/lib/catalogue";
import { requireCron } from "@/server/cron-auth";
import { hash } from "@/lib/crypto";
import {
  verificationStatus,
  requestEmailVerification,
  verifyEmail,
} from "@/server/email-verification";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
async function authResponse(request: NextRequest, token: string, status = 200) {
  const session = await db.session.findUniqueOrThrow({
    where: { id: hash(token) },
    include: { user: true },
  });
  const verified = !!session.user.emailVerifiedAt;
  const response = json(
    {
      signedIn: verified,
      verificationRequired: !verified,
      email: session.user.email,
    },
    status,
  );
  response.cookies.set(sessionCookie, token, {
    httpOnly: true,
    secure: new URL(process.env.APP_URL || request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
  return response;
}
async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  let wakeQueue = false;
  try {
    const { path } = await context.params;
    const route = path.join("/");
    const method = request.method;
    if (route === "health" && method === "GET") {
      return json({ status: "ok", environment: paymentEnvironment() });
    }
    if (route === "ops/tick" && method === "POST") {
      requireCron(request);
      return json({ status: "ok", ...(await drainJobs(true)) });
    }
    if (route === "webhooks/paypal" && method === "POST") {
      const body = z
        .object({
          id: z.string(),
          event_type: z.string(),
          resource: z.object({ id: z.string().optional() }).passthrough(),
        })
        .passthrough()
        .parse(await readJson(request));
      await verifyWebhook(request.headers, body);
      await persistVerifiedWebhook(body);
      wakeQueue = true;
      return json({ received: true });
    }
    if (route === "auth/google" && method === "GET") {
      try {
        const attempt = await beginGoogle(
          request,
          request.nextUrl.searchParams.get("returnTo"),
          request.nextUrl.searchParams.get("intent") === "link",
        );
        const response = NextResponse.redirect(attempt.url);
        response.cookies.set(googleCookie, attempt.browser, {
          httpOnly: true,
          secure:
            new URL(process.env.APP_URL || request.url).protocol === "https:",
          sameSite: "lax",
          path: "/api/auth/google",
          maxAge: 600,
        });
        return response;
      } catch {
        return NextResponse.redirect(
          new URL("/?auth_error=google_start", appUrl()),
        );
      }
    }
    if (route === "auth/google/callback" && method === "GET") {
      let response;
      try {
        const input = z
          .object({
            state: z.string().min(20).max(100),
            code: z.string().min(1).max(4000),
            browser: z.string().min(20).max(100),
          })
          .parse({
            state: request.nextUrl.searchParams.get("state"),
            code: request.nextUrl.searchParams.get("code"),
            browser: request.cookies.get(googleCookie)?.value,
          });
        const result = await finishGoogle(request, input);
        response = NextResponse.redirect(
          new URL(result.returnTo, process.env.APP_URL || request.url),
        );
        response.cookies.set(sessionCookie, result.token, {
          httpOnly: true,
          secure:
            new URL(process.env.APP_URL || request.url).protocol === "https:",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 86400,
        });
      } catch (error) {
        const message =
          error instanceof AppError && error.code === "GOOGLE_LINK_REQUIRED"
            ? "google_link"
            : "google_callback";
        response = NextResponse.redirect(
          new URL(
            "/?auth_error=" + message,
            process.env.APP_URL || request.url,
          ),
        );
      }
      response.cookies.set(googleCookie, "", {
        path: "/api/auth/google",
        maxAge: 0,
      });
      return response;
    }
    checkOrigin(request);
    if (route === "auth/login" && method === "POST") {
      const input = z
        .object({ email: z.email(), password: z.string().min(1).max(200) })
        .parse(await readJson(request));
      const token = await login(input.email, input.password);
      return authResponse(request, token);
    }
    if (route === "auth/register" && method === "POST") {
      const input = z
        .object({
          name: z.string().trim().min(2).max(80),
          email: z.email().max(254),
          password: z.string().min(12).max(128),
        })
        .parse(await readJson(request));
      await rateLimit(
        request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
          "local",
        "signup-ip",
        20,
        3600000,
      );
      return authResponse(request, await register(input), 201);
    }
    if (route === "auth/forgot-password" && method === "POST") {
      const input = z
        .object({ email: z.email() })
        .parse(await readJson(request));
      await rateLimit(
        request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
          "local",
        "recovery-ip",
        10,
        3600000,
      );
      await requestPasswordReset(input.email);
      return json({
        message: "If this account exists, a reset link has been sent.",
      });
    }
    if (route === "auth/reset-password" && method === "POST") {
      const input = z
        .object({
          token: z.string().min(40).max(100),
          password: z.string().min(12).max(128),
        })
        .parse(await readJson(request));
      await resetPassword(input.token, input.password);
      return json({ reset: true });
    }
    if (route === "bootstrap" && method === "GET") {
      let user = null;
      try {
        const actor = await authenticate(request);
        user = {
          id: actor.id,
          name: actor.name,
          email: actor.email,
          role: actor.role,
          sellerId: actor.sellerId,
          workspaceId: actor.workspaceId,
          hasPassword: actor.hasPassword,
          googleConnected: actor.googleConnected,
        };
      } catch {}
      return json({
        user,
        capabilities: capabilities(),
        ...(await searchOffers()),
      });
    }
    if (route === "offers" && method === "GET")
      return json(
        await searchOffers({
          query: request.nextUrl.searchParams.get("q") || "",
          category: request.nextUrl.searchParams.get("category") || undefined,
        }),
      );
    if (path[0] === "offers" && path[1] && method === "GET")
      return json(await getOffer(path[1]));
    if (route.startsWith("auth/verification") || route === "auth/logout") {
      const actor = await authenticate(request, "read", true);
      requireBrowser(actor);
      if (route === "auth/verification" && method === "GET")
        return json(await verificationStatus(actor, request));
      if (route === "auth/verification/send" && method === "POST")
        return json(await requestEmailVerification(actor, request));
      if (route === "auth/verification/confirm" && method === "POST") {
        const { code } = z
          .object({
            code: z
              .string()
              .regex(/^\d{6}$/, "Enter the six-digit code from your email."),
          })
          .parse(await readJson(request));
        return authResponse(request, await verifyEmail(actor, request, code));
      }
      if (route === "auth/logout" && method === "POST") {
        await logoutSession(request);
        const response = json({ signedIn: false });
        response.cookies.delete(sessionCookie);
        return response;
      }
    }
    const purchaseScope =
      method === "POST" && ["tasks", "quotes", "purchases"].includes(path[0]);
    const actor = await authenticate(
      request,
      purchaseScope ? "purchase" : "read",
    );
    wakeQueue = method !== "GET" || path[0] === "purchases";
    if (route === "auth/profile" && method === "PATCH") {
      const input = z
        .object({ name: z.string().trim().min(2).max(80) })
        .parse(await readJson(request));
      await updateProfile(actor, input.name);
      return json({ updated: true });
    }
    if (route === "auth/change-password" && method === "POST") {
      const input = z
        .object({
          currentPassword: z.string().min(1).max(128),
          password: z.string().min(12).max(128),
        })
        .parse(await readJson(request));
      await changePassword(actor, input.currentPassword, input.password);
      const response = json({ updated: true });
      response.cookies.delete(sessionCookie);
      return response;
    }
    if (route === "auth/close-account" && method === "POST") {
      const input = z
        .object({ password: z.string().min(1).max(128).optional() })
        .parse(await readJson(request));
      await closeAccount(actor, input.password);
      const response = json({ closed: true });
      response.cookies.delete(sessionCookie);
      return response;
    }
    if (route === "auth/export" && method === "GET") {
      requireBrowser(actor);
      const [tasks, purchases] = await Promise.all([
        db.taskRun.findMany({ where: { workspaceId: actor.workspaceId } }),
        db.purchase.findMany({
          where: { workspaceId: actor.workspaceId },
          include: { receipt: true, refunds: true },
        }),
      ]);
      return json({
        profile: { name: actor.name, email: actor.email },
        tasks,
        purchases,
      });
    }
    if (route === "discovery" && method === "POST") {
      await rateLimit(actor.id, "discovery", 30, 60000);
      return json(
        await discoverData(
          actor,
          discoverySchema.parse(await readJson(request)),
        ),
      );
    }
    if (route === "tasks" && method === "GET")
      return json(
        await db.taskRun.findMany({
          where: { workspaceId: actor.workspaceId },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
      );
    if (route === "tasks" && method === "POST") {
      await rateLimit(actor.id, "research", 5, 60000);
      return json(
        await planTask(
          actor,
          z
            .object({
              prompt: z.string().min(10).max(4000),
              budgetCents: z.number().int(),
            })
            .parse(await readJson(request)),
        ),
      );
    }
    if (path[0] === "tasks" && path[1] && method === "GET") {
      const task = await db.taskRun.findFirst({
        where: { id: path[1], workspaceId: actor.workspaceId },
      });
      assert(task, "NOT_FOUND", "Task not found.", 404);
      return json(task);
    }
    if (route === "quotes" && method === "POST") {
      await rateLimit(actor.id, "quote", 30, 60000);
      return json(
        await createQuote(
          actor,
          z
            .object({
              offerIds: z.array(z.string()).min(1).max(6),
              taskId: z.string().optional(),
              quantity: z.number().int().min(1).max(100).optional(),
              fieldsByOffer: z
                .record(z.string(), z.array(z.string()))
                .optional(),
              purpose: z
                .enum([
                  "internal_business_analysis",
                  "ai_inference",
                  "academic_research",
                ])
                .optional(),
            })
            .parse(await readJson(request)),
        ),
      );
    }
    if (path[0] === "quotes" && path[1] && method === "GET")
      return json(await getQuote(actor, path[1]));
    if (route === "purchases" && method === "GET")
      return json(
        await db.purchase.findMany({
          where: { workspaceId: actor.workspaceId },
          include: purchaseInclude,
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      );
    if (route === "purchases" && method === "POST") {
      const input = z
        .object({
          quoteId: z.string(),
          idempotencyKey: z.string().min(8).max(100),
        })
        .parse(await readJson(request));
      return json(
        await createPurchase(actor, input.quoteId, input.idempotencyKey),
      );
    }
    if (path[0] === "purchases" && path[1]) {
      const id = path[1];
      if (!path[2] && method === "GET")
        return json(await getPurchase(actor, id));
      if (path[2] === "result" && method === "GET")
        return json(await getResult(actor, id));
      if (path[2] === "answer" && method === "POST")
        return json(await draftAnswer(actor, id));
      if (path[2] === "receipt" && method === "GET") {
        const p = await getPurchase(actor, id);
        assert(
          p.receipt,
          "NOT_FOUND",
          "A receipt is issued after confirmed capture.",
          404,
        );
        return json({
          ...p.receipt,
          paymentState: p.paymentState,
          settlementState: p.settlementState,
          refunds: p.refunds,
        });
      }
      requireBrowser(actor);
      if (path[2] === "order" && method === "POST")
        return json(await createPayPalOrder(actor, id));
      if (path[2] === "approve" && method === "POST") {
        const input = z
          .object({ orderId: z.string() })
          .parse(await readJson(request));
        return json(await approvePurchase(actor, id, input.orderId));
      }
      if (path[2] === "cancel" && method === "POST")
        return json(await cancelPurchase(actor, id));
      if (path[2] === "retry" && method === "POST") {
        const p = await getPurchase(actor, id);
        assert(
          p.approvedAt && !["refunded", "voided"].includes(p.paymentState),
          "INVALID_STATE",
          "This purchase cannot be reconciled.",
          409,
        );
        await enqueue(
          p.paymentState === "captured" ? "settle" : "reconcile",
          id,
          crypto.randomUUID(),
        );
        return json({ queued: true });
      }
      if (path[2] === "refund" && method === "POST") {
        const input = z
          .object({ reason: z.string().min(10).max(500) })
          .parse(await readJson(request));
        return json(await requestRefund(actor, id, input.reason));
      }
    }
    if (route === "tokens" && method === "GET") {
      requireBrowser(actor);
      return json(
        await db.agentToken.findMany({
          where: { userId: actor.id, workspaceId: actor.workspaceId },
          select: {
            id: true,
            name: true,
            prefix: true,
            scopes: true,
            createdAt: true,
            expiresAt: true,
            revokedAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      );
    }
    if (route === "tokens" && method === "POST") {
      const input = z
        .object({
          name: z.string().min(1).max(60),
          scopes: z
            .array(z.enum(["read", "purchase"]))
            .min(1)
            .default(["read", "purchase"]),
        })
        .parse(await readJson(request));
      return json(await issueToken(actor, input.name, input.scopes));
    }
    if (path[0] === "tokens" && path[1] && method === "DELETE") {
      requireBrowser(actor);
      await db.agentToken.updateMany({
        where: { id: path[1], userId: actor.id },
        data: { revokedAt: new Date() },
      });
      return json({ revoked: true });
    }
    if (route === "seller/onboard" && method === "POST")
      return json(
        await onboardSeller(
          actor,
          z
            .object({
              name: z.string().trim().min(2).max(80),
              description: z.string().trim().min(20).max(500),
              rightsAttested: z.literal(true),
            })
            .parse(await readJson(request)),
        ),
        201,
      );
    if (route === "seller/offers" && method === "POST") {
      await rateLimit(actor.id, "publish", 10, 3600000);
      const httpsUrl = z
        .url()
        .max(2000)
        .refine(
          (url) => new URL(url).protocol === "https:",
          "Use an HTTPS URL",
        );
      return json(
        await publishDataset(
          actor,
          z
            .object({
              title: z.string().trim().min(3).max(100),
              description: z.string().trim().min(20).max(600),
              category: z.enum(categories),
              priceCents: z.number().int().min(50).max(100000),
              sourceUrl: httpsUrl,
              licenseUrl: httpsUrl,
              attribution: z.string().trim().min(3).max(500),
              sourceUpdatedAt: z.string().max(40),
              rightsAttested: z.literal(true),
              aiProcessing: z.boolean().default(false),
              rows: z
                .array(
                  z.record(
                    z.string().max(50),
                    z.union([z.string().max(5000), z.number().finite()]),
                  ),
                )
                .min(2)
                .max(1000),
            })
            .parse(await readJson(request)),
        ),
        201,
      );
    }
    if (route === "seller" && method === "GET")
      return json(await sellerDashboard(actor));
    if (
      path[0] === "seller" &&
      path[1] === "offers" &&
      path[2] &&
      method === "PATCH"
    ) {
      const input = z
        .object({
          priceCents: z.number().int().min(50).max(100000),
          available: z.boolean(),
          fields: z.array(z.string()).min(1),
          purposes: z.array(z.string()).min(1),
        })
        .parse(await readJson(request));
      return json(await editOffer(actor, path[2], input));
    }
    throw new AppError("NOT_FOUND", "Endpoint not found.", 404);
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        {
          error: {
            code: "INVALID_INPUT",
            message: error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; "),
          },
        },
        400,
      );
    if (error instanceof AppError)
      return json(
        { error: { code: error.code, message: error.message } },
        error.status,
      );
    console.error(
      "API operation failed:",
      error instanceof Error ? error.name : "unknown",
    );
    return json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "The request could not be completed. Please try again.",
        },
      },
      500,
    );
  } finally {
    if (wakeQueue) after(wakeEmbeddedJobs);
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };

async function readJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader)
    throw new AppError("INVALID_INPUT", "A request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      assert(
        size <= 2_000_000,
        "BODY_TOO_LARGE",
        "Upload a JSON file smaller than 2 MB.",
        413,
      );
      chunks.push(value);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new AppError("INVALID_INPUT", "The request is not valid JSON.");
    }
  } finally {
    reader.releaseLock();
  }
}
