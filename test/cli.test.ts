import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os, { hostname } from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { discardedEmail, emailThread } from "./fixtures/email.js";
const AGENT = "00000000-0000-4000-8000-000000000001";
let dir: string;
let server: http.Server;
let url: string;
let requests: { method?: string; url?: string; body: string; auth?: string; authMode?: string }[];
let respond: (res: http.ServerResponse) => void;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentkit-bin-"));
  requests = [];
  respond = res => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ id: AGENT, name: "Test", settings: {} })); };
  server = http.createServer(async (req, res) => {
    let body = ""; for await (const chunk of req) body += String(chunk);
    requests.push({ method: req.method, url: req.url, body, auth: req.headers.authorization, authMode: typeof req.headers["x-agentkit-auth"] === "string" ? req.headers["x-agentkit-auth"] : undefined });
    respond(res);
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterEach(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await fs.rm(dir, { recursive: true, force: true }); });
function bin(args: string[], stdin = "", env: Record<string, string> = {}, useUrlFlag = true) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ["dist/cli/index.js", ...(useUrlFlag ? ["--url", url] : []), ...args], {
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, AGENTKIT_CONFIG_DIR: dir, ...env },
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => stdout += String(chunk)); child.stderr.on("data", chunk => stderr += String(chunk));
    child.on("error", reject); child.on("close", code => resolve({ code, stdout, stderr })); child.stdin.end(stdin);
  });
}
function sse(events: unknown[], done = true) {
  respond = res => { res.setHeader("content-type", "text/event-stream"); res.end(events.map(e => `data: ${JSON.stringify(e)}\n\n`).join("") + (done ? "data: [DONE]\n\n" : "")); };
}
const account = { id: AGENT, slug: "acme", name: "Acme" };
const deviceCode = "x".repeat(43);
const deviceKey = "browser-test-key";
const browserToken = { api_key: deviceKey, account, key: { id: AGENT, name: "CLI · test", source: "cli", scopes: ["read", "write", "delete", "export"] } };

function mockDeviceFlow(poll: (res: http.ServerResponse) => void, expiresIn = 30) {
  respond = res => {
    if (requests.at(-1)?.url === "/api/v2/auth/device/code") {
      res.end(JSON.stringify({
        device_code: deviceCode, user_code: "BCDF-GHJK", verification_uri: `${url}/activate`,
        verification_uri_complete: `${url}/activate?code=BCDF-GHJK`, expires_in: expiresIn, interval: 1,
      }));
    } else poll(res);
  };
}

async function mockTerminal(tty: boolean) {
  const preload = path.join(dir, "terminal.cjs");
  const opened = path.join(dir, "opened");
  await fs.writeFile(preload, `
    const { EventEmitter } = require("node:events");
    const { writeFileSync } = require("node:fs");
    process.stdin.isTTY = ${tty};
    process.stderr.isTTY = ${tty};
    process.stdin.setRawMode = () => process.stdin;
    require("node:child_process").spawn = (command, args) => {
      writeFileSync(${JSON.stringify(opened)}, JSON.stringify({ command, args }));
      const child = new EventEmitter();
      child.unref = () => {};
      queueMicrotask(() => child.emit("spawn"));
      return child;
    };
    require("node:module").syncBuiltinESMExports();
  `);
  return { env: { NODE_OPTIONS: `--require="${preload.replaceAll("\\", "/")}"` }, opened };
}

