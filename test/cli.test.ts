import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
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
function bin(args: string[], stdin = "", env: Record<string, string> = {}) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ["dist/cli/index.js", "--url", url, ...args], {
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
describe("installed-style executable", () => {
  it("runs help/version offline and rejects unknown commands", async () => {
    expect((await bin(["--help"])).code).toBe(0);
    const pkg = JSON.parse(await fs.readFile("package.json", "utf8"));
    expect((await bin(["--version"])).stdout.trim()).toBe(pkg.version);
    const bad = await bin(["nonsense", "--json"]);
    expect(bad.code).toBe(1); expect(JSON.parse(bad.stderr).error.code).toBe("CLI_ERROR"); expect(requests).toHaveLength(0);
  });
  it("shows resource commands and hides legacy duplicate commands", async () => {
    const help = (await bin(["--help"])).stdout;
    for (const name of ["create-agent", "channel-configure", "set-instructions", "ig-automation"]) expect(help).not.toContain(name);
    expect(help).toContain("emails"); expect(help).toContain("email");
    expect((await bin(["channels", "--help"])).stdout).toContain("configure");
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
      const result = await bin(["--json", ...row.args], row.stdin ?? "", { AGENTKIT_SESSION_TOKEN: "session", AGENTKIT_API_KEY: "unused-key" });
      expect(result.code, `${row.args.join(" ")}: ${result.stderr}`).toBe(0);
      const request = requests.at(-1)!;
      const inboxRead = row.method === "GET" && row.suffix.startsWith("/emails");
      expect(request).toMatchObject({ method: row.method, url: `/api/v2/agents/${AGENT}${row.suffix}`, auth: inboxRead ? "Bearer unused-key" : "Bearer session" });
      expect(request.body ? JSON.parse(request.body) : undefined).toEqual(row.body);
    }
  });
  it("rejects unsafe email inputs and key-only access without making requests", async () => {
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
    for (const source of ["playground", "widget", "all"]) {
      for (const command of [["conversations", "list"], ["conversations"]]) {
        const result = await bin([...command, AGENT, "--source", source, "--limit", "1", "--cursor", "next page", "--key", "test-key", "--json"]);
        expect(result.code, result.stderr).toBe(0);
        const query = new URL(requests.at(-1)!.url!, url);
        expect(query.pathname).toBe(`/api/v2/agents/${AGENT}/conversations`);
        expect(Object.fromEntries(query.searchParams)).toEqual({ source, limit: "1", cursor: "next page" });
        expect(requests.at(-1)!.auth).toBe("Bearer test-key");
      }
    }
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
