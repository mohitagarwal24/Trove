import { z } from "zod";
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
      daily < limit && minute < 5,
      "AI_QUOTA_LIMIT",
      "Research is temporarily rate-limited. Please try again later.",
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
    "AI research is temporarily unavailable. You can still browse and compare sources.",
    503,
  );
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  assert(
    freeModels.has(model),
    "AI_MODEL_NOT_ALLOWED",
    "Choose a supported free-tier Gemini model. Paid-model fallback is disabled.",
    503,
  );
  await reserveQuota(actor);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        model,
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
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new AppError(
      "AI_UNAVAILABLE",
      "Research timed out. No purchase was started. Please try again.",
      503,
    );
  }
  if (!response.ok) {
    // Log only a status/code pair. Provider bodies can repeat prompts or credentials.
    const code =
      response.status === 429
        ? "AI_QUOTA_LIMIT"
        : [401, 403].includes(response.status)
          ? "AI_PROVIDER_DENIED"
          : response.status === 404
            ? "AI_MODEL_UNAVAILABLE"
            : response.status === 400
              ? "AI_REQUEST_REJECTED"
              : "AI_UNAVAILABLE";
    console.warn("Brief interpretation unavailable", {
      code,
      providerStatus: response.status,
    });
    throw new AppError(
      code,
      response.status === 429
        ? "Research is temporarily rate-limited. Please try again later."
        : "Brief interpretation is unavailable. Choose requirements to search directly. No purchase was started.",
      response.status === 429 ? 429 : 503,
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
    .safeParse(await response.json());
  assert(
    payload.success && payload.data.status === "completed",
    "AI_INVALID_RESPONSE",
    "The AI response was incomplete. No purchase was started.",
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
