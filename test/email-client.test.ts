import { describe, expect, expectTypeOf, it } from "vitest";
import { AgentkitClient } from "../src/sdk/client.js";
import type { EmailDraft, EmailListOptions } from "../src/sdk/email.js";

describe("email management transport", () => {
  it("types an edited draft as the detail envelope returned by the server", () => {
    expectTypeOf<ReturnType<AgentkitClient["editEmailDraft"]>>().toEqualTypeOf<Promise<{ data: EmailDraft }>>();
  });
  const operations = [
    (c: AgentkitClient) => c.discardEmail("agent", "thread", { draftId: null, draftEditedAt: null, inboundMessageId: "message" }),
    (c: AgentkitClient) => c.restoreEmail("agent", "thread", { expectedRevision: "reviewed" }),
    (c: AgentkitClient) => c.draftEmail("agent", "thread"),
    (c: AgentkitClient) => c.forwardEmail("agent", "message", { to: "review@example.com", submissionId: "stable" }),
    (c: AgentkitClient) => c.editEmailDraft("agent", "draft", { bodyText: "Reviewed", expectedRevision: "1" }),
    (c: AgentkitClient) => c.sendEmailDraft("agent", "draft", { expectedRevision: "1" }),
    (c: AgentkitClient) => c.getEmailSettings("agent"),
    (c: AgentkitClient) => c.updateEmailSettings("agent", { signatureHtml: "" }),
    (c: AgentkitClient) => c.enableEmailChannel("agent"),
    (c: AgentkitClient) => c.disableEmailChannel("agent"),
    (c: AgentkitClient) => c.getEmailReplyAddress("agent"),
    (c: AgentkitClient) => c.addEmailReplyAddress("agent", { address: "review@example.com" }),
    (c: AgentkitClient) => c.verifyEmailReplyAddress("agent", { code: "123456" }),
    (c: AgentkitClient) => c.removeEmailReplyAddress("agent"),
    (c: AgentkitClient) => c.listEmailAutomatedSenders("agent"),
    (c: AgentkitClient) => c.addEmailAutomatedSender("agent", { address: "review@example.com" }),
    (c: AgentkitClient) => c.removeEmailAutomatedSender("agent", { address: "review@example.com" }),
  ];
  it("requires a user session for email setup and writes and never falls back to an account key", async () => {
    let calls = 0;
    const client = new AgentkitClient({ key: "account-key", fetch: async () => { calls++; return new Response("{}"); } });
    for (const operation of operations) await expect(operation(client)).rejects.toMatchObject({ code: "AUTH_SESSION_REQUIRED" });
    expect(calls).toBe(0);
    const authenticated = new AgentkitClient({ key: "account-key", sessionToken: "user-session", fetch: async (_url, init) => {
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer user-session");
      expect(new Headers(init?.headers).get("x-agentkit-auth")).toBe("session");
      calls++; return new Response("{}");
    } });
    for (const operation of operations) await operation(authenticated);
    expect(calls).toBe(operations.length);
  });
  it("reads the inbox with an account key or an explicit user session", async () => {
    const reads = [(c: AgentkitClient) => c.listEmails("agent"), (c: AgentkitClient) => c.getEmail("agent", "thread"), (c: AgentkitClient) => c.listEmailDrafts("agent"), (c: AgentkitClient) => c.getEmailDraft("agent", "draft"), (c: AgentkitClient) => c.getEmailMessage("agent", "message")];
    for (const key of [undefined, "account-key"]) {
      let calls = 0;
      const client = new AgentkitClient({ key, sessionToken: "user-session", fetch: async (_url, init) => {
        const headers = new Headers(init?.headers);
        expect(headers.get("authorization")).toBe(`Bearer ${key ?? "user-session"}`);
        expect(headers.get("x-agentkit-auth")).toBe(key ? null : "session");
        calls++; return new Response('{"data":{}}');
      } });
      for (const read of reads) await read(client);
      expect(calls).toBe(reads.length);
    }
  });
  it("validates cursor and time filters before making a request", async () => {
    let calls = 0;
    const client = new AgentkitClient({ sessionToken: "session", fetch: async () => { calls++; return new Response("{}"); } });
    const bad: EmailListOptions[] = [{ limit: 0 }, { limit: 101 }, { limit: 1.5 }, { cursor: "" }, { cursor: "x".repeat(2049) }, { since: "2026-10-10" }, { since: "2026-99-10T00:00:00Z" }, { since: "2026-02-30T00:00:00Z" }];
    for (const options of bad) expect(() => client.listEmails("agent", options)).toThrow();
    expect(calls).toBe(0);
  });
  it("preserves complete detail, unknown historical reasons and forward read-back identity", async () => {
    const detail = { data: { id: "thread", revision: "reviewed", messages: [{ text: "Activation code", html: "<b>Activation code</b>", headers: { "auto-submitted": "auto-generated" }, discardReason: { origin: "unknown", code: "unknown" } }], forwards: [{ submissionId: "stable", status: "delivered" }] } };
    const calls: string[] = [];
    const client = new AgentkitClient({ sessionToken: "session", fetch: async (url) => { calls.push(String(url)); return new Response(JSON.stringify(detail)); } });
    expect(await client.getEmail("agent /", "thread /")).toEqual(detail);
    expect(calls).toEqual(["https://agentkit.ai/api/v2/agents/agent%20%2F/emails/thread%20%2F"]);
  });
  it("keeps already sent and unresolved results intact, and returns revision conflicts without retries", async () => {
    let calls = 0;
    const client = new AgentkitClient({ sessionToken: "session", fetch: async () => { calls++; return new Response(JSON.stringify({ status: calls === 1 ? "already_sent" : "unresolved", submissionId: "stable" })); } });
    expect(await client.sendEmailDraft("agent", "draft", { expectedRevision: "1" })).toEqual({ status: "already_sent", submissionId: "stable" });
    expect(await client.forwardEmail("agent", "message", { to: "review@example.com", submissionId: "stable" })).toEqual({ status: "unresolved", submissionId: "stable" });
    expect(calls).toBe(2);
    const conflicting = new AgentkitClient({ sessionToken: "session", fetch: async () => { calls++; return new Response(JSON.stringify({ error: { code: "EMAIL_REVISION_CONFLICT", message: "Draft changed" } }), { status: 409 }); } });
    await expect(conflicting.editEmailDraft("agent", "draft", { bodyText: "Reviewed", expectedRevision: "1" })).rejects.toMatchObject({ code: "EMAIL_REVISION_CONFLICT", status: 409 });
    expect(calls).toBe(3);
  });
});
