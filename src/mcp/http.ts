import { createMcpHandler } from "@modelcontextprotocol/server";
import { createAgentkitMcpServer, DEFAULT_SCOPE_NAMES, MCP_TOOL_ACCESS, type McpOptions, type McpScopeNames } from "./server.js";

/** Verified by the host's authorization service, including current membership and revocation. */
export type AuthorizedConnection = Omit<McpOptions, "scopeNames"> & {
  subject: string;
  workspaceId: string;
  expiresAt: number;
  scopes: readonly string[];
};

export type HttpOptions = {
  /** Canonical production resource identifier. An HTTP loopback URL is permitted for local development and tests. */
  resourceUrl: string;
  /** HTTPS issuers. An HTTP loopback issuer is accepted only when the resource is HTTP loopback too. */
  authorizationServers: readonly string[];
  /** Must verify signature/introspection, issuer, audience, expiry, scope and revocation. */
  authorize: (token: string, request: Request) => Promise<AuthorizedConnection | null>;
  /** Optional deployment admission limit. Called before dispatch. */
  admit?: (connection: AuthorizedConnection, request: Request) => Promise<boolean>;
  /** Scope names the authorization server issues. Defaults to agentkit:read and agentkit:write. */
  scopes?: McpScopeNames;
  /**
   * Other origins whose browser requests are accepted, with CORS preflight. "*" accepts every origin,
   * which is safe only because requests authenticate with a bearer token and never with cookies.
   * Requests without an Origin header are unaffected.
   */
  allowedOrigins?: readonly string[] | "*";
  /** Serve RFC 9728 metadata from this handler. Set false when the host serves its own .well-known route. Default true. */
  serveMetadata?: boolean;
};

const LOOPBACK = ["localhost", "127.0.0.1", "[::1]"];
const MAX_BODY_BYTES = 128 * 1024;
const CORS_HEADERS = "authorization, content-type, accept, mcp-protocol-version, mcp-session-id, mcp-method, mcp-name, last-event-id";

/** Reads at most `limit` bytes. Null means the body is larger. */
async function readBounded(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!request.body) return new Uint8Array(new ArrayBuffer(0));
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > limit) { await reader.cancel(); return null; }
    parts.push(part.value);
  }
  const body = new Uint8Array(new ArrayBuffer(size));
  let offset = 0;
  for (const part of parts) { body.set(part, offset); offset += part.byteLength; }
  return body;
}

/** Tool names a JSON-RPC body calls, or null if the body is a JSON-RPC batch array. */
function parseJsonRpcTools(body: Uint8Array): string[] | null {
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(body)); } catch { return []; }
  if (Array.isArray(parsed)) return null;
  if (!parsed || typeof parsed !== "object") return [];
  const { method, params } = parsed as { method?: unknown; params?: { name?: unknown } };
  return method === "tools/call" && typeof params?.name === "string" ? [params.name] : [];
}

