import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { AgentkitClient } from "../sdk/client.js";
import { AGENT_ID } from "../shared/project.js";
import { resolveConfig } from "../shared/config.js";
import { createAgentkitMcpServer, MCP_READ_SCOPE, MCP_WRITE_SCOPE } from "./server.js";

export type StdioOptions = { url?: string; allowWrites?: boolean; agent?: string[] };

/** Shared implementation for agentkit-mcp and the npm-default agentkit mcp command. */
export async function runStdio(options: StdioOptions): Promise<void> {
  const config = await resolveConfig({ url: options.url });
  if (options.agent?.some(id => !AGENT_ID.test(id))) throw new Error("--agent requires UUIDs.");
  const serving = serveStdio(() => createAgentkitMcpServer({
    createClient: signal => new AgentkitClient({ key: config.key, baseUrl: config.url, signal, maxResponseBytes: 512 * 1024 }),
    scopes: [MCP_READ_SCOPE, ...(options.allowWrites ? [MCP_WRITE_SCOPE] : [])],
    agentIds: options.agent, sensitiveValues: [config.key],
  }), { transport: new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 128 * 1024 }), maxSubscriptions: 0 });
  const stop = () => { void serving.close().catch(() => { process.exitCode = 1; }); };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