describe("authentication", () => {
  it("keeps legacy authentication spellings out of help", async () => {
    const help = (await bin(["--help"])).stdout;
    expect(help).toMatch(/^  auth /m);
    expect(help).not.toMatch(/^  (init|logout) /m);
    for (const args of [["auth", "login"], ["init"]]) {
      const loginHelp = (await bin([...args, "--help"])).stdout;
      expect(loginHelp).toContain("--with-token");
      expect(loginHelp).not.toContain("--with-session-token");
    }
  });

  it("asks for a key on a terminal without echoing it", async () => {
    const { env } = await mockTerminal(true);
    const result = await bin(["auth", "login"], "test-prompt-key\n", env);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stderr).toContain("Agentkit API key:");
    expect(result.stdout + result.stderr).not.toContain("test-prompt-key");
    expect(JSON.parse(await fs.readFile(path.join(dir, "config.json"), "utf8")).key).toBe("test-prompt-key");
  });

  it("gives portable instructions when key entry is unavailable", async () => {
    const { env } = await mockTerminal(true);
    for (const result of [
      await bin(["auth", "login"]),
      await bin(["auth", "login", "--no-input"], "", env),
      await bin(["init"], "", { AGENTKIT_URL: url }, false),
    ]) {
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("--with-token");
      expect(result.stderr).not.toContain("pbpaste");
    }
    expect(requests).toHaveLength(0);
  });

  it.each([
    { tty: true, noInput: false, opens: true },
    { tty: true, noInput: true, opens: false },
    { tty: false, noInput: false, opens: false },
  ])("redeems a browser code even when opening a browser is disabled ($tty, $noInput)", async ({ tty, noInput, opens }) => {
    const { env, opened } = await mockTerminal(tty);
    mockDeviceFlow(res => res.end(JSON.stringify(browserToken)));
    const result = await bin(["auth", "login", "--browser", ...(noInput ? ["--no-input", "--quiet"] : [])], "", {
      ...env, AGENTKIT_URL: url, AGENTKIT_API_KEY: "ambient-key",
    }, false);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stderr).toContain("BCDF-GHJK");
    expect(result.stderr).toContain(`${url}/activate`);
    expect(result.stdout).toContain("Acme");
    expect(result.stdout + result.stderr).not.toContain(deviceKey);
    expect(requests.map(r => ({ ...r, body: JSON.parse(r.body) }))).toEqual([
      expect.objectContaining({ method: "POST", url: "/api/v2/auth/device/code", auth: undefined, body: { client_name: hostname().trim().slice(0, 64) || "Agentkit CLI" } }),
      expect.objectContaining({ method: "POST", url: "/api/v2/auth/device/token", auth: undefined, body: { device_code: deviceCode } }),
    ]);
    const saved = JSON.parse(await fs.readFile(path.join(dir, "config.json"), "utf8"));
    expect(saved).toMatchObject({ key: deviceKey, keyUrl: url, url });
    if (opens) {
      const { args } = JSON.parse(await fs.readFile(opened, "utf8"));
      expect(args.at(-1)).toBe(`${url}/activate?code=BCDF-GHJK`);
    } else {
      await expect(fs.access(opened)).rejects.toMatchObject({ code: "ENOENT" });
    }
  });

  it("waits for authorization and honors the new interval after slow_down", async () => {
    const polls: number[] = [];
    mockDeviceFlow(res => {
      polls.push(performance.now());
      if (polls.length === 3) res.end(JSON.stringify(browserToken));
      else {
        res.statusCode = 400;
        res.end(JSON.stringify(polls.length === 1 ? { error: "authorization_pending" } : { error: "slow_down", interval: 6 }));
      }
    });
    const result = await bin(["--no-input", "auth", "login", "--browser"]);
    expect(result.code, result.stderr).toBe(0);
    expect(polls).toHaveLength(3);
    expect(polls[1]! - polls[0]!).toBeGreaterThanOrEqual(990);
    expect(polls[2]! - polls[1]!).toBeGreaterThanOrEqual(5990);
  }, 12_000);

  it.each([
    ["expired_token", 400, "expired"],
    ["access_denied", 400, "denied"],
    ["access_denied", 403, "denied"],
    ["invalid_grant", 400, "invalid or was already used"],
    ["key_limit_reached", 409, "API key limit"],
  ])("stops polling on %s (%d)", async (error, status, message) => {
    mockDeviceFlow(res => {
      res.statusCode = status;
      res.end(JSON.stringify({ error }));
    });
    const result = await bin(["auth", "login", "--browser"]);
    expect(result.code).toBe(1);
    const output = result.stderr.trim().split("\n").at(-1)!;
    expect(JSON.parse(output).error).toMatchObject({ code: error, status, message: expect.stringContaining(message) });
    expect(requests).toHaveLength(2);
    await expect(fs.access(path.join(dir, "config.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("stops locally when the device code reaches its deadline", async () => {
    mockDeviceFlow(res => res.end(JSON.stringify(browserToken)), 1);
    const result = await bin(["auth", "login", "--browser"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("sign-in code expired");
    expect(requests).toHaveLength(1);
  });

  it("reports an environment API key or session without exposing the token", async () => {
    respond = res => {
      const source = requests.at(-1)?.authMode === "session" ? "session" : "cli";
      res.end(JSON.stringify({ account, credential: { source, key_id: source === "cli" ? AGENT : null, name: null, scopes: ["read", "export"] } }));
    };
    const key = await bin(["auth", "status"], "", { AGENTKIT_API_KEY: "env-status-key" });
    expect(key.code, key.stderr).toBe(0);
    expect(key.stdout).toContain("cli (environment variable)");
    expect(key.stdout).toContain("Acme");
    expect(key.stdout).toContain("read, export");
    expect(key.stdout).not.toContain("env-status-key");
    const session = await bin(["auth", "status", "--json"], "", { AGENTKIT_SESSION_TOKEN: "env-status-session" });
    expect(session.code, session.stderr).toBe(0);
    expect(JSON.parse(session.stdout)).toMatchObject({ credential: { source: "session" }, credentialLocation: "env" });
    expect(session.stdout).not.toContain("env-status-session");
    expect(requests).toMatchObject([
      { method: "GET", url: "/api/v2/me", auth: "Bearer env-status-key", authMode: undefined },
      { method: "GET", url: "/api/v2/me", auth: "Bearer env-status-session", authMode: "session" },
    ]);
  });

  it("reports a multi-workspace session without a selected workspace", async () => {
    respond = res => res.end(JSON.stringify({ account: null, credential: { source: "session", key_id: null, name: null, scopes: ["read", "write", "delete", "export"] } }));
    const result = await bin(["auth", "status"], "", { AGENTKIT_SESSION_TOKEN: "env-multi-session" });
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain("Workspace: (none selected");
    expect(result.stdout).toContain("session (environment variable)");
  });

  it.each([204, 503])("removes the saved key after server revocation returns %d", async status => {
    const login = await bin(["auth", "login", "--with-token"], "saved-test-key");
    expect(login.code, login.stderr).toBe(0);
    respond = res => { res.statusCode = status; res.end(); };
    const result = await bin(["auth", "logout"], "", { AGENTKIT_API_KEY: "ambient-key" });
    expect(result.code, result.stderr).toBe(0);
    expect(requests).toMatchObject([{ method: "DELETE", url: "/api/v2/auth/key", auth: "Bearer saved-test-key" }]);
    expect(JSON.parse(result.stdout)).toMatchObject({ loggedOut: true, serverKeyRevoked: status === 204 });
    if (status === 503) expect(result.stderr).toContain("removed locally");
    expect(JSON.parse(await fs.readFile(path.join(dir, "config.json"), "utf8"))).toEqual({ url });
  });

  it("keeps the saved key bound to its origin during logout", async () => {
    expect((await bin(["auth", "login", "--with-token"], "origin-test-key")).code).toBe(0);
    const result = await bin(["--url", "http://127.0.0.1:1", "auth", "logout"]);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stderr).toContain("removed locally");
    expect(requests).toHaveLength(0);
    expect(JSON.parse(await fs.readFile(path.join(dir, "config.json"), "utf8"))).toEqual({ url });
  });
});

describe("raw API requests", () => {
  it("sends JSON from an argument, file or stdin and prints the complete response", async () => {
    const file = path.join(dir, "request.json");
    await fs.writeFile(file, '[1, true]');
    const response = { data: { id: "example" }, pagination: { hasMore: false } };
    respond = res => res.end(JSON.stringify(response));
    const cases = [
      { arg: '{"name":"Demo"}', body: { name: "Demo" } },
      { arg: `@${file}`, body: [1, true] },
      { arg: "@-", input: "false", body: false },
    ];
    for (const { arg, input, body } of cases) {
      const result = await bin(["api", "post", "/api/v2/agents?first=0", "--body", arg, "--query", "tag=a b", "--query", "tag=c=d"], input, { AGENTKIT_API_KEY: "api-test-key" });
      expect(result.code, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(response);
      const request = requests.at(-1)!;
      expect(request).toMatchObject({ method: "POST", auth: "Bearer api-test-key", url: "/api/v2/agents?first=0&tag=a+b&tag=c%3Dd" });
      expect(JSON.parse(request.body)).toEqual(body);
    }
  });

  it("accepts repeated string fields and prints compact JSON with --plain", async () => {
    respond = res => res.end('{"updated":true}');
    const result = await bin(["--plain", "api", "PATCH", "/api/v2/agents/123", "-f", "enabled=true", "-f", "text=a=b", "-f", "blank="]);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toBe('{"updated":true}\n');
    expect(JSON.parse(requests[0]!.body)).toEqual({ enabled: "true", text: "a=b", blank: "" });
  });

  it.each([
    ["GET", "/api/v1/agents"],
    ["GET", "https://example.test/api/v2/agents"],
    ["GET", "/api/v2/../agents"],
    ["GET", "/api/v2/%2e%2e/agents"],
    ["GET", "/api/v2/%2e%2e%2fagents"],
    ["GET", "/api/v2/agents#fragment"],
    ["GET", "/api/v2/agents", "--query", "missing"],
    ["POST", "/api/v2/agents", "--body", "invalid"],
    ["POST", "/api/v2/agents", "--body", "null", "-f", "a=b"],
    ["POST", "/api/v2/agents", "-f", "=missing-key"],
  ])("rejects malformed input before making a request (%s %s)", async (...args) => {
    const result = await bin(["api", ...args]);
    expect(result.code).toBe(1);
    expect(requests).toHaveLength(0);
  });

  it("names the scope required by a 403 for both raw and wrapped requests", async () => {
    respond = res => {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: "insufficient_scope", required: "read" }));
    };
    for (const args of [["api", "GET", "/api/v2/agents"], ["agents", "info", AGENT]]) {
      const result = await bin(args, "", { AGENTKIT_API_KEY: "read-test-key" });
      expect(result.code).toBe(1);
      expect(JSON.parse(result.stderr).error).toMatchObject({ code: "insufficient_scope", status: 403, message: expect.stringContaining("read scope") });
    }
  });
});

