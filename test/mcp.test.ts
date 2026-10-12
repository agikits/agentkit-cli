import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { afterEach, expect, it } from "vitest";
import { AgentkitClient } from "../src/sdk/client.js";
import { createAgentkitHttpHandler, MCP_READ_SCOPE, MCP_WRITE_SCOPE } from "../src/mcp/index.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:http";

const RESOURCE = "https://mcp.agentkit.test/mcp";
const A = "00000000-0000-4000-8000-000000000001";
const CONVERSATION = "AbCdEfGh12345678";
const B = "00000000-0000-4000-8000-000000000002";
const clients: Client[] = [];
afterEach(async () => { for (const client of clients.splice(0)) await client.close(); });

function setup(options: { write?: boolean; large?: boolean; expired?: boolean } = {}) {
  const calls: { token: string; url: string; method: string }[] = [];
  const handler = createAgentkitHttpHandler({ resourceUrl: RESOURCE, authorizationServers: ["https://auth.agentkit.test"],
    authorize: async token => {
      if (!["tenant-a", "tenant-b"].includes(token)) return null;
      const agentId = token === "tenant-a" ? A : B;
      return {
        subject: `subject-${token}`, workspaceId: `workspace-${token}`,
        expiresAt: Date.now() / 1000 + (options.expired ? -1 : 3600), agentIds: [agentId],
        scopes: [MCP_READ_SCOPE, ...(options.write ? [MCP_WRITE_SCOPE] : [])], sensitiveValues: [token],
        createClient: signal => new AgentkitClient({ key: token, signal, maxResponseBytes: 512 * 1024,
          fetch: async (input, init) => {
            const url = String(input);
            const key = new Headers(init?.headers).get("authorization") ?? "";
            calls.push({ token: key, url, method: init?.method ?? "GET" });
            // Independent fake upstream enforces workspace ownership, not MCP tool behavior.
            if (key !== `Bearer ${token}` || url.includes(token === "tenant-a" ? B : A)) return Response.json({ error: { code: "AGENT_NOT_FOUND" } }, { status: 404 });
            await new Promise(resolve => setTimeout(resolve, token === "tenant-a" ? 5 : 1));
            if (/\/conversations\?/.test(url)) return Response.json({ data: [{ id: CONVERSATION }], pagination: { cursor: null, hasMore: false } });
            if (url.includes(`/conversations/${CONVERSATION}`)) return Response.json({ data: { id: CONVERSATION, agentId, messages: [] } });
            if (/\/agents\?/.test(url)) return Response.json({ data: [{ id: agentId, name: token }], pagination: { cursor: null, hasMore: false, total: 1 } });
            return Response.json({ id: agentId, name: token, ...(options.large ? { content: "x".repeat(70_000) } : {}) });
          },
        }),
      };
    },
  });
  async function connect(token: string, modern = true) {
    const client = new Client({ name: "contract-test", version: "1" }, modern ? { versionNegotiation: { mode: { pin: "2026-07-28" } } } : {});
    const responses: Response[] = [];
    clients.push(client);
    await client.connect(new StreamableHTTPClientTransport(new URL(RESOURCE), {
      requestInit: { headers: { authorization: `Bearer ${token}` } },
      fetch: async (input, init) => {
        const response = await handler.fetch(new Request(input, init));
        responses.push(response);
        return response;
      },
    }));
    return { client, responses };
  }
  return { handler, connect, calls };
}

it.each([true, false])("serves useful read tools with no HTTP sessions, modern=%s", async modern => {
  const { connect, calls } = setup();
  const { client, responses } = await connect("tenant-a", modern);
  const tools = await client.listTools();
  expect(tools.tools).toHaveLength(11);
  expect(tools.tools.every(tool => tool.annotations?.readOnlyHint === true)).toBe(true);
  const result = await client.callTool({ name: "agents_get", arguments: { agentId: A } });
  expect(JSON.stringify(result)).toContain(A);
  expect(JSON.stringify(result)).not.toContain("tenant-a"); // caller's credential is masked
  expect(calls).toHaveLength(1);
  expect(calls[0]?.token).toBe("Bearer tenant-a");
  expect(responses.every(response => !response.headers.has("mcp-session-id"))).toBe(true);
});

it("isolates concurrent callers and rejects a cross-agent ID before reaching the API", async () => {
  const { connect, calls } = setup();
  const [{ client: a }, { client: b }] = await Promise.all([connect("tenant-a"), connect("tenant-b")]);
  const [ra, rb] = await Promise.all([
    a.callTool({ name: "agents_get", arguments: { agentId: A } }),
    b.callTool({ name: "agents_get", arguments: { agentId: B } }),
  ]);
  expect(JSON.stringify(ra)).toContain(A);
  expect(JSON.stringify(ra)).not.toContain(B);
  expect(JSON.stringify(rb)).toContain(B);
  const denied = await a.callTool({ name: "agents_get", arguments: { agentId: B } });
  expect(denied.isError).toBe(true);
  expect(JSON.stringify(denied)).toContain("AGENT_ACCESS_DENIED");
  expect(calls).toHaveLength(2);
});

it("hides write tools without a write grant and enforces strict argument schemas", async () => {
  const { connect, calls } = setup();
  const { client } = await connect("tenant-a");
  expect((await client.listTools()).tools.some(tool => tool.name === "settings_instructions_update")).toBe(false);
  const invalid = await client.callTool({ name: "agents_get", arguments: { agentId: A, baseUrl: "https://attacker.test", file: "/etc/passwd" } });
  expect(invalid.isError).toBe(true);
  expect(calls).toHaveLength(0);
});

