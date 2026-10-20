import { authorizationMetadata, protectedMetadata } from "@/server/agent-oauth";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ metadata: string[] }> },
) {
  const path = (await params).metadata.join("/");
  const value =
    path === "oauth-authorization-server"
      ? authorizationMetadata()
      : [
            "oauth-protected-resource",
            "oauth-protected-resource/api/mcp",
          ].includes(path)
        ? protectedMetadata()
        : null;
  return Response.json(value || { error: "not_found" }, {
    status: value ? 200 : 404,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
