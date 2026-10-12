import { describe, expect, it } from "vitest";

import { AgentkitClient } from "../src/sdk/client.js";
import { AgentkitError } from "../src/sdk/errors.js";
import { discardedEmail, emailThread } from "./fixtures/email.js";

type Call = { url: string; init: RequestInit };

function fakeFetch(
  handler: (call: Call) => Response,
): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fn = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const call = { url: String(input), init };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;
  return { fetch: fn, calls };
}

describe("AgentkitClient", () => {
  it.each([200, 500])("cancels oversized successful and error bodies before parsing, status=%s", async status => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode("x".repeat(65))); },
      cancel() { cancelled = true; },
    });
    const { fetch } = fakeFetch(() => new Response(body, { status }));
    const client = new AgentkitClient({ key: "synthetic", fetch, maxResponseBytes: 64 });
    await expect(client.listAgents()).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE", status });
    expect(cancelled).toBe(true);
  });
  it("decodes bounded JSON correctly when UTF-8 characters cross chunks", async () => {
    const encoded = new TextEncoder().encode(JSON.stringify({ data: [{ id: "a", name: "café" }], pagination: { hasMore: false } }));
    const split = encoded.indexOf(0xc3) + 1;
    const body = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(encoded.slice(0, split)); controller.enqueue(encoded.slice(split)); controller.close();
    } });
    const { fetch } = fakeFetch(() => new Response(body));
    const client = new AgentkitClient({ key: "synthetic", fetch, maxResponseBytes: encoded.length });
    expect((await client.listAgents()).data[0]!.name).toBe("café");
  });
  it("reads email threads, messages and drafts with account-key auth and encoded IDs", async () => {
    const list = { data: [discardedEmail], pagination: { limit: 1, nextCursor: "next page", hasMore: true } };
    const message = { ...emailThread.messages[0], threadId: emailThread.id };
    const replies = [list, { data: emailThread }, { data: message }, { data: emailThread.drafts, pagination: list.pagination }, { data: emailThread.drafts[0] }];
    const { fetch, calls } = fakeFetch(() => jsonResponse(replies.shift()));
    const client = new AgentkitClient({ key: "account-key", sessionToken: "session-token", fetch });
    expect(await client.listEmails("agent /1", { status: "discarded", since: "2026-10-09T00:00:00+03:00", limit: 1, cursor: "next page" })).toEqual(list);
    expect(await client.getEmail("agent /1", "thread /1")).toEqual({ data: emailThread });
    expect(await client.getEmailMessage("agent /1", "message /1")).toEqual(message);
    expect((await client.listEmailDrafts("agent /1", { limit: 1, cursor: "next page", since: "2026-10-09T00:00:00+03:00" })).data).toEqual(emailThread.drafts);
    expect(await client.getEmailDraft("agent /1", "draft /1")).toEqual({ data: emailThread.drafts[0] });
    expect(calls.map(call => new URL(call.url).pathname)).toEqual([
      "/api/v2/agents/agent%20%2F1/emails", "/api/v2/agents/agent%20%2F1/emails/thread%20%2F1",
      "/api/v2/agents/agent%20%2F1/emails/messages/message%20%2F1", "/api/v2/agents/agent%20%2F1/emails/drafts",
      "/api/v2/agents/agent%20%2F1/emails/drafts/draft%20%2F1",
    ]);
    expect(Object.fromEntries(new URL(calls[0]!.url).searchParams)).toEqual({ status: "discarded", since: "2026-10-09T00:00:00+03:00", limit: "1", cursor: "next page" });
    expect(Object.fromEntries(new URL(calls[3]!.url).searchParams)).toEqual({ since: "2026-10-09T00:00:00+03:00", limit: "1", cursor: "next page" });
    for (const call of calls) {
      expect(call.init.method).toBe("GET");
      expect(new Headers(call.init.headers).get("authorization")).toBe("Bearer account-key");
      expect(new Headers(call.init.headers).has("x-agentkit-auth")).toBe(false);
    }
  });
  it("sends a non-streaming chat with auth + correct body and unwraps data", async () => {
    const { fetch, calls } = fakeFetch(() =>
      jsonResponse({
        data: {
          id: "42",
          role: "assistant",
          parts: [{ type: "text", text: "hi" }],
          metadata: {
            userMessageId: "41",
            conversationId: "conv_1",
            userId: "u1",
            finishReason: "stop",
            usage: { credits: 1 },
          },
        },
      }),
    );
    const client = new AgentkitClient({ key: "sk-test", fetch });
    const result = await client.chat("agent_1", {
      message: "hello",
      userId: "u1",
    });

    expect(result.id).toBe("42");
    expect(result.parts[0]!.text).toBe("hi");

    const call = calls[0]!;
    expect(call.url).toBe("https://agentkit.ai/api/v2/agents/agent_1/chat");
    expect(call.init.method).toBe("POST");
    expect(new Headers(call.init.headers).get("authorization")).toBe(
      "Bearer sk-test",
    );
    expect(JSON.parse(String(call.init.body))).toEqual({
      message: "hello",
      userId: "u1",
      stream: false,
    });
  });

  it("preserves optional chat channels for streaming and non-streaming SDK calls", async () => {
    for (const stream of [false, true]) {
      for (const channel of [undefined, "api_v2", "playground"] as const) {
        const { fetch, calls } = fakeFetch(() => stream
          ? new Response('data: [DONE]\n\n', { headers: { "content-type": "text/event-stream" } })
          : jsonResponse({ data: { id: "42", parts: [] } }));
        const client = new AgentkitClient({ key: "k", fetch });
        const req = { message: "hello", ...(channel ? { channel } : {}) };
        if (stream) for await (const event of client.chatStream("a1", req)) void event;
        else await client.chat("a1", req);
        expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ ...req, stream });
      }
    }
  });

  it("uses PATCH for feedback", async () => {
    const { fetch, calls } = fakeFetch(() =>
      jsonResponse({
        data: {
          id: "42",
          role: "assistant",
          parts: [],
          createdAt: 1,
          feedback: "positive",
          metadata: {},
        },
      }),
    );
    const client = new AgentkitClient({ key: "k", fetch });
    const msg = await client.setFeedback("a", "c", 42, "positive");
    expect(msg.feedback).toBe("positive");
    expect(calls[0]!.init.method).toBe("PATCH");
    expect(calls[0]!.url).toContain("/messages/42/feedback");
  });

  it("throws an AgentkitError on a non-OK response", async () => {
    const { fetch } = fakeFetch(() =>
      jsonResponse(
        { error: { code: "AGENT_NOT_FOUND", message: "nope" } },
        404,
      ),
    );
    const client = new AgentkitClient({ key: "k", fetch });
    await expect(client.listConversations("missing")).rejects.toMatchObject({
      code: "AGENT_NOT_FOUND",
      status: 404,
    });
    await expect(client.listConversations("missing")).rejects.toBeInstanceOf(
      AgentkitError,
    );
  });

  it("never sends credentials to the unauthenticated health endpoint", async () => {
    const { fetch, calls } = fakeFetch(() =>
      jsonResponse({ status: "ok", timestamp: 1 }),
    );
    const client = new AgentkitClient({ fetch, key: "health-secret", sessionToken: "health-session-secret" });
    await client.health();
    expect(new Headers(calls[0]!.init.headers).has("authorization")).toBe(false);
  });

  it("lists agents at the account-level path", async () => {
    const { fetch, calls } = fakeFetch(() =>
      jsonResponse({
        data: [{ id: "a1", name: "X", url: null, createdAt: 1 }],
        pagination: { cursor: null, hasMore: false, total: 1 },
      }),
    );
    const client = new AgentkitClient({ key: "k", fetch });
    const list = await client.listAgents();
    expect(list.data[0]!.id).toBe("a1");
    expect(calls[0]!.url).toBe("https://agentkit.ai/api/v2/agents");
    expect(calls[0]!.init.method).toBe("GET");
  });

  it("creates an agent with a JSON body", async () => {
    const { fetch, calls } = fakeFetch(() =>
      jsonResponse({ id: "a2", name: "New", url: null, createdAt: 2 }),
    );
    const client = new AgentkitClient({ key: "k", fetch });
    const agent = await client.createAgent({ name: "New" });
    expect(agent.id).toBe("a2");
    expect(calls[0]!.init.method).toBe("POST");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ name: "New" });
  });

  it("PATCHes the ai settings section", async () => {
    const { fetch, calls } = fakeFetch(() =>
      jsonResponse({
        model: "openai/gpt-5.6-luna",
        instructionsPreset: "custom",
        instructionsPrompt: "p",
      }),
    );
    const client = new AgentkitClient({ key: "k", fetch });
    const ai = await client.updateAiSettings("a1", {
      model: "openai/gpt-5.6-luna",
    });
    expect(ai.model).toBe("openai/gpt-5.6-luna");
    expect(calls[0]!.init.method).toBe("PATCH");
    expect(calls[0]!.url).toBe(
      "https://agentkit.ai/api/v2/agents/a1/settings/ai",
    );
  });

  it("adds a text source via POST", async () => {
    const { fetch, calls } = fakeFetch(() =>
      jsonResponse({ documentId: "d1" }),
    );
    const client = new AgentkitClient({ key: "k", fetch });
    const doc = await client.addTextSource("a1", {
      title: "T",
      content: "C",
    });
    expect(doc.documentId).toBe("d1");
    expect(calls[0]!.url).toBe(
      "https://agentkit.ai/api/v2/agents/a1/sources/text",
    );
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      title: "T",
      content: "C",
    });
  });

  it("deletes a source with an encoded path segment", async () => {
    const { fetch, calls } = fakeFetch(() => jsonResponse({}, 200));
    const client = new AgentkitClient({ key: "k", fetch });
    await client.deleteSource("a1", "doc 1");
    expect(calls[0]!.init.method).toBe("DELETE");
    expect(calls[0]!.url).toBe(
      "https://agentkit.ai/api/v2/agents/a1/sources/doc%201",
    );
  });

  it("reads training status", async () => {
    const { fetch, calls } = fakeFetch(() =>
      jsonResponse({
        status: "trained",
        documentCount: 4,
        lastTrainedAt: 100,
        activeJob: null,
      }),
    );
    const client = new AgentkitClient({ key: "k", fetch });
    const s = await client.trainStatus("a1");
    expect(s.documentCount).toBe(4);
    expect(calls[0]!.url).toBe("https://agentkit.ai/api/v2/agents/a1/train");
    expect(calls[0]!.init.method).toBe("GET");
  });

  it("reads the Instagram channel surface", async () => {
    const { fetch, calls } = fakeFetch(() => jsonResponse({ connected: false }));
    const client = new AgentkitClient({ key: "k", fetch });
    const ig = await client.getInstagram("a1");
    expect(ig.connected).toBe(false);
    expect(calls[0]!.init.method).toBe("GET");
    expect(calls[0]!.url).toBe(
      "https://agentkit.ai/api/v2/agents/a1/channels/instagram",
    );
  });

  it("PATCHes an Instagram automation by key with { config?, status? }", async () => {
    const { fetch, calls } = fakeFetch(() =>
      jsonResponse({ key: "respond_to_dms", status: "off", config: { mode: "all" } }),
    );
    const client = new AgentkitClient({ key: "k", fetch });
    const row = await client.updateInstagramAutomation("a1", "respond_to_dms", {
      status: "off",
    });
    expect(row.status).toBe("off");
    expect(calls[0]!.init.method).toBe("PATCH");
    expect(calls[0]!.url).toBe(
      "https://agentkit.ai/api/v2/agents/a1/channels/instagram/automations/respond_to_dms",
    );
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ status: "off" });
  });

  it("GETs a single Instagram automation", async () => {
    const { fetch, calls } = fakeFetch(() =>
      jsonResponse({ key: "comment_to_dm", status: "draft", config: {} }),
    );
    const client = new AgentkitClient({ key: "k", fetch });
    const row = await client.getInstagramAutomation("a1", "comment_to_dm");
    expect(row.key).toBe("comment_to_dm");
    expect(calls[0]!.init.method).toBe("GET");
    expect(calls[0]!.url).toContain("/channels/instagram/automations/comment_to_dm");
  });

  it("PATCHes conversation starters with prompts + status", async () => {
    const prompts = [{ question: "Q", message: "M", links: [] }];
    const { fetch, calls } = fakeFetch(() =>
      jsonResponse({
        status: "live",
        draft_prompts: prompts,
        live_prompts: prompts,
        synced_at: "2026-08-21T00:00:00Z",
        last_sync_error: null,
      }),
    );
    const client = new AgentkitClient({ key: "k", fetch });
    const cs = await client.updateConversationStarters("a1", {
      prompts,
      status: "live",
    });
    expect(cs.live_prompts).toHaveLength(1);
    expect(calls[0]!.init.method).toBe("PATCH");
    expect(calls[0]!.url).toBe(
      "https://agentkit.ai/api/v2/agents/a1/channels/instagram/conversation-starters",
    );
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      prompts,
      status: "live",
    });
  });

  it("patches the Instagram menu and returns the confirmed state", async () => {
    const items = [
      { id: "a", title: "Pricing", action: { kind: "postback" as const, reply: "From $29/mo" } },
    ];
    const { fetch, calls } = fakeFetch(() =>
      jsonResponse({
        status: "live",
        draft_items: items,
        live_items: items,
        synced_at: "2026-08-23T00:00:00Z",
        last_sync_error: null,
      }),
    );
    const client = new AgentkitClient({ key: "k", fetch });
    const menu = await client.updateInstagramMenu("a1", { items, status: "live" });
    expect(menu.live_items).toHaveLength(1);
    expect(calls[0]!.init.method).toBe("PATCH");
    expect(calls[0]!.url).toBe(
      "https://agentkit.ai/api/v2/agents/a1/channels/instagram/menu",
    );
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ items, status: "live" });
  });

  it("posts permissions/refresh and returns the outcome", async () => {
    const { fetch, calls } = fakeFetch(() =>
      jsonResponse({
        outcome: "repair_submitted_unverified",
        code: "grant_readback_unavailable",
        lastVerifiedAt: null,
        loginKind: "instagram_login",
      }),
    );
    const client = new AgentkitClient({ key: "k", fetch });
    const result = await client.refreshInstagramPermissions("a1");
    expect(result.outcome).toBe("repair_submitted_unverified");
    expect(calls[0]!.init.method).toBe("POST");
    expect(calls[0]!.url).toBe(
      "https://agentkit.ai/api/v2/agents/a1/channels/instagram/permissions/refresh",
    );
  });

  it("surfaces Instagram error codes (404 not connected) as AgentkitError", async () => {
    const { fetch } = fakeFetch(() =>
      jsonResponse(
        { error: { code: "INSTAGRAM_NOT_CONNECTED", message: "no integration" } },
        404,
      ),
    );
    const client = new AgentkitClient({ key: "k", fetch });
    await expect(client.getConversationStarters("a1")).rejects.toMatchObject({
      code: "INSTAGRAM_NOT_CONNECTED",
      status: 404,
    });
  });

  it("creates upload URLs and registers uploaded files", async () => {
    const replies = [
      { files: [{ fileName: "guide.pdf", storagePath: "chatbot-a1/x-guide.pdf", uploadUrl: "https://storage.test/x", token: "t" }] },
      [{ documentId: "00000000-0000-4000-8000-000000000002" }],
    ];
    const { fetch, calls } = fakeFetch(() => jsonResponse(replies.shift()));
    const client = new AgentkitClient({ key: "k", fetch });
    await client.createFileUploadUrls("a1", { files: [{ fileName: "guide.pdf" }] });
    await client.registerFileSources("a1", { files: [{ fileName: "guide.pdf", storagePath: "chatbot-a1/x-guide.pdf" }] });
    expect(calls.map(call => [call.init.method, call.url])).toEqual([
      ["POST", "https://agentkit.ai/api/v2/agents/a1/sources/file/upload-url"],
      ["POST", "https://agentkit.ai/api/v2/agents/a1/sources/file"],
    ]);
  });

  it("imports contacts and lists bounded leads", async () => {
    const replies = [{ processed: 1, skipped: 0 }, { data: [], pagination: { cursor: null, hasMore: false, total: 0 } }];
    const { fetch, calls } = fakeFetch(() => jsonResponse(replies.shift()));
    const client = new AgentkitClient({ key: "k", fetch });
    await client.importContacts("a1", { rows: [{ external_id: "customer-1" }] });
    await client.listLeads("a1", { limit: 10, cursor: "next", createdAfter: "2026-01-01T00:00:00Z", createdBefore: "2026-02-01T00:00:00Z" });
    expect(calls[0]!.url.endsWith("/contacts/import")).toBe(true);
    expect(calls[1]!.url).toContain("/leads?limit=10&cursor=next&createdAfter=2026-01-01T00%3A00%3A00Z&createdBefore=2026-02-01T00%3A00%3A00Z");
  });

  it("wraps all four Instagram automation instance operations", async () => {
    const row = { id: "00000000-0000-4000-8000-000000000003", key: "comment_to_dm", status: "draft", config: {} };
    const { fetch, calls } = fakeFetch(() => jsonResponse(calls.length === 0 ? [row] : row));
    const client = new AgentkitClient({ key: "k", fetch });
    await client.listInstagramAutomationInstances("a1", "comment_to_dm");
    await client.createInstagramAutomationInstance("a1", "comment_to_dm", { config: row.config as never });
    await client.getInstagramAutomationInstance("a1", "comment_to_dm", row.id);
    await client.updateInstagramAutomationInstance("a1", "comment_to_dm", row.id, { status: "off" });
    expect(calls.map(call => call.init.method)).toEqual(["GET", "POST", "GET", "PATCH"]);
    expect(calls[3]!.url.endsWith(`/automations/comment_to_dm/instances/${row.id}`)).toBe(true);
  });

  it("uses session auth only for management methods", async () => {
    const { fetch, calls } = fakeFetch(() => jsonResponse({ data: [] }));
    const client = new AgentkitClient({ key: "account-key", sessionToken: "session-jwt", fetch });
    await client.listManagementChannels("a1");
    await client.listAgents();
    expect(new Headers(calls[0]!.init.headers).get("authorization")).toBe("Bearer session-jwt");
    expect(new Headers(calls[0]!.init.headers).get("x-agentkit-auth")).toBe("session");
    expect(new Headers(calls[1]!.init.headers).get("authorization")).toBe("Bearer account-key");
    expect(new Headers(calls[1]!.init.headers).has("x-agentkit-auth")).toBe(false);
  });

  it("fails session-only management methods locally without a session", async () => {
    const { fetch, calls } = fakeFetch(() => jsonResponse({}));
    const client = new AgentkitClient({ key: "account-key", fetch });
    await expect(client.listWidgets("a1")).rejects.toMatchObject({ code: "AUTH_SESSION_REQUIRED" });
    expect(calls).toHaveLength(0);
  });

  it("reads action metadata with a key and uses session auth for action writes", async () => {
    const { fetch, calls } = fakeFetch(() => jsonResponse({ data: [] }));
    const readClient = new AgentkitClient({ key: "account-key", fetch });
    const writeClient = new AgentkitClient({ sessionToken: "session-jwt", fetch });

    await readClient.listCustomApiActions("a1");
    await writeClient.createCustomApiAction("a1", {
      actionName: "unsubscribe_marketing_emails",
      whenToUse: "Use for marketing email opt-out requests.",
      executionType: "server",
      dataInputs: [],
      apiRequest: {
        method: "POST",
        url: "https://example.test/unsubscribe",
        queryParams: [],
        headers: [],
        body: "{}",
      },
      testResponse: {
        useExampleResponse: true,
        exampleResponse: "{}",
        testVariables: [],
        sampleResponse: "{}",
      },
      dataAccess: { mode: "full" },
    });

    expect(new Headers(calls[0]!.init.headers).get("authorization")).toBe(
      "Bearer account-key",
    );
    expect(calls[0]!.init.method).toBe("GET");
    expect(calls[1]!.init.method).toBe("POST");
    expect(new Headers(calls[1]!.init.headers).get("authorization")).toBe(
      "Bearer session-jwt",
    );
    expect(new Headers(calls[1]!.init.headers).get("x-agentkit-auth")).toBe(
      "session",
    );
  });

  it("sends action concurrency tokens and secret values only in request bodies", async () => {
    const replies = [
      { id: "action-1", updatedAt: "new" },
      { name: "TOKEN", hasValue: true, description: null },
    ];
    const { fetch, calls } = fakeFetch(() => jsonResponse(replies.shift()));
    const client = new AgentkitClient({ sessionToken: "session-jwt", fetch });

    await client.updateCustomApiAction("a1", "action 1", {
      expectedUpdatedAt: "old",
      whenToUse: "Updated",
    });
    const metadata = await client.setAgentSecret("a1", "TOKEN", {
      value: "private-value",
    });

    expect(calls[0]!.url.endsWith("/actions/action%201")).toBe(true);
    expect(JSON.parse(String(calls[0]!.init.body))).toMatchObject({
      expectedUpdatedAt: "old",
    });
    expect(JSON.parse(String(calls[1]!.init.body))).toEqual({
      value: "private-value",
    });
    expect(metadata).toEqual({
      name: "TOKEN",
      hasValue: true,
      description: null,
    });
  });

  it("preserves structured Backstage stream events", async () => {
    const { fetch } = fakeFetch(() => new Response('data: {"type":"data-session","data":{"id":"s1"}}\n\ndata: {"type":"data-proposal","data":{"id":"c1"}}\n\ndata: [DONE]\n\n', { headers: { "content-type": "text/event-stream" } }));
    const client = new AgentkitClient({ sessionToken: "session-jwt", fetch });
    const events = [];
    for await (const event of client.chatBackstage("a1", { message: "help", clientMessageId: "m1" })) events.push(event);
    expect(events).toEqual([{ type: "data-session", data: { id: "s1" } }, { type: "data-proposal", data: { id: "c1" } }]);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
