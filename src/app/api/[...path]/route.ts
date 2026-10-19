import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, assert } from "@/lib/errors";
import { capabilities } from "@/lib/config";
import {
  authenticate,
  checkOrigin,
  login,
  sessionCookie,
  requireBrowser,
  issueToken,
  logoutSession,
} from "@/server/auth";
import { searchOffers, getOffer } from "@/server/catalog";
import { planTask } from "@/server/planner";
import { createQuote, getQuote } from "@/server/quotes";
import {
  createPurchase,
  getPurchase,
  createPayPalOrder,
  approvePurchase,
  simulateApproval,
  cancelPurchase,
  getResult,
  enqueue,
  purchaseInclude,
} from "@/server/purchases";
import { requestRefund } from "@/server/settlement";
import { sellerDashboard, editOffer } from "@/server/sellers";
import { verifyWebhook } from "@/server/paypal";
import { draftAnswer } from "@/server/answers";
import { persistVerifiedWebhook } from "@/server/webhooks";
import { drainJobs, wakeEmbeddedJobs } from "@/server/embedded-jobs";
import { requireCron } from "@/server/cron-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
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
      return json({ status: "ok", environment: "sandbox" });
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
        .parse(await request.json());
      await verifyWebhook(request.headers, body);
      await persistVerifiedWebhook(body);
      wakeQueue = true;
      return json({ received: true });
    }
    checkOrigin(request);
    if (route === "auth/login" && method === "POST") {
      const input = z
        .object({ email: z.email(), password: z.string().min(1).max(200) })
        .parse(await request.json());
      const token = await login(input.email, input.password);
      const response = json({ signedIn: true });
      response.cookies.set(sessionCookie, token, {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production" &&
          !request.url.startsWith("http://localhost"),
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 86400,
      });
      return response;
    }
    if (route === "auth/demo" && method === "POST") {
      assert(
        capabilities().demo,
        "DEMO_DISABLED",
        "Demo accounts are disabled.",
        403,
      );
      const input = z
        .object({
          account: z
            .enum(["buyer", "pricing", "suppliers", "market", "researcher"])
            .default("buyer"),
        })
        .parse(await request.json());
      const token = await login(
        `${input.account}@trove.test`,
        ["buyer", "researcher"].includes(input.account)
          ? "trove-demo-buyer"
          : "trove-demo-seller",
      );
      const response = json({ signedIn: true });
      response.cookies.set(sessionCookie, token, {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production" &&
          new URL(request.url).protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 86400,
      });
      return response;
    }
    if (route === "bootstrap") {
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
    const purchaseScope =
      method === "POST" && ["tasks", "quotes", "purchases"].includes(path[0]);
    const actor = await authenticate(
      request,
      purchaseScope ? "purchase" : "read",
    );
    wakeQueue = method !== "GET" || path[0] === "purchases";
    if (route === "auth/logout" && method === "POST") {
      requireBrowser(actor);
      await logoutSession(request);
      const response = json({ signedIn: false });
      response.cookies.delete(sessionCookie);
      return response;
    }
    if (route === "tasks" && method === "GET")
      return json(
        await db.taskRun.findMany({
          where: { workspaceId: actor.workspaceId },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
      );
    if (route === "tasks" && method === "POST")
      return json(
        await planTask(
          actor,
          z
            .object({
              prompt: z.string().min(10).max(4000),
              budgetCents: z.number().int(),
              mode: z.enum(["demo", "live"]),
            })
            .parse(await request.json()),
        ),
      );
    if (path[0] === "tasks" && path[1] && method === "GET") {
      const task = await db.taskRun.findFirst({
        where: { id: path[1], workspaceId: actor.workspaceId },
      });
      assert(task, "NOT_FOUND", "Task not found.", 404);
      return json(task);
    }
    if (route === "quotes" && method === "POST")
      return json(
        await createQuote(
          actor,
          z
            .object({
              offerIds: z.array(z.string()).min(1).max(6),
              taskId: z.string().optional(),
              quantity: z.number().int().min(1).max(12).optional(),
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
            .parse(await request.json()),
        ),
      );
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
          mode: z.enum(["sandbox", "simulation"]).default("sandbox"),
          idempotencyKey: z.string().min(8).max(100),
        })
        .parse(await request.json());
      return json(
        await createPurchase(
          actor,
          input.quoteId,
          input.mode,
          input.idempotencyKey,
        ),
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
          .parse(await request.json());
        return json(await approvePurchase(actor, id, input.orderId));
      }
      if (path[2] === "simulate" && method === "POST") {
        const input = z
          .object({
            scenario: z
              .enum(["success", "outage", "missing_field", "stale"])
              .default("success"),
          })
          .parse(await request.json());
        return json(await simulateApproval(actor, id, input.scenario));
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
          .parse(await request.json());
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
        .parse(await request.json());
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
        .parse(await request.json());
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
          message:
            "The operation could not be completed. Your payment status has not been assumed. Please check purchase activity.",
        },
      },
      500,
    );
  } finally {
    if (wakeQueue) after(wakeEmbeddedJobs);
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