describe("default agents", () => {
  it("chooses the explicit agent, environment or config in that order", async () => {
    const explicit = "00000000-0000-4000-8000-000000000010";
    const environment = "00000000-0000-4000-8000-000000000020";
    expect((await bin(["auth", "login", "--with-token"], "saved-agent-key")).code).toBe(0);
    expect((await bin(["projects", "--add", "demo", AGENT])).code).toBe(0);
    const config = await bin(["config", "set", "agent", "demo"]);
    expect(config.code, config.stderr).toBe(0);
    expect((await bin(["agents", "info", explicit], "", { AGENTKIT_AGENT_ID: environment })).code).toBe(0);
    expect((await bin(["agents", "info"], "", { AGENTKIT_AGENT_ID: environment })).code).toBe(0);
    expect((await bin(["agents", "info"])).code).toBe(0);
    expect(requests.map(r => r.url)).toEqual([explicit, environment, AGENT].map(id => `/api/v2/agents/${id}`));
    expect(requests[2]?.auth).toBe("Bearer saved-agent-key");
  });

  it("allows omitted projects before other arguments in grouped and flat commands", async () => {
    const env = { AGENTKIT_AGENT_ID: AGENT, AGENTKIT_API_KEY: "agent-test-key" };
    for (const args of [["conversations", "get", "thread"], ["conversation", "thread"], ["emails", "get", "thread"], ["email", "thread"]]) {
      respond = res => res.end(JSON.stringify({ data: emailThread }));
      const result = await bin([...args, "--json"], "", env);
      expect(result.code, result.stderr).toBe(0);
    }
    respond = res => res.end(JSON.stringify({ data: { id: "message" } }));
    const chat = await bin(["chat", "Hello from the default agent", "--no-stream"], "", env);
    expect(chat.code, chat.stderr).toBe(0);
    expect(JSON.parse(requests.at(-1)!.body)).toMatchObject({ message: "Hello from the default agent" });
    expect(requests.map(r => r.url)).toEqual([
      `/api/v2/agents/${AGENT}/conversations/thread?source=all`,
      `/api/v2/agents/${AGENT}/conversations/thread?source=all`,
      `/api/v2/agents/${AGENT}/emails/thread`,
      `/api/v2/agents/${AGENT}/emails/thread`,
      `/api/v2/agents/${AGENT}/chat`,
    ]);
  });

  it("keeps established explicit forms with optional trailing arguments", async () => {
    const env = { AGENTKIT_AGENT_ID: AGENT, AGENTKIT_API_KEY: "agent-test-key" };
    const explicit = "00000000-0000-4000-8000-000000000010";
    const config = await bin(["projects", "--add", "other", explicit]);
    expect(config.code, config.stderr).toBe(0);
    for (const [args, stdin] of [
      [["settings", "instructions", "other"], "Piped explicit prompt"],
      [["settings", "instructions", "Default agent prompt"], ""],
    ] as const) {
      const result = await bin([...args, "--json"], stdin, env);
      expect(result.code, result.stderr).toBe(0);
    }
    expect(requests.map(r => [r.url, JSON.parse(r.body).instructionsPrompt])).toEqual([
      [`/api/v2/agents/${explicit}/settings/ai`, "Piped explicit prompt"],
      [`/api/v2/agents/${AGENT}/settings/ai`, "Default agent prompt"],
    ]);
  });

  it("requires an agent when no default is set and keeps required trailing arguments", async () => {
    const env = { AGENTKIT_API_KEY: "agent-test-key" };
    const missing = await bin(["agents", "info"], "", env);
    expect(missing.stderr).toContain("AGENTKIT_AGENT_ID");
    const missingThread = await bin(["conversations", "get"], "", { ...env, AGENTKIT_AGENT_ID: AGENT });
    expect(missingThread.stderr).toContain("conversationId");
    expect(requests).toHaveLength(0);
  });
});

