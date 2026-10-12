import { createMcpHandler } from "@modelcontextprotocol/server";
import { createAgentkitMcpServer, MCP_READ_SCOPE, MCP_WRITE_SCOPE, type McpOptions } from "./server.js";

/** Verified by the host's authorization service, including current membership and revocation. */
export type AuthorizedConnection = McpOptions & {
  subject: string;
  workspaceId: string;
  expiresAt: number;
  scopes: readonly string[];
};

export type HttpOptions = {
  /** Canonical production resource identifier. An HTTP loopback URL is permitted for tests. */
  resourceUrl: string;
  authorizationServers: readonly string[];
  /** Must verify signature/introspection, issuer, audience, expiry, scope and revocation. */
  authorize: (token: string, request: Request) => Promise<AuthorizedConnection | null>;
  /** Optional deployment admission limit. Called before dispatch, including discovery. */
  admit?: (connection: AuthorizedConnection, request: Request) => Promise<boolean>;
};

/** Stateless fetch entrypoint for serverless, Next.js route handlers and other Web runtimes. */
export function createAgentkitHttpHandler(options: HttpOptions): { fetch(request: Request): Promise<Response> } {
  const resource = new URL(options.resourceUrl);
  if (resource.username || resource.password || resource.search || resource.hash ||
    !(resource.protocol === "https:" || resource.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(resource.hostname))) {
    throw new Error("MCP resource must be a canonical HTTPS URL, or explicit HTTP loopback.");
  }
  if (!options.authorizationServers.length) throw new Error("At least one authorization server is required.");
  for (const issuer of options.authorizationServers) {
    const url = new URL(issuer);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("Authorization servers must be HTTPS issuers.");
  }
  const metadataPath = `/.well-known/oauth-protected-resource${resource.pathname === "/" ? "" : resource.pathname}`;
  const metadataUrl = `${resource.origin}${metadataPath}`;
  const headers = { "cache-control": "no-store" };
  const challenge = () => Response.json({ error: "unauthorized" }, { status: 401,
    headers: { ...headers, "www-authenticate": `Bearer resource_metadata="${metadataUrl}"` } });

  return { async fetch(request) {
    const url = new URL(request.url);
    if (url.origin !== resource.origin) return new Response("Invalid host", { status: 421, headers });
    if (request.headers.has("origin") && request.headers.get("origin") !== resource.origin) return new Response("Invalid origin", { status: 403, headers });
    if (url.pathname === metadataPath && request.method === "GET") return Response.json({
      resource: resource.href, authorization_servers: [...options.authorizationServers],
      scopes_supported: [MCP_READ_SCOPE, MCP_WRITE_SCOPE], bearer_methods_supported: ["header"],
      resource_name: "Agentkit", resource_documentation: "https://agentkit.ai/docs/developer/api-v2",
    }, { headers });
    if (url.pathname !== resource.pathname || url.search) return new Response("Not found", { status: 404, headers });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { ...headers, allow: "POST" } });
    const authorization = request.headers.get("authorization");
    if (!authorization || authorization.length > 8192 || !/^Bearer [A-Za-z0-9._~+\/-]+=*$/i.test(authorization)) return challenge();
    let connection: AuthorizedConnection | null;
    try { connection = await options.authorize(authorization.slice(7), request); }
    catch { return Response.json({ error: "authorization_unavailable" }, { status: 503, headers }); }
    if (!connection || !connection.subject || !connection.workspaceId || !Number.isFinite(connection.expiresAt) || connection.expiresAt <= Date.now() / 1000 ||
      !connection.scopes.includes(MCP_READ_SCOPE)) return challenge();
    if (options.admit && !await options.admit(connection, request)) return Response.json({ error: "rate_limited" }, { status: 429, headers });
    const handler = createMcpHandler(() => createAgentkitMcpServer({ ...connection,
      createClient: signal => connection.createClient(AbortSignal.any([request.signal, signal])),
    }), { responseMode: "json", maxRequestBodySize: 128 * 1024, maxSubscriptions: 0 });
    try {
      const response = await handler.fetch(request);
      response.headers.set("cache-control", "no-store");
      if (!response.body) { await handler.close(); return response; }
      const reader = response.body.getReader();
      return new Response(new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const part = await reader.read();
            if (part.done) { controller.close(); await handler.close(); }
            else controller.enqueue(part.value);
          } catch (error) { controller.error(error); await handler.close(); }
        },
        async cancel(reason) { await reader.cancel(reason); await handler.close(); },
      }), { status: response.status, headers: response.headers });
    } catch { await handler.close(); return Response.json({ error: "request_failed" }, { status: 500, headers }); }
  } };
}