it("executes an explicitly granted write through the SDK and labels it as a write", async () => {
  const { connect, calls } = setup({ write: true });
  const { client } = await connect("tenant-a");
  const tools = await client.listTools();
  expect(tools.tools.find(tool => tool.name === "settings_instructions_update")?.annotations?.readOnlyHint).toBe(false);
  const result = await client.callTool({ name: "settings_instructions_update", arguments: { agentId: A, instructionsPrompt: "Reply briefly." } });
  expect(result.isError).not.toBe(true);
  expect(calls[0]?.method).toBe("PATCH");
});

it("rejects oversized tool output without silently truncating it", async () => {
  const { connect } = setup({ large: true });
  const { client } = await connect("tenant-a");
  const result = await client.callTool({ name: "agents_get", arguments: { agentId: A } });
  expect(result.isError).toBe(true);
  expect(JSON.stringify(result)).toContain("RESULT_TOO_LARGE");
  expect(JSON.stringify(result).length).toBeLessThan(1000);
});

it("requires a verified current grant and advertises OAuth metadata", async () => {
  const { handler } = setup({ expired: true });
  const unauthenticated = await handler.fetch(new Request(RESOURCE, { method: "POST" }));
  expect(unauthenticated.status).toBe(401);
  expect(unauthenticated.headers.get("www-authenticate")).toContain("oauth-protected-resource/mcp");
  const expired = await handler.fetch(new Request(RESOURCE, { method: "POST", headers: { authorization: "Bearer tenant-a" } }));
  expect(expired.status).toBe(401);
  const metadata = await handler.fetch(new Request("https://mcp.agentkit.test/.well-known/oauth-protected-resource/mcp"));
  expect(await metadata.json()).toMatchObject({ resource: RESOURCE, authorization_servers: ["https://auth.agentkit.test"] });
});

it("rejects cross-origin, wrong-host, oversized and unsupported HTTP requests", async () => {
  const { handler, calls } = setup();
  expect((await handler.fetch(new Request(RESOURCE, { method: "POST", headers: { origin: "https://attacker.test" } }))).status).toBe(403);
  expect((await handler.fetch(new Request("https://attacker.test/mcp", { method: "POST" }))).status).toBe(421);
  expect((await handler.fetch(new Request(RESOURCE))).status).toBe(405);
  const tooLarge = await handler.fetch(new Request(RESOURCE, { method: "POST", headers: { authorization: "Bearer tenant-a", "content-type": "application/json" }, body: "x".repeat(128 * 1024 + 1) }));
  expect(tooLarge.status).toBe(413);
  expect(calls).toHaveLength(0);
});

it.each([true, false])("installed stdio entry speaks modern=%s with protocol-only stdout", async modern => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentkit-mcp-"));
  const client = new Client({ name: "stdio-test", version: "1" }, modern ? { versionNegotiation: { mode: { pin: "2026-07-28" } } } : {});
  clients.push(client);
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/mcp/stdio.js"],
      env: { PATH: process.env.PATH ?? "", AGENTKIT_CONFIG_DIR: dir, AGENTKIT_API_KEY: "synthetic-test-key" },
    }));
    const tools = await client.listTools();
    expect(tools.tools).toHaveLength(11);
    expect(tools.tools.every(tool => tool.annotations?.readOnlyHint)).toBe(true);
  } finally { await client.close(); await fs.rm(dir, { recursive: true, force: true }); }
});

it("reads the reference ID returned by conversation listing", async () => {
  const { connect, calls } = setup();
  const { client } = await connect("tenant-a");
  const listed = await client.callTool({ name: "conversations_list", arguments: { agentId: A } });
  const data = listed.structuredContent as { data: { data: { id: string }[] } };
  const conversationId = data.data.data[0]!.id;
  expect(conversationId).toBe(CONVERSATION);
  const detail = await client.callTool({ name: "conversations_get", arguments: { agentId: A, conversationId } });
  expect(detail.isError).not.toBe(true);
  expect(JSON.stringify(detail)).toContain(CONVERSATION);
  expect(calls).toHaveLength(2);
});

it.each([true, false])("stdio completes an authorized read against HTTP, modern=%s", async modern => {
  const calls: { url?: string; authorization?: string }[] = [];
  const upstream = createServer((request, response) => {
    calls.push({ url: request.url, authorization: request.headers.authorization });
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ data: { id: A, name: "Fixture agent" } }));
  });
  await new Promise<void>(resolve => upstream.listen(0, "127.0.0.1", resolve));
  const address = upstream.address();
  if (!address || typeof address === "string") throw new Error("Fixture must bind a port");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentkit-stdio-read-"));
  const client = new Client({ name: "stdio-read-test", version: "1" }, modern ? { versionNegotiation: { mode: { pin: "2026-07-28" } } } : {});
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath,
      args: ["dist/cli/index.js", "--url", `http://127.0.0.1:${address.port}`, "mcp", "--agent", A],
      env: { PATH: process.env.PATH ?? "", AGENTKIT_CONFIG_DIR: dir, AGENTKIT_API_KEY: "synthetic-read-key" },
    }));
    const read = await client.callTool({ name: "agents_get", arguments: { agentId: A } });
    expect(read.isError).not.toBe(true);
    expect(JSON.stringify(read)).toContain("Fixture agent");
    const denied = await client.callTool({ name: "agents_get", arguments: { agentId: B } });
    expect(denied.isError).toBe(true);
    expect(calls).toEqual([{ url: `/api/v2/agents/${A}`, authorization: "Bearer synthetic-read-key" }]);
  } finally {
    await client.close();
    await new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve()));
    await fs.rm(dir, { recursive: true, force: true });
  }
});
