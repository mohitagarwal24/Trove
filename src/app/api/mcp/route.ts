import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticate } from "@/server/auth";
import { createMcpServer } from "@/server/mcp";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/server/rate-limit";
import { appUrl } from "@/lib/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    if (!request.headers.get("authorization")?.startsWith("Bearer "))
      throw new AppError(
        "UNAUTHORIZED",
        "A scoped Trove bearer token is required.",
        401,
      );
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(appUrl()).origin)
      throw new AppError("INVALID_ORIGIN", "MCP origin not permitted.", 403);
    const actor = await authenticate(request);
    await rateLimit(actor.id, "mcp", 120, 60_000);
    const server = createMcpServer(actor);
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: true,
    });
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    // JSON responses finish the request; the stateless transport has no retained session.
    await server.close();
    return response;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "MCP request failed" },
      { status: error instanceof AppError ? error.status : 500 },
    );
  }
}
export async function GET() {
  return new Response("Stateless MCP supports POST requests.", {
    status: 405,
    headers: { Allow: "POST" },
  });
}