/** Stateless fetch entrypoint for serverless, Next.js route handlers and other Web runtimes. */
export function createAgentkitHttpHandler(options: HttpOptions): { fetch(request: Request): Promise<Response> } {
  const resource = new URL(options.resourceUrl);
  const loopbackResource = resource.protocol === "http:" && LOOPBACK.includes(resource.hostname);
  if (resource.username || resource.password || resource.search || resource.hash || !(resource.protocol === "https:" || loopbackResource)) {
    throw new Error("MCP resource must be a canonical HTTPS URL, or explicit HTTP loopback.");
  }
  if (!options.authorizationServers.length) throw new Error("At least one authorization server is required.");
  for (const issuer of options.authorizationServers) {
    const url = new URL(issuer);
    const loopbackIssuer = loopbackResource && url.protocol === "http:" && LOOPBACK.includes(url.hostname);
    if (!(url.protocol === "https:" || loopbackIssuer) || url.username || url.password || url.search || url.hash) {
      throw new Error("Authorization servers must be HTTPS issuers, or HTTP loopback next to an HTTP loopback resource.");
    }
  }
  const scopeNames = options.scopes ?? DEFAULT_SCOPE_NAMES;
  const scopesSupported = [scopeNames.read, scopeNames.write, scopeNames.delete, scopeNames.export].filter((scope): scope is string => !!scope);
  if (scopesSupported.some(scope => !/^[\x21\x23-\x5B\x5D-\x7E]+$/.test(scope)) || new Set(scopesSupported).size !== scopesSupported.length) {
    throw new Error("Scope names must be distinct RFC 6749 scope tokens.");
  }
  // What a client with no token is told to ask for. Clients request exactly this, so it names the
  // default grant (read and write), not the least a connection needs. Delete and export stay step-up.
  const defaultScope = `${scopeNames.read} ${scopeNames.write}`;
  const allowedOrigins = options.allowedOrigins === "*" ? "*" : new Set((options.allowedOrigins ?? []).map(origin => {
    const url = new URL(origin);
    if (url.origin !== origin) throw new Error("allowedOrigins entries must be bare origins.");
    return origin;
  }));
  const serveMetadata = options.serveMetadata ?? true;
  const metadataPath = `/.well-known/oauth-protected-resource${resource.pathname === "/" ? "" : resource.pathname}`;
  const metadataUrl = `${resource.origin}${metadataPath}`;
  const noStore = { "cache-control": "no-store" };

  /** Null: this origin is refused. Otherwise the CORS headers its responses carry (none without an Origin header). */
  function corsFor(request: Request): Record<string, string> | null {
    const origin = request.headers.get("origin");
    if (origin === null || origin === resource.origin) return {};
    if (allowedOrigins !== "*" && !allowedOrigins.has(origin)) return null;
    return {
      "access-control-allow-origin": allowedOrigins === "*" ? "*" : origin,
      "access-control-expose-headers": "www-authenticate, mcp-session-id, mcp-protocol-version",
      vary: "origin",
    };
  }

  return { async fetch(request) {
    const url = new URL(request.url);
    if (url.origin !== resource.origin) return new Response("Invalid host", { status: 421, headers: noStore });
    const cors = corsFor(request);
    if (!cors) return new Response("Invalid origin", { status: 403, headers: noStore });
    const headers = { ...noStore, ...cors };
    // RFC 6750 section 3.1: a request with no bearer token gets a bare challenge. One whose token was
    // malformed, unknown, expired or revoked gets error="invalid_token", so the client refreshes or
    // signs in again instead of treating it as a first contact.
    const challenge = (status: 401 | 403, scope: string, error?: "invalid_token") => Response.json(
      status === 401 ? { error: error ?? "unauthorized" } : { error: "insufficient_scope", required: scope },
      { status, headers: { ...headers, "www-authenticate":
        `Bearer ${status === 403 ? 'error="insufficient_scope", ' : error ? `error="${error}", ` : ""}scope="${scope}", resource_metadata="${metadataUrl}"` } });

    const isMetadata = serveMetadata && url.pathname === metadataPath;
    if (request.method === "OPTIONS" && (isMetadata || url.pathname === resource.pathname)) {
      return new Response(null, { status: 204, headers: { ...headers, allow: isMetadata ? "GET, OPTIONS" : "POST, OPTIONS",
        ...(request.headers.has("origin") ? {
          "access-control-allow-methods": isMetadata ? "GET, OPTIONS" : "POST, OPTIONS",
          "access-control-allow-headers": CORS_HEADERS, "access-control-max-age": "600",
        } : {}) } });
    }
    if (isMetadata && request.method === "GET") return Response.json({
      resource: resource.href, authorization_servers: [...options.authorizationServers],
      scopes_supported: scopesSupported, bearer_methods_supported: ["header"],
      resource_name: "Agentkit", resource_documentation: "https://agentkit.ai/docs/developer/api-v2",
    }, { headers });
    if (url.pathname !== resource.pathname || url.search) return new Response("Not found", { status: 404, headers });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { ...headers, allow: "POST, OPTIONS" } });
    const authorization = request.headers.get("authorization");
    if (!authorization || !/^Bearer /i.test(authorization)) return challenge(401, defaultScope);
    if (authorization.length > 8192 || !/^Bearer [A-Za-z0-9._~+\/-]+=*$/i.test(authorization)) return challenge(401, defaultScope, "invalid_token");
    let connection: AuthorizedConnection | null;
    try { connection = await options.authorize(authorization.slice(7), request); }
    catch { return Response.json({ error: "authorization_unavailable" }, { status: 503, headers }); }
    if (!connection || !connection.subject || !connection.workspaceId || !Number.isFinite(connection.expiresAt) || connection.expiresAt <= Date.now() / 1000) {
      return challenge(401, defaultScope, "invalid_token");
    }
    // A valid token without the base scope is a scope problem, not an authentication one.
    if (!connection.scopes.includes(scopeNames.read)) return challenge(403, scopeNames.read);
    if (options.admit && !await options.admit(connection, request)) return Response.json({ error: "rate_limited" }, { status: 429, headers });

    // The body is read only after authentication and admission. JSON-RPC batches are refused
    // (MCP 2025-06-18 dropped batching, and admission counts one call per HTTP request).
    const body = await readBounded(request, MAX_BODY_BYTES);
    if (!body) return Response.json({ error: "request_too_large" }, { status: 413, headers });
    const tools = parseJsonRpcTools(body);
    if (tools === null) return Response.json({
      jsonrpc: "2.0", id: null,
      error: { code: -32600, message: "JSON-RPC batches are not supported. Send one message per request." },
    }, { status: 400, headers });
    for (const tool of tools) {
      const access = MCP_TOOL_ACCESS[tool];
      const needed = access && scopeNames[access];
      if (needed && !connection.scopes.includes(needed)) return challenge(403, needed);
    }
    const forwarded = new Request(request.url, { method: "POST", headers: request.headers, body, signal: request.signal });

    const granted = connection;
    const handler = createMcpHandler(() => createAgentkitMcpServer({ ...granted, scopeNames,
      createClient: signal => granted.createClient(AbortSignal.any([request.signal, signal])),
    }), { responseMode: "json", maxRequestBodySize: MAX_BODY_BYTES, maxSubscriptions: 0 });
    try {
      const response = await handler.fetch(forwarded);
      for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
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
