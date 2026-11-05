import { z } from "zod";
import { setTimeout as delay } from "node:timers/promises";
import { db } from "@/lib/db";
import { AppError, assert } from "@/lib/errors";
import type { Actor } from "./auth";

const endpoint =
  "https://generativelanguage.googleapis.com/v1beta/interactions";
// Explicit models whose text input/output currently have a free tier. Never fall back to a paid provider.
const freeModels = new Set(["gemini-3.8-flash", "gemini-3.5-flash-lite"]);
export function aiConfigured() {
  return !!process.env.GEMINI_API_KEY;
}
async function reserveQuota(actor: Actor) {
  const configured = Number(process.env.GEMINI_DAILY_REQUEST_LIMIT || "30");
  const limit =
    Number.isInteger(configured) && configured > 0
      ? Math.min(configured, 1000)
      : 30;
  const now = new Date();
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('trove-gemini-quota'))::text`;
    const [daily, minute] = await Promise.all([
      tx.auditEvent.count({
        where: { action: "ai_request_reserved", createdAt: { gte: day } },
      }),
      tx.auditEvent.count({
        where: {
          action: "ai_request_reserved",
          createdAt: { gte: new Date(now.getTime() - 60000) },
        },
      }),
    ]);
    assert(
      daily < limit,
      "AI_DAILY_LIMIT",
      "Today’s AI allowance is used. You can still search sources and download your data.",
      429,
    );
    assert(
      minute < 5,
      "AI_QUOTA_LIMIT",
      "AI is busy. Please try again in a minute.",
      429,
    );
    await tx.auditEvent.create({
      data: {
        actor: actor.id,
        resourceId: actor.workspaceId,
        action: "ai_request_reserved",
      },
    });
  });
}
export async function generateText(
  actor: Actor,
  instructions: string,
  input: string,
  schema?: Record<string, unknown>,
) {
  assert(
    aiConfigured(),
    "AI_NOT_CONFIGURED",
    "AI is temporarily unavailable. You can still search sources and download your data.",
    503,
  );
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  assert(
    freeModels.has(model),
    "AI_MODEL_NOT_ALLOWED",
    "Choose a supported free-tier Gemini model. Paid-model fallback is disabled.",
    503,
  );
  const alternate = [...freeModels].find((candidate) => candidate !== model)!;
  // No paid model, tools or stored interactions. At most three provider attempts;
  // each reserves the shared daily/minute allowance, including failed attempts.
  const attempts = [model, alternate, model];
  const deadline = Date.now() + 45000;
  let response: Response | undefined;
  for (const [attempt, candidate] of attempts.entries()) {
    if (attempt)
      await delay(500 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250));
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    await reserveQuota(actor);
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          model: candidate,
          input,
          system_instruction: instructions,
          store: false,
          generation_config: { max_output_tokens: 3072 },
          ...(schema
            ? {
                response_format: {
                  type: "text",
                  mime_type: "application/json",
                  schema,
                },
              }
            : {}),
        }),
        signal: AbortSignal.timeout(Math.min(20000, remaining)),
      });
    } catch {
      response = undefined;
      console.warn("AI generation attempt unavailable", {
        code: "AI_NETWORK_UNAVAILABLE",
        model: candidate,
        attempt: attempt + 1,
      });
      continue;
    }
    if (response.ok) break;
    const status = response.status;
    const code =
      status === 429
        ? "AI_QUOTA_LIMIT"
        : [401, 403].includes(status)
          ? "AI_PROVIDER_DENIED"
          : status === 404
            ? "AI_MODEL_UNAVAILABLE"
            : status === 400
              ? "AI_REQUEST_REJECTED"
              : "AI_UNAVAILABLE";
    // Never log provider bodies: they can repeat prompts, records or credentials.
    console.warn("AI generation attempt unavailable", {
      code,
      providerStatus: status,
      model: candidate,
      attempt: attempt + 1,
    });
    await response.body?.cancel().catch(() => {});
    if (![408, 500, 502, 503, 504].includes(status)) {
      throw new AppError(
        code,
        status === 429
          ? "AI is temporarily rate-limited. Please try again later."
          : [401, 403, 404].includes(status)
            ? "AI is unavailable for this service. You can still search sources and download your data."
            : "AI could not process this request. You can still search sources and download your data.",
        status === 429 ? 429 : 503,
      );
    }
  }
  assert(
    response?.ok,
    "AI_UNAVAILABLE",
    "AI is temporarily busy. Please try again shortly.",
    503,
  );
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AppError(
      "AI_INVALID_RESPONSE",
      "The AI response could not be read. Please try again.",
      502,
    );
  }
  const payload = z
    .object({
      status: z.string(),
      steps: z
        .array(
          z.object({
            type: z.string(),
            content: z
              .array(
                z.object({ type: z.string(), text: z.string().optional() }),
              )
              .optional(),
          }),
        )
        .optional(),
    })
    .safeParse(body);
  assert(
    payload.success && payload.data.status === "completed",
    "AI_INVALID_RESPONSE",
    "The AI response was incomplete. Please try again.",
    502,
  );
  const text = payload.data.steps
    ?.filter((s) => s.type === "model_output")
    .flatMap((s) => s.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text || "")
    .join("\n")
    .trim();
  assert(
    text && text.length <= 60000,
    "AI_INVALID_RESPONSE",
    "The AI response was empty or too large.",
    502,
  );
  return text;
}
export async function generateStructured<T extends z.ZodType>(
  actor: Actor,
  instructions: string,
  input: string,
  schema: T,
): Promise<z.infer<T>> {
  const { $schema: _version, ...jsonSchema } = z.toJSONSchema(schema);
  const text = await generateText(actor, instructions, input, jsonSchema);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new AppError(
      "AI_INVALID_RESPONSE",
      "The AI did not return valid structured data.",
      502,
    );
  }
  const result = schema.safeParse(value);
  assert(
    result.success,
    "AI_INVALID_RESPONSE",
    "The AI response did not match the required schema.",
    502,
  );
  return result.data;
}