describe("installed-style executable", () => {
  it("runs help/version offline and rejects unknown commands", async () => {
    expect((await bin(["--help"])).code).toBe(0);
    const pkg = JSON.parse(await fs.readFile("package.json", "utf8"));
    expect((await bin(["--version"])).stdout.trim()).toBe(pkg.version);
    const bad = await bin(["nonsense", "--json"]);
    expect(bad.code).toBe(1); expect(JSON.parse(bad.stderr).error.code).toBe("CLI_ERROR"); expect(requests).toHaveLength(0);
  });
  it("treats bare and group help as success and describes public groups", async () => {
    for (const args of [[], ["settings"], ["actions"], ["secrets"], ["backstage"]]) {
      const result = await bin(args);
      expect(result.code, result.stderr).toBe(0);
      expect(result.stdout + result.stderr).not.toContain("(outputHelp)");
      expect(result.stdout).toContain("Usage:");
    }
    const help = (await bin(["--help"])).stdout;
    expect(help).toMatch(/settings\s+Read and change AI.*\(ai, model, instructions/);
    expect(help).not.toMatch(/backstage|widgets|^\s+widget(?:[ -]|$)/im);
    expect(help).not.toMatch(/reply-address|automated-senders|\bforward\b/);

    for (const [group, verb] of [["widgets", "publish"], ["backstage", "overview"]] as const) {
      const direct = await bin([group, "--help"]);
      expect(direct.code, direct.stderr).toBe(0);
      expect(direct.stdout).toContain(verb);
    }
    expect(requests).toHaveLength(0);
  });
  it("prints a training message when no web sources need a crawl and strips control characters from tables", async () => {
    respond = res => res.end(JSON.stringify({ jobId: null, count: 0, message: "No web sources to retrain." }));
    const train = await bin(["train", AGENT, "--key", "test-key"]);
    expect(train.code, train.stderr).toBe(0); expect(train.stdout.trim()).toBe("No web sources to retrain.");
    respond = res => res.end(JSON.stringify({ data: [{ id: "c1", status: "open", userId: null, title: "Hi\u001b[31m\nthere\u0007" }], pagination: { cursor: null, hasMore: false, total: 1 } }));
    const list = await bin(["conversations", "list", AGENT, "--key", "test-key"]);
    expect(list.stdout).toBe("c1\topen\t-\tHi there \n");
  });
  it("hides cursor hints with --quiet and preserves result rows", async () => {
    respond = res => res.end(JSON.stringify({
      data: [{ id: AGENT, name: "Test" }],
      pagination: { hasMore: true, cursor: "next" },
    }));
    const regular = await bin(["agents", "list"], "", { AGENTKIT_API_KEY: "test-key" });
    const quiet = await bin(["agents", "list", "--quiet"], "", { AGENTKIT_API_KEY: "test-key" });
    expect(quiet.code, quiet.stderr).toBe(0);
    expect(regular.stderr).toContain("next cursor");
    expect(quiet.stderr).toBe("");
    expect(quiet.stdout).toBe(regular.stdout);
  });
  it("reads a conversation from any source by default", async () => {
    respond = res => res.end(JSON.stringify({ data: { id: "c1", title: "t", messages: [] } }));
    const result = await bin(["conversations", "get", AGENT, "c1", "--key", "test-key", "--json"]);
    expect(result.code, result.stderr).toBe(0);
    expect(new URL(requests.at(-1)!.url!, url).searchParams.get("source")).toBe("all");
  });
  it("shows resource commands and hides legacy duplicate commands", async () => {
    const help = (await bin(["--help"])).stdout;
    for (const name of ["create-agent", "channel-configure", "set-instructions", "ig-automation"]) expect(help).not.toContain(name);
    expect(help).toContain("emails"); expect(help).toContain("email");
    const channels = (await bin(["channels", "--help"])).stdout;
    expect(channels).toContain("configure");
    expect(channels).toContain("center-stage");
    expect(channels).not.toMatch(/^\s+(enable|disable)\b/m);
    const email = (await bin(["email", "--help"])).stdout;
    expect(email).not.toMatch(/settings|reply-address|automated-senders|\[command\]/);
    const inbox = (await bin(["emails", "--help"])).stdout;
    expect(inbox).not.toMatch(/^\s+(draft|forward)\b/m);
    expect(inbox).toMatch(/^\s+drafts\b/m);
    expect(inbox).toMatch(/^\s+send\b/m);
    const legacy = await bin(["channel", AGENT, "email"], "", { AGENTKIT_SESSION_TOKEN: "session" });
    expect(legacy.code, legacy.stderr).toBe(0);
    expect(requests.at(-1)?.url).toBe(`/api/v2/agents/${AGENT}/channels/email/config`);
  });
  it("routes every email operation with session authentication and exact request bodies", async () => {
    respond = res => res.end(JSON.stringify({ data: { id: "draft", revision: "1" }, status: "sent", verified: true }));
    const cases: { args: string[]; method: string; suffix: string; body?: unknown; stdin?: string }[] = [
      { args: ["emails", "list", AGENT, "--status", "discarded", "--since", "2026-10-10T01:02:03Z", "--limit", "2", "--cursor", "page"], method: "GET", suffix: "/emails?status=discarded&since=2026-10-10T01%3A02%3A03Z&limit=2&cursor=page" },
      { args: ["emails", "get", AGENT, "thread"], method: "GET", suffix: "/emails/thread" },
      { args: ["emails", "discard", AGENT, "thread", "--inbound-message-id", "message", "--draft-id", "draft", "--draft-edited-at", "2026-10-10T01:02:03Z"], method: "POST", suffix: "/emails/thread/discard", body: { inboundMessageId: "message", draftId: "draft", draftEditedAt: "2026-10-10T01:02:03Z" } },
      { args: ["emails", "restore", AGENT, "thread", "--expected-revision", "2026-10-10T01:02:03Z"], method: "POST", suffix: "/emails/thread/restore", body: { expectedRevision: "2026-10-10T01:02:03Z" } },
      { args: ["emails", "draft", AGENT, "thread"], method: "POST", suffix: "/emails/thread/draft" },
      { args: ["emails", "forward", AGENT, "message", "--to", "support@example.com", "--submission-id", AGENT, "--note-file", "-"], method: "POST", suffix: "/emails/messages/message/forward", body: { to: "support@example.com", submissionId: AGENT, note: "Keep trailing newline\n" }, stdin: "Keep trailing newline\n" },
      { args: ["emails", "drafts", "list", AGENT, "--limit", "2", "--cursor", "page"], method: "GET", suffix: "/emails/drafts?limit=2&cursor=page" },
      { args: ["emails", "drafts", "get", AGENT, "draft"], method: "GET", suffix: "/emails/drafts/draft" },
      { args: ["emails", "drafts", "edit", AGENT, "draft", "--expected-revision", "1", "--body-file", "-", "--subject", "Reviewed"], method: "PATCH", suffix: "/emails/drafts/draft", body: { bodyText: "Edited reply\n", expectedRevision: "1", subject: "Reviewed" }, stdin: "Edited reply\n" },
      { args: ["emails", "send", AGENT, "draft", "--expected-revision", "1"], method: "POST", suffix: "/emails/drafts/draft/send", body: { expectedRevision: "1" } },
      { args: ["email", "settings", AGENT], method: "GET", suffix: "/email/settings" },
      { args: ["email", "settings", AGENT, "--auto-send", "off", "--signature", "on", "--signature-file", "-", "--display-name", "Whystle"], method: "PATCH", suffix: "/email/settings", body: { autoSendEnabled: false, signatureEnabled: true, signatureHtml: "", displayName: "Whystle" } },
      { args: ["email", "reply-address", "status", AGENT], method: "GET", suffix: "/email/reply-address" },
      { args: ["email", "reply-address", "add", AGENT, "support@example.com"], method: "PUT", suffix: "/email/reply-address", body: { address: "support@example.com" } },
      { args: ["email", "reply-address", "verify", AGENT, "123456"], method: "POST", suffix: "/email/reply-address/verify", body: { code: "123456" } },
      { args: ["email", "reply-address", "remove", AGENT], method: "DELETE", suffix: "/email/reply-address" },
      { args: ["email", "automated-senders", "list", AGENT], method: "GET", suffix: "/email/automated-senders" },
      { args: ["email", "automated-senders", "add", AGENT, "google@example.com"], method: "POST", suffix: "/email/automated-senders", body: { address: "google@example.com" } },
      { args: ["email", "automated-senders", "remove", AGENT, "google@example.com"], method: "DELETE", suffix: "/email/automated-senders", body: { address: "google@example.com" } },
      { args: ["channels", "enable", AGENT, "email", "--address", "whystle"], method: "POST", suffix: "/channels/email/enable", body: { address: "whystle" } },
      { args: ["channels", "disable", AGENT, "email"], method: "POST", suffix: "/channels/email/disable" },
    ];
    for (const row of cases) {
      const result = await bin(["--json", ...row.args], row.stdin ?? "", { AGENTKIT_SESSION_TOKEN: "session" });
      expect(result.code, `${row.args.join(" ")}: ${result.stderr}`).toBe(0);
      const request = requests.at(-1)!;
      expect(request).toMatchObject({ method: row.method, url: `/api/v2/agents/${AGENT}${row.suffix}`, auth: "Bearer session" });
      expect(request.body ? JSON.parse(request.body) : undefined).toEqual(row.body);
    }
  }, 30_000);
  it("rejects unsafe email inputs and key-only setup access without making requests", async () => {
    const cases = [
      ["emails", "list", AGENT, "--status", "wrong"], ["emails", "list", AGENT, "--since", "yesterday"],
      ["emails", "list", AGENT, "--limit", "101"], ["emails", "list", AGENT, "--cursor", ""],
      ["email", "settings", AGENT, "--auto-send", "maybe"], ["email", "reply-address", "add", AGENT, "bad"],
      ["email", "reply-address", "verify", AGENT, "123"], ["email", "automated-senders", "add", AGENT, "bad"],
      ["channels", "enable", AGENT, "email", "--address", "bad@domain"], ["channels", "enable", AGENT, "whatsapp"],
      ["emails", "forward", AGENT, "message", "--to", "support@example.com", "--submission-id", "unstable"],
      ["emails", "send", AGENT, "draft"], ["emails", "restore", AGENT, "thread"], ["emails", "discard", AGENT, "thread"],
    ];
    for (const args of cases) expect((await bin(args, "", { AGENTKIT_SESSION_TOKEN: "session" })).code).toBe(1);
    const keyOnly = await bin(["email", "settings", AGENT], "", { AGENTKIT_API_KEY: "key" });
    expect(JSON.parse(keyOnly.stderr).error.code).toBe("AUTH_SESSION_REQUIRED"); expect(requests).toHaveLength(0);
  });
  it("uses the saved workspace key for reviewed replies and discards even when a saved session expired", async () => {
    expect((await bin(["init", "--with-token"], "key")).code).toBe(0);
    expect((await bin(["init", "--with-session-token"], "expired-session")).code).toBe(0);
    respond = res => res.end(JSON.stringify({ data: { id: "draft", revision: "2" }, status: "sent" }));
    const edited = await bin(["emails", "drafts", "edit", AGENT, "draft", "--body-file", "-", "--expected-revision", "1"], "Reviewed reply\n");
    expect(edited.code, edited.stderr).toBe(0);
    expect(requests.at(-1)).toMatchObject({ method: "PATCH", url: `/api/v2/agents/${AGENT}/emails/drafts/draft`, auth: "Bearer key" });
    expect(JSON.parse(requests.at(-1)!.body)).toEqual({ bodyText: "Reviewed reply\n", expectedRevision: "1" });
    const sent = await bin(["emails", "send", AGENT, "draft", "--expected-revision", "2"]);
    expect(sent.code, sent.stderr).toBe(0);
    expect(requests.at(-1)).toMatchObject({ method: "POST", url: `/api/v2/agents/${AGENT}/emails/drafts/draft/send`, auth: "Bearer key" });
    expect(JSON.parse(requests.at(-1)!.body)).toEqual({ expectedRevision: "2" });
    respond = res => res.end(JSON.stringify({ data: { id: "thread" }, status: "discarded" }));
    const discarded = await bin(["emails", "discard", AGENT, "thread", "--inbound-message-id", "message", "--draft-id", "draft"]);
    expect(discarded.code, discarded.stderr).toBe(0);
    expect(requests.at(-1)).toMatchObject({ method: "POST", url: `/api/v2/agents/${AGENT}/emails/thread/discard`, auth: "Bearer key" });
    expect(JSON.parse(requests.at(-1)!.body)).toEqual({ inboundMessageId: "message", draftId: "draft", draftEditedAt: null });
  });
  it("keeps delivery uncertainty and stale revisions distinct from success without retrying", async () => {
    for (const state of ["unknown", "unresolved", "conflict", "ignored", "channel_disabled"]) {
      respond = res => res.end(JSON.stringify({ status: state, submissionId: AGENT }));
      const result = await bin(["emails", "send", AGENT, "draft", "--expected-revision", "1"], "", { AGENTKIT_SESSION_TOKEN: "session" });
      expect(result.code).toBe(1); expect(result.stdout).toBe("");
      expect(JSON.parse(result.stderr).error.details.status).toBe(state);
      expect(JSON.parse(result.stderr).error.code).toBe("EMAIL_OPERATION_INCOMPLETE");
    }
    expect(requests).toHaveLength(5);
    respond = res => { res.statusCode = 409; res.end(JSON.stringify({ error: { code: "EMAIL_REVISION_CONFLICT", message: "Newer draft" } })); };
    const conflict = await bin(["emails", "send", AGENT, "draft", "--expected-revision", "1"], "", { AGENTKIT_SESSION_TOKEN: "session" });
    expect(conflict.code).toBe(1); expect(conflict.stdout).toBe(""); expect(JSON.parse(conflict.stderr).error.code).toBe("EMAIL_REVISION_CONFLICT");
  });
  it("reports failed reply verification only in the failure stream", async () => {
    respond = res => res.end(JSON.stringify({ verified: false, data: { addresses: [] } }));
    const result = await bin(["email", "reply-address", "verify", AGENT, "123456"], "", { AGENTKIT_SESSION_TOKEN: "session" });
    expect(result.code).toBe(1); expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr).error.code).toBe("EMAIL_VERIFICATION_FAILED");
    expect(JSON.parse(result.stderr).error.details.verified).toBe(false);
    expect(requests).toHaveLength(1);
  });
  it("uses UUIDs without a registry and preserves the legacy info command", async () => {
    for (const cmd of [["agents", "info"], ["info"]]) {
      const result = await bin([...cmd, AGENT, "--json"], "", { AGENTKIT_API_KEY: "test-key" });
      expect(result.code, result.stderr).toBe(0); expect(JSON.parse(result.stdout).id).toBe(AGENT);
    }
    expect(requests.map(r => r.url)).toEqual([`/api/v2/agents/${AGENT}`, `/api/v2/agents/${AGENT}`]);
  });
  it("lists with resource groups and legacy grammar", async () => {
    respond = res => res.end(JSON.stringify({ data: [], pagination: { cursor: null, hasMore: false, total: 0 } }));
    for (const cmd of [["sources", "list", AGENT], ["sources", AGENT], ["agents", "list"], ["agents"], ["conversations", "list", AGENT], ["contacts", "list", AGENT]]) {
      const result = await bin(["--key", "test-key", "--json", ...cmd]);
      expect(result.code, result.stderr).toBe(0); expect(JSON.parse(result.stdout).data).toEqual([]);
    }
  });
  it("rejects malformed limits and deletion without making requests", async () => {
    for (const limit of ["0", "-1", "2.5", "12junk", "101"]) expect((await bin(["sources", "list", AGENT, "--limit", limit])).code).toBe(1);
    expect((await bin(["--key", "test-key", "conversations", "export", AGENT, "--limit", "21"])).code).toBe(1);
    expect((await bin(["agents", "delete", AGENT])).code).toBe(1);
    expect((await bin(["sources", "delete", AGENT, "doc"])).code).toBe(1);
    expect(requests).toHaveLength(0);
  });
  it("preserves filters and pagination for grouped and legacy conversation reads", async () => {
    respond = res => res.end(JSON.stringify({ data: [], pagination: { cursor: null, hasMore: false, total: 0 } }));
    for (const source of ["playground", "widget", "center_stage", "help_page", "all"]) {
      for (const command of [["conversations", "list"], ["conversations"]]) {
        const result = await bin([...command, AGENT, "--source", source, "--limit", "1", "--cursor", "next page", "--key", "test-key", "--json"]);
        expect(result.code, result.stderr).toBe(0);
        const query = new URL(requests.at(-1)!.url!, url);
        expect(query.pathname).toBe(`/api/v2/agents/${AGENT}/conversations`);
        expect(Object.fromEntries(query.searchParams)).toEqual({ source, limit: "1", cursor: "next page" });
        expect(requests.at(-1)!.auth).toBe("Bearer test-key");
      }
    }
    const unread = await bin(["conversations", "list", AGENT, "--source", "all", "--unread", "--key", "test-key", "--json"]);
    expect(unread.code, unread.stderr).toBe(0);
    expect(Object.fromEntries(new URL(requests.at(-1)!.url!, url).searchParams)).toEqual({ source: "all", unread: "true" });

    const read = await bin(["conversations", "export", AGENT, "--source", "center_stage", "--read", "--key", "test-key", "--json"]);
    expect(read.code, read.stderr).toBe(0);
    expect(Object.fromEntries(new URL(requests.at(-1)!.url!, url).searchParams)).toEqual({ source: "center_stage", unread: "false" });

    const beforeConflict = requests.length;
    const conflict = await bin(["conversations", "list", AGENT, "--unread", "--read", "--key", "test-key"]);
    expect(conflict.code).toBe(1);
    expect(requests).toHaveLength(beforeConflict);
  });
  it("reports a clear network error instead of a bare fetch failed", async () => {
    const client = new (await import("../src/sdk/client.js")).AgentkitClient({
      baseUrl: "https://agentkit.ai",
      key: "test-key",
      fetch: async () => { throw new TypeError("fetch failed"); },
    });
    await expect(client.listAgents()).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message: "Cannot reach https://agentkit.ai (network blocked or offline?).",
      status: 0,
    });
  });
  it("preserves grouped export filters and source-list pagination", async () => {
    respond = res => res.end(JSON.stringify({ data: [], pagination: { cursor: null, hasMore: false, total: 0 } }));
    for (const command of [["conversations", "export", "--source", "widget"], ["sources", "list"]]) {
      const [group, verb, ...options] = command;
      const result = await bin([group!, verb!, AGENT, ...options, "--limit", "2", "--cursor", "next", "--key", "test-key"]);
      expect(result.code, result.stderr).toBe(0);
      const query = new URL(requests.at(-1)!.url!, url);
      expect(query.searchParams.get("limit")).toBe("2");
      expect(query.searchParams.get("cursor")).toBe("next");
      if (group === "conversations") expect(query.searchParams.get("source")).toBe("widget");
    }
  });
  it("reads discarded inbox threads with an API key and preserves status, since and cursors", async () => {
    const list = { data: [discardedEmail], pagination: { limit: 1, nextCursor: "next page", hasMore: true } };
    respond = res => res.end(JSON.stringify(list));
    expect((await bin(["projects", "--add", "whystle", AGENT])).code).toBe(0);
    for (const status of ["all", "to_review", "sent", "discarded"]) {
      const result = await bin(["emails", "whystle", "--status", status, "--since", "2026-10-09T00:00:00+03:00", "--limit", "1", "--cursor", "next page", "--json"], "", { AGENTKIT_API_KEY: "test-key" });
      expect(result.code, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(list);
      const query = new URL(requests.at(-1)!.url!, url);
      expect(query.pathname).toBe(`/api/v2/agents/${AGENT}/emails`);
      expect(Object.fromEntries(query.searchParams)).toEqual({ status, since: "2026-10-09T00:00:00+03:00", limit: "1", cursor: "next page" });
      expect(requests.at(-1)!.auth).toBe("Bearer test-key");
    }
    const human = await bin(["emails", "whystle"], "", { AGENTKIT_API_KEY: "test-key" });
    expect(human.code, human.stderr).toBe(0);
    expect(new URL(requests.at(-1)!.url!, url).searchParams.get("status")).toBe("all");
    for (const text of [discardedEmail.customerEmail, discardedEmail.subject, "discarded", discardedEmail.lastActivityAt, discardedEmail.id, "Vendor support notification"]) expect(human.stdout).toContain(text);
    expect(human.stderr).toContain("next cursor next page");
  });
  it("ignores a saved session from another origin for API-key inbox reads", async () => {
    await fs.writeFile(path.join(dir, "config.json"), JSON.stringify({ sessionToken: "other-origin-session", sessionUrl: "https://another.example.com" }), { mode: 0o600 });
    const commands = [["emails", AGENT], ["email", AGENT, "thread"], ["emails", "list", AGENT], ["emails", "get", AGENT, "thread"], ["emails", "drafts", "list", AGENT], ["emails", "drafts", "get", AGENT, "draft"]];
    for (const args of commands) {
      respond = res => res.end(JSON.stringify(args.includes("list") || args.length === 2
        ? { data: [], pagination: { limit: 20, nextCursor: null, hasMore: false } } : { data: emailThread }));
      const result = await bin([...args, "--json"], "", { AGENTKIT_API_KEY: "test-key" });
      expect(result.code, result.stderr).toBe(0);
      expect(requests.at(-1)!.auth).toBe("Bearer test-key");
      expect(requests.at(-1)!.authMode).toBeUndefined();
    }
    const before = requests.length;
    const setup = await bin(["email", "settings", AGENT], "", { AGENTKIT_API_KEY: "test-key" });
    expect(setup.code).toBe(1);
    expect(setup.stderr).toContain("different origin");
    expect(requests).toHaveLength(before);
  });
  it("prints email headers, plain-text replies and draft state with only an API key", async () => {
    respond = res => res.end(JSON.stringify({ data: emailThread }));
    for (const flags of [[], ["--json"], ["--json", "--key", "test-key"]]) {
      const result = await bin(["email", AGENT, emailThread.id, ...flags], "", { AGENTKIT_API_KEY: "test-key" });
      expect(result.code, result.stderr).toBe(0);
      expect(requests.at(-1)!.url).toBe(`/api/v2/agents/${AGENT}/emails/${emailThread.id}`);
      expect(requests.at(-1)!.auth).toBe("Bearer test-key");
      if (flags.length) expect(JSON.parse(result.stdout)).toEqual(emailThread);
      else {
        for (const text of ["From: support@example.com", "To: inbox@example.com", `Subject: ${discardedEmail.subject}`, "Time: 2026-10-10T12:00:00Z", "Your request is approved.", "State: pending (not_sent)", "Thank you for confirming."]) expect(result.stdout).toContain(text);
      }
    }
  });
  it("makes HTML-only email replies readable without printing markup or scripts", async () => {
    respond = res => res.end(JSON.stringify({ data: {
      ...emailThread, messages: [{ ...emailThread.messages[0], text: null, html: '<style>.hidden{color:red}</style><p>Your request &amp; reply</p><p>Approved &#x2713;</p><script>doNotPrint()</script>' }],
    } }));
    const result = await bin(["email", AGENT, emailThread.id], "", { AGENTKIT_API_KEY: "test-key" });
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain("Your request & reply\nApproved ✓");
    expect(result.stdout).not.toContain("<p>");
    expect(result.stdout).not.toContain("doNotPrint");
    expect(result.stdout).not.toContain(".hidden");
  });
  it("strips terminal control sequences from untrusted email content", async () => {
    respond = res => res.end(JSON.stringify({ data: {
      ...emailThread,
      subject: "Case \u001b]52;c;ZXZpbA==\u0007",
      messages: [
        { ...emailThread.messages[0], subject: "Case \u001b[2J\u001b[31m", text: "Line one\nLine two\rRewritten\u001b[0m" },
        { ...emailThread.messages[0], id: "encoded-message", text: null, html: "<p>&#27;]0;spoof&#7;Encoded body&#8238;</p>" },
      ],
    } }));
    const result = await bin(["email", AGENT, emailThread.id], "", { AGENTKIT_API_KEY: "test-key" });
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).not.toMatch(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/);
    expect(result.stdout).toContain("Line one\nLine twoRewritten");
    expect(result.stdout).toContain("Encoded body");
  });
  it("distinguishes delivered email from outbound messages with unknown delivery", async () => {
    respond = res => res.end(JSON.stringify({ data: {
      ...emailThread, messages: [
        { ...emailThread.messages[0], id: "sent-message", direction: "outbound" },
        { ...emailThread.messages[0], id: "unknown-message", direction: "outbound", providerEmailId: null },
      ],
    } }));
    const result = await bin(["email", AGENT, emailThread.id], "", { AGENTKIT_API_KEY: "test-key" });
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain("[sent sent-message]");
    expect(result.stdout).toContain("[unknown unknown-message]");
  });
  it("rejects unknown email statuses and page limits before making requests", async () => {
    expect((await bin(["emails", AGENT, "--status", "pending"])).code).toBe(1);
    for (const limit of ["0", "2.5", "101"]) expect((await bin(["emails", AGENT, "--limit", limit])).code).toBe(1);
    expect(requests).toHaveLength(0);
  });
  it("limits the offline capability catalogue to released commands", async () => {
    const result = await bin(["capabilities", "--json"]);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).not.toMatch(/widgets|backstage/i);
    const rows = JSON.parse(result.stdout).capabilities as { commands: string[] }[];
    const commands = rows.flatMap(row => row.commands);
    for (const hidden of ["emails draft", "emails forward", "email settings", "email automated-senders", "email reply-address", "channels enable", "channels disable"]) {
      expect(commands).not.toContain(hidden);
    }
    expect(commands).toEqual(expect.arrayContaining(["channels center-stage", "emails drafts edit", "emails send"]));
    expect(requests).toHaveLength(0);
  });
  it("lists email commands in the offline capability catalogue", async () => {
    const result = await bin(["capabilities", "email", "--json"]);
    expect(result.code, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).capabilities[0]).toMatchObject({ area: "email", commands: expect.arrayContaining(["emails", "email"]) });
    expect(result.stdout).toContain("discarded");
    expect(requests).toHaveLength(0);
  });
  it("defaults chat tests to Playground and supports an explicit API channel", async () => {
    for (const flags of [[], ["--no-stream"], ["--json"]]) {
      for (const channel of [undefined, "playground", "api_v2"]) {
        if (flags.length === 0) sse([{ type: "text-delta", id: "t", delta: "hello" }]);
        else respond = res => res.end(JSON.stringify({ data: { id: "42", parts: [] } }));
        const result = await bin(["--key", "test-key", "chat", AGENT, "hi", "--conversation", "conv", ...flags, ...(channel ? ["--channel", channel] : [])]);
        expect(result.code, result.stderr).toBe(0);
        expect(JSON.parse(requests.at(-1)!.body)).toEqual({
          message: "hi", conversationId: "conv", channel: channel ?? "playground", stream: flags.length === 0,
        });
      }
    }
  });
  it("rejects an invalid chat channel before making requests", async () => {
    const result = await bin(["--key", "test-key", "chat", AGENT, "hi", "--channel", "widget"]);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stderr).error.code).toBe("CLI_ERROR");
    expect(requests).toHaveLength(0);
  });
  it("passes the Playground source through detail and export reads", async () => {
    for (const command of [["conversations", "get", AGENT, "conv"], ["conversations", "export", AGENT]]) {
      const result = await bin(["--key", "test-key", ...command, "--source", "playground", "--json"]);
      expect(result.code, result.stderr).toBe(0);
      expect(new URL(requests.at(-1)!.url!, url).searchParams.get("source")).toBe("playground");
    }
  });
  it("returns nonzero for stream errors and truncation in chat and retry", async () => {
    for (const cmd of [["chat", AGENT, "hi"], ["retry", AGENT, "conv", "42"]]) {
      sse([{ type: "text-delta", id: "t", delta: "partial" }, { type: "error", error: { code: "CHAT_STREAMING_ERROR" } }]);
      const result = await bin(["--key", "test-key", ...cmd]);
      expect(result.code).toBe(1); expect(result.stdout).toBe("partial"); expect(JSON.parse(result.stderr).error.code).toBe("CHAT_STREAMING_ERROR");
      sse([{ type: "text-delta", id: "t", delta: "partial" }], false);
      expect(JSON.parse((await bin(["--key", "test-key", ...cmd])).stderr).error.code).toBe("STREAM_TRUNCATED");
    }
  });
  it("makes pending tools visible and submits caller-provided JSON", async () => {
    sse([{ type: "tool-call", id: "call", name: "lookup", arguments: { id: 1 } }]);
    const pending = await bin(["--key", "test-key", "chat", AGENT, "hi"]);
    expect(pending.code).toBe(0); expect(JSON.parse(pending.stderr).pendingToolCall.name).toBe("lookup");
    sse([{ type: "text-delta", id: "t", delta: "continued" }]);
    const result = await bin(["--key", "test-key", "conversations", "tool-result", AGENT, "conv", "call", "--json"], '{"answer":42}');
    expect(result.code, result.stderr).toBe(0); expect(JSON.parse(result.stdout)[0].delta).toBe("continued");
    expect(JSON.parse(requests.at(-1)!.body)).toEqual({ toolCallId: "call", output: { answer: 42 } });
  });
  it("has a bounded request timeout and never retries", async () => {
    respond = () => {};
    const result = await bin(["--key", "test-key", "--timeout", "1000", "info", AGENT]);
    expect(result.code).toBe(1); expect(JSON.parse(result.stderr).error.code).toBe("REQUEST_TIMEOUT"); expect(requests).toHaveLength(1);
  });
  it("saves a piped API key and reports its source, workspace and scopes", async () => {
    const credential = { source: "manual", key_id: AGENT, name: "My key", scopes: ["read"] };
    respond = res => res.end(JSON.stringify({ account, credential }));
    const login = await bin(["auth", "login", "--with-token"], "local-test-key\n");
    expect(login.code, login.stderr).toBe(0);
    const status = await bin(["auth", "status", "--json"]);
    expect(status.code, status.stderr).toBe(0);
    expect(JSON.parse(status.stdout)).toMatchObject({ account, credential, credentialLocation: "config" });
    expect(requests).toMatchObject([{ method: "GET", url: "/api/v2/me", auth: "Bearer local-test-key" }]);
    expect(login.stdout + status.stdout).not.toContain("local-test-key");
  });
  it("supports stdin auth, alias migration, canonical env precedence, and logout", async () => {
    expect((await bin(["init", "--with-token"], "saved-key")).code).toBe(0);
    expect((await bin(["projects", "--add", "demo", AGENT])).code).toBe(0);
    expect((await bin(["info", "demo", "--json"], "", { AGENTKIT_API_KEY: "canonical", AGENTKIT_KEY: "legacy" })).code).toBe(0);
    expect(requests.at(-1)!.auth).toBe("Bearer canonical");
    expect((await bin(["logout"])).code).toBe(0);
    expect((await bin(["info", "demo"])).code).toBe(1);
    expect((await fs.readFile(path.join(dir, "config.json"), "utf8"))).not.toContain("saved-key");
  });
  it("redacts an echoed API key in server errors", async () => {
    respond = res => { res.statusCode = 401; res.end(JSON.stringify({ error: { code: "AUTH_INVALID_API_KEY", message: "bad secret-token" } })); };
    const result = await bin(["--key", "secret-token", "info", AGENT]);
    expect(result.stderr).not.toContain("secret-token"); expect(result.stderr).toContain("[REDACTED]");
  });
  it("redacts a key containing JSON escape characters without breaking error JSON", async () => {
    const key = 'secret"quote\\slash';
    respond = res => { res.statusCode = 401; res.end(JSON.stringify({ error: { code: "AUTH_INVALID_API_KEY", message: `bad ${key}`, details: { echo: key } } })); };
    const result = await bin(["--key", key, "info", AGENT]);
    expect(result.stderr).not.toContain("secret");
    expect(result.stderr).toContain("[REDACTED]");
    expect(JSON.parse(result.stderr).error.details.echo).toBe("[REDACTED]");
  });
  it("routes the new grouped read and write commands", async () => {
    const commands = [
      ["settings", "ai", AGENT],
      ["agents", "update", AGENT, "--name", "Renamed"],
      ["sources", "file-upload-urls", AGENT, "--file-name", "guide.pdf"],
      ["contacts", "import", AGENT, "--file", "-"],
      ["leads", AGENT, "--created-after", "2026-01-01T00:00:00Z"],
      ["instagram", "instances", AGENT, "story_leads"],
    ];
    for (const command of commands) {
      const input = command.includes("import") ? '{"rows":[{"external_id":"one"}]}' : "";
      const result = await bin(["--key", "test-key", "--json", ...command], input);
      expect(result.code, result.stderr).toBe(0);
    }
    expect(requests.map(r => r.url)).toEqual([
      `/api/v2/agents/${AGENT}/settings/ai`,
      `/api/v2/agents/${AGENT}`,
      `/api/v2/agents/${AGENT}/sources/file/upload-url`,
      `/api/v2/agents/${AGENT}/contacts/import`,
      `/api/v2/agents/${AGENT}/leads?createdAfter=2026-01-01T00%3A00%3A00Z`,
      `/api/v2/agents/${AGENT}/channels/instagram/automations/story_leads/instances`,
    ]);
  });
  it("declares upload sizes in file-name order", async () => {
    const ok = await bin(["--key", "test-key", "--json", "sources", "file-upload-urls", AGENT, "--file-name", "a.pdf", "b.txt", "--size", "1024", "2048"]);
    expect(ok.code, ok.stderr).toBe(0);
    expect(JSON.parse(requests.at(-1)!.body)).toEqual({ files: [{ fileName: "a.pdf", size: 1024 }, { fileName: "b.txt", size: 2048 }] });
    const mismatch = await bin(["--key", "test-key", "sources", "file-upload-urls", AGENT, "--file-name", "a.pdf", "b.txt", "--size", "1024"]);
    expect(mismatch.code).toBe(1); expect(requests).toHaveLength(1);
  });
  it("refuses protected management writes before making requests", async () => {
    expect((await bin(["--key", "test-key", "widgets", "delete", AGENT, AGENT])).code).toBe(1);
    expect((await bin(["--key", "test-key", "widgets", "publish", AGENT, AGENT, "--expected-updated-at", "2026-01-01T00:00:00Z"])).code).toBe(1);
    expect((await bin(["--key", "test-key", "backstage", "decide", AGENT, AGENT, "approve"])).code).toBe(1);
    expect((await bin(["--key", "test-key", "actions", "delete", AGENT, AGENT, "--expected-updated-at", "2026-01-01T00:00:00Z"])).code).toBe(1);
    expect((await bin(["--key", "test-key", "secrets", "delete", AGENT, "TOKEN"])).code).toBe(1);
    expect(requests).toHaveLength(0);
  });
  it("authors disabled actions from stdin and never echoes secret input", async () => {
    respond = res => res.end(JSON.stringify({ id: AGENT, enabled: false, updatedAt: "2026-09-12T12:00:00Z" }));
    const action = {
      actionName: "unsubscribe_marketing_emails",
      whenToUse: "Use for marketing email opt-out requests.",
      executionType: "server",
      dataInputs: [],
      apiRequest: { method: "POST", url: "https://example.test/unsubscribe", queryParams: [], headers: [], body: "{}" },
      testResponse: { useExampleResponse: true, exampleResponse: "{}", testVariables: [], sampleResponse: "{}" },
      dataAccess: { mode: "full" },
    };
    const created = await bin(["actions", "create", AGENT, "--json"], JSON.stringify(action), { AGENTKIT_SESSION_TOKEN: "test-session" });
    expect(created.code, created.stderr).toBe(0);
    expect(JSON.parse(requests.at(-1)!.body)).toEqual(action);
    expect(requests.at(-1)!.auth).toBe("Bearer test-session");

    respond = res => res.end(JSON.stringify({ name: "TOKEN", hasValue: true, description: null, createdAt: "now", updatedAt: "now" }));
    const secret = await bin(["secrets", "set", AGENT, "TOKEN", "--json"], "private-value", { AGENTKIT_SESSION_TOKEN: "test-session" });
    expect(secret.code, secret.stderr).toBe(0);
    expect(requests.at(-1)!.body).toContain("private-value");
    expect(secret.stdout).not.toContain("private-value");
    expect(secret.stderr).not.toContain("private-value");
    expect(JSON.parse(secret.stdout)).toMatchObject({ name: "TOKEN", hasValue: true });
  });
  it("reads origin-bound session credentials, redacts them, and clears them on logout", async () => {
    expect((await bin(["init", "--with-session-token"], "user-session-secret")).code).toBe(0);
    const success = await bin(["widgets", "list", AGENT]);
    expect(success.code, success.stderr).toBe(0);
    expect(requests.at(-1)!.auth).toBe("Bearer user-session-secret");
    respond = res => { res.statusCode = 401; res.end(JSON.stringify({ error: { code: "AUTH_INVALID_API_KEY", message: "invalid user-session-secret" } })); };
    const failure = await bin(["widgets", "list", AGENT]);
    expect(failure.stderr).not.toContain("user-session-secret"); expect(failure.stderr).toContain("[REDACTED]");
    expect((await bin(["logout"])).code).toBe(0);
    expect(await fs.readFile(path.join(dir, "config.json"), "utf8")).not.toContain("session");
    expect((await bin(["widgets", "list", AGENT])).code).toBe(1);
  });
  it("reports a stale Backstage approval as incomplete rather than successful", async () => {
    respond = res => res.end(JSON.stringify({ id: AGENT, status: "stale", errorCode: null, href: null }));
    const result = await bin(["backstage", "decide", AGENT, AGENT, "approve", "--yes"], "", { AGENTKIT_SESSION_TOKEN: "test-session" });
    expect(result.code).toBe(1); expect(JSON.parse(result.stdout).status).toBe("stale");
    expect(JSON.parse(result.stderr).error.code).toBe("BACKSTAGE_DECISION_NOT_APPLIED");
    expect(requests).toHaveLength(1);
  });
  it("routes Instagram channel configuration separately from integration status", async () => {
    const result = await bin(["--key", "test-key", "channels", "get", AGENT, "instagram"]);
    expect(result.code, result.stderr).toBe(0); expect(requests.at(-1)!.url).toBe(`/api/v2/agents/${AGENT}/channels/instagram/config`);
  });

});

