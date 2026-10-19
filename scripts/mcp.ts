import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { authenticate } from "../src/server/auth";
import { createMcpServer } from "../src/server/mcp";
async function main() {
  const token = process.env.TROVE_AGENT_TOKEN;
  if (!token)
    throw new Error(
      "Set TROVE_AGENT_TOKEN to a scoped token created in the Connect page.",
    );
  const actor = await authenticate(
    new Request("http://localhost/api/mcp", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
  const server = createMcpServer(actor);
  await server.connect(new StdioServerTransport());
}
main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
