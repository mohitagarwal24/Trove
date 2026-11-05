import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { appUrl } from "@/lib/config";

export const agentViewUri = "ui://trove/research-v1.html";
export const agentViewMeta = {
  ui: { resourceUri: agentViewUri },
  "openai/outputTemplate": agentViewUri,
};
export function registerAgentView(server: McpServer) {
  registerAppResource(
    server,
    "Trove research",
    agentViewUri,
    {
      description:
        "Source samples, exact quotes, owned records and purchase issue review.",
    },
    async () => ({
      contents: [
        {
          uri: agentViewUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: await readFile(
            join(process.cwd(), ".generated/agent-view.html"),
            "utf8",
          ),
          _meta: {
            ui: {
              prefersBorder: true,
              domain: new URL(appUrl()).origin,
              csp: { connectDomains: [], resourceDomains: [] },
            },
            "openai/widgetDescription":
              "Trove shows fixed source samples, exact USD quotes, purchased records and support cases. Payment approval uses the existing PayPal web checkout; native ChatGPT checkout is not enabled.",
          },
        },
      ],
    }),
  );
}
