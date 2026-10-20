import {
  OAuthError,
  exchangeAgentToken,
  registerAgentClient,
  revokeAgentCredentials,
} from "@/server/agent-oauth";
import { rateLimit } from "@/server/rate-limit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  "Access-Control-Allow-Origin": "*",
};
async function smallBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader)
    throw new OAuthError("invalid_request", "A request body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 16384) {
        await reader.cancel();
        throw new OAuthError("invalid_request", "Request too large.", 413);
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    reader.releaseLock();
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    if (!["register", "token", "revoke"].includes(action))
      return Response.json({ error: "not_found" }, { status: 404, headers });
    await rateLimit(
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown",
      `oauth-${action}`,
      action === "register" ? 60 : 180,
      3600000,
    );
    const text = await smallBody(request);
    if (action === "register") {
      if (!request.headers.get("content-type")?.includes("application/json"))
        throw new OAuthError("invalid_request", "Use application/json.");
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        throw new OAuthError("invalid_client_metadata", "Invalid JSON.");
      }
      return Response.json(await registerAgentClient(body), {
        status: 201,
        headers,
      });
    }
    if (
      !request.headers
        .get("content-type")
        ?.includes("application/x-www-form-urlencoded")
    )
      throw new OAuthError(
        "invalid_request",
        "Use application/x-www-form-urlencoded.",
      );
    const body = new URLSearchParams(text);
    if ([...new Set(body.keys())].some((k) => body.getAll(k).length > 1))
      throw new OAuthError(
        "invalid_request",
        "Repeated parameters are not allowed.",
      );
    if (action === "revoke") {
      await revokeAgentCredentials(body, request.headers.get("authorization"));
      return new Response(null, { status: 200, headers });
    }
    return Response.json(
      await exchangeAgentToken(body, request.headers.get("authorization")),
      { headers },
    );
  } catch (e) {
    const known = e instanceof OAuthError;
    const status = known
      ? e.status
      : (e as { status?: number }).status === 429
        ? 429
        : 500;
    return Response.json(
      {
        error: known
          ? e.code
          : status === 429
            ? "temporarily_unavailable"
            : "server_error",
        error_description: known
          ? e.message
          : status === 429
            ? "Too many connection requests. Try again later."
            : "Connection could not be completed. Try again.",
      },
      {
        status,
        headers: {
          ...headers,
          ...(status === 401
            ? { "WWW-Authenticate": 'Basic realm="Trove OAuth"' }
            : {}),
        },
      },
    );
  }
}
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...headers,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