describe("source detail and partial edits", () => {
  const doc = { id: "doc", title: "Support", sourceType: "qna_entry", content: "raw", questions: ["When?"], answer: "Always" };
  const env = { AGENTKIT_API_KEY: "test-key" };
  beforeEach(() => { respond = res => res.end(JSON.stringify({ data: doc })); });

  it("reads the stored Q&A fields and keeps terminal controls out of multiline text", async () => {
    expect((await bin(["sources", "get", AGENT, doc.id], "", env)).stdout).toBe("Support (qna_entry)\nQuestions:\nWhen?\nAnswer:\nAlways\n");
    const text = { ...doc, sourceType: "web_page", content: "\u001b[31mfirst\u001b[0m\nsecond\u0007" };
    respond = res => res.end(JSON.stringify({ data: text }));
    expect((await bin(["get-source", AGENT, doc.id], "", env)).stdout).toBe("Support (web_page)\nfirst\nsecond \n");
    expect(JSON.parse((await bin(["sources", "get", AGENT, doc.id, "--json"], "", env)).stdout)).toEqual(text);
  });

  it("uses the saved default for get and update and sends only the requested fields", async () => {
    expect((await bin(["config", "set", "agent", AGENT])).code).toBe(0);
    expect(JSON.parse((await bin(["sources", "get", doc.id, "--json"], "", env)).stdout)).toEqual(doc);
    const result = await bin(["sources", "update", doc.id, "--title", "Times", "--question", "Q1", "Q2", "--question", "Q3", "--answer", "A", "--json"], "", env);
    expect(result.code, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(doc);
    expect(requests.map(r => [r.method, r.url])).toEqual(["GET", "PATCH"].map(method => [method, `/api/v2/agents/${AGENT}/sources/doc`]));
    expect(JSON.parse(requests[1]!.body)).toEqual({ title: "Times", questions: ["Q1", "Q2", "Q3"], answer: "A" });
  });

  it("accepts literal, file and stdin content without changing whitespace", async () => {
    const content = "  line one\nline two\n";
    const file = path.join(dir, "entry.txt");
    await fs.writeFile(file, content);
    for (const args of [["--content", content], ["--file", file], ["--file", "-"]]) {
      const result = await bin(["update-source", AGENT, doc.id, ...args], content, env);
      expect(result.code, result.stderr).toBe(0);
      expect(JSON.parse(requests.at(-1)!.body)).toEqual({ content });
    }
  });

  it.each([[], ["--answer", "a", "--content", "text"], ["--question", "q", "--file", "missing"],
    ["--content", "text", "--file", "-"]])("rejects invalid patch %j before dispatch", async (...args) => {
    const result = await bin(["sources", "update", AGENT, doc.id, ...args], "", env);
    expect(result.code).toBe(1);
    expect(requests).toHaveLength(0);
  });
});
