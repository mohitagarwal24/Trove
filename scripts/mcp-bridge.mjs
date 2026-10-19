import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

async function main() {
  const token = process.env.TROVE_AGENT_TOKEN;
  if (!token)
    throw new Error(
      "Set TROVE_AGENT_TOKEN to a token from Trove’s Connect page.",
    );
  const base = new URL(
    process.env.TROVE_URL || "https://trove-mohit24.onrender.com",
  );
  if (
    base.username ||
    base.password ||
    (base.protocol !== "https:" &&
      !(
        base.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)
      ))
  )
    throw new Error("TROVE_URL must use HTTPS, or HTTP on localhost.");
  const remote = new Client({ name: "trove-stdio-bridge", version: "0.3.0" });
  await remote.connect(
    new StreamableHTTPClientTransport(new URL("/api/mcp", base), {
      requestInit: {
        headers: { Authorization: `Bearer ${token}` },
        redirect: "error",
      },
    }),
    { timeout: 60000 },
  );
  // Low-level Server forwards the remote JSON schemas without rebuilding them in Zod.
  const local = new Server(
    { name: "trove", version: "0.3.0" },
    {
      capabilities: { tools: {} },
      instructions: remote.getInstructions(),
    },
  );
  local.setRequestHandler(ListToolsRequestSchema, (request) =>
    remote.listTools(request.params),
  );
  local.setRequestHandler(CallToolRequestSchema, (request) =>
    remote.callTool(request.params),
  );
  local.onclose = () => {
    void remote.close();
  };
  await local.connect(new StdioServerTransport());
  const close = async () => {
    await local.close();
    await remote.close();
    process.exit(0);
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}
main().catch(() => {
  // Never print request headers, tokens or transport response bodies to the client log.
  console.error(
    "Trove connection failed. Check TROVE_URL, your agent token and the server status.",
  );
  process.exit(1);
});
