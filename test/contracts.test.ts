import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { AgentkitClient } from "../src/sdk/client.js";
import type { ChatResult, SecurityUpdate, CreateContactRequest, UrlSourceJob, Contact } from "../src/sdk/types.js";
import { discardedEmail, emailThread } from "./fixtures/email.js";
const spec = JSON.parse(fs.readFileSync("contracts/openapi.json", "utf8"));
const coverage: { operationId: string; method: string; path: string; sdk: keyof AgentkitClient | null }[] = JSON.parse(fs.readFileSync("contracts/coverage.json", "utf8"));
const ajv = new Ajv2020({ strict: false });
addFormats.default(ajv);
ajv.addSchema({ $id: "agentkit", components: spec.components });
function valid(schema: string, value: unknown) {
  const validate = ajv.compile({ $ref: `agentkit#/components/schemas/${schema}` });
  expect(validate(value), JSON.stringify(validate.errors)).toBe(true);
}
const chat = { id: "42", role: "assistant", parts: [{ type: "text", text: "Hello" }], pendingToolCall: { id: "call", name: "lookup", arguments: { sku: "demo" } }, metadata: { userMessageId: null, conversationId: "conv", userId: null, finishReason: "stop", usage: { credits: 1 } } } satisfies ChatResult;
const security = { rateLimit: { maxMessages: 10, windowSeconds: 60, limitMessage: "Please wait" } } satisfies SecurityUpdate;
const contact = { externalId: "demo", customAttributes: { tier: "test" } } satisfies CreateContactRequest;
const urlJob = { jobId: 123, isRetrain: false } satisfies UrlSourceJob;
const savedContact = { id: "00000000-0000-4000-8000-000000000001", externalId: "demo", name: null, email: null, phone: null, customAttributes: { tier: "test" }, createdAt: 1, updatedAt: 1, lastSeenAt: null } satisfies Contact;

describe("pinned API compatibility", () => {
  it("validates email inbox responses including discarded review reasons and nullable bodies", () => {
    valid("EmailThreadList", { data: [discardedEmail], pagination: { limit: 20, nextCursor: null, hasMore: false } });
    valid("EmailThreadDetail", { data: emailThread });
    valid("EmailDraftList", { data: emailThread.drafts, pagination: { limit: 20, nextCursor: null, hasMore: false } });
    valid("EmailMessageDetail", { data: { ...emailThread.messages[0], threadId: emailThread.id } });
  });
  it("validates discard snapshots for untouched and edited drafts", () => {
    const draftId = "00000000-0000-4000-8000-000000000001";
    valid("EmailDiscardRequest", { draftId, draftEditedAt: null });
    valid("EmailDiscardRequest", { draftId, draftEditedAt: "2026-10-10T00:00:00Z" });
    const discard = ajv.compile({ $ref: "agentkit#/components/schemas/EmailDiscardRequest" });
    expect(discard({ draftId: null, draftEditedAt: null })).toBe(false);
  });
  it("accounts for every documented operation and every SDK method", () => {
    const declared = Object.entries(spec.paths).flatMap(([path, value]) => Object.entries(value as Record<string, { operationId: string }>).filter(([method]) => ["get", "post", "patch", "delete", "put"].includes(method)).map(([method, op]) => `${op.operationId} ${method.toUpperCase()} ${path}`));
    expect(coverage.map(c => `${c.operationId} ${c.method} ${c.path}`).sort()).toEqual(declared.sort());
    const methods = Object.getOwnPropertyNames(AgentkitClient.prototype).filter(k => !["constructor", "headers", "lifetime", "request", "streamRequest", "managementRequest", "managementStream", "q", "chatStream", "retryStream"].includes(k));
    expect(coverage.flatMap(c => c.sdk ? [c.sdk] : []).sort()).toEqual(methods.sort());
  });
  it("validates email bodies, suppression reasons, unknown historical reasons and reviewed revisions", () => {
    const draft = { id: "draft", threadId: "thread", status: "pending", subject: "Verification", bodyText: "Reviewed reply", reviewCategory: "normal", reviewReason: null, editedAt: null, generatedAt: "2026-10-10T00:00:00Z", sentAt: null, revision: "1", deliveryStatus: "not_sent" };
    const detail = { id: "thread", status: "discarded", discarded: true, discardSource: "ingestion", discardReason: { origin: "ingestion", code: "auto_submitted", headerName: "auto-submitted", headerValue: "auto-generated" }, customerName: "Example", customerEmail: "notifications@example.com", subject: "Verification", lastActivityAt: "2026-10-10T00:00:00Z", revision: "2026-10-10T00:00:00Z", emailAddressId: "address", draft, drafts: [draft], forwards: [], messages: [{ id: "message", threadId: "thread", direction: "inbound", draftId: null, providerEmailId: "provider-message", fromAddress: "notifications@example.com", toAddresses: ["inbox@example.com"], ccAddresses: [], bccAddresses: [], subject: "Verification", text: "Synthetic body", html: "<b>Synthetic body</b>", headers: { "auto-submitted": "auto-generated" }, createdAt: "2026-10-10T00:00:00Z", processingDisposition: "automated_suppressed", discardReason: { origin: "ingestion", code: "auto_submitted" } }] };
    valid("EmailThreadDetail", { data: detail });
    valid("EmailThreadDetail", { data: { ...detail, discardReason: { origin: "unknown", code: "unknown" }, messages: detail.messages.map(message => ({ ...message, discardReason: null })) } });
    valid("EmailDraftDetail", { data: draft });
    valid("EmailDraftList", { data: [draft], pagination: { limit: 1, nextCursor: null, hasMore: false } });
    valid("EmailSettingsRequest", { autoSendEnabled: false, signatureEnabled: true, signatureHtml: "" });
    valid("EmailForwardRequest", { to: "support@example.com", note: "", submissionId: "00000000-0000-4000-8000-000000000001" });
    valid("EmailSendRequest", { expectedRevision: "1" });
    const send = ajv.compile({ $ref: "agentkit#/components/schemas/EmailSendRequest" });
    expect(send({ expectedRevision: "stale text" })).toBe(false);
  });
  it("validates a real compiled Widget response and extended channel details", () => {
    const version = JSON.parse(fs.readFileSync("test/fixtures/widget-version.json", "utf8"));
    valid("WidgetVersion", version.widgetVersion);
    valid("ManagementChannelDetail", { id: "web", state: "enabled", visible: true, enabled: true, connected: true, entitled: true, detail: null, widgetEnabled: true, iframeEnabled: false, override: null, effectiveInstructions: "Hello", revision: "a".repeat(64) });
  });
  it("validates typed fixtures including nullable fields, pending actions, settings and URL jobs", () => {
    valid("ChatResponse", { data: chat }); valid("UpdateSecuritySettingsRequest", security);
    valid("UpsertContactRequest", contact); valid("UrlSourceJob", urlJob); valid("Contact", savedContact);
    const bad = ajv.compile({ $ref: "agentkit#/components/schemas/UpdateSecuritySettingsRequest" });
    expect(bad({ rateLimit: 10 })).toBe(false);
  });
  it("exercises every wrapper's verb and route against the operation inventory", async () => {
    for (const row of coverage.filter(r => r.sdk)) {
      let observed: { url: string; method?: string } | undefined;
      const client = new AgentkitClient({ key: "account-key", sessionToken: "session-token", fetch: (async (input, init) => {
        observed = { url: String(input), method: init?.method };
        if (row.sdk === "submitToolResult" || row.sdk === "chatBackstage") return new Response("data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
        return new Response(JSON.stringify({ data: {}, pagination: {} }));
      }) as typeof fetch });
      const params = [...row.path.matchAll(/\{([^}]+)\}/g)].map(m => m[1] === "key" ? "respond_to_dms" : `test ${m[1]}`);
      if (["POST", "PATCH"].includes(row.method)) params.push({} as never);
      if (row.sdk === "retry") params.push("42");
      const method = client[row.sdk!] as (...args: unknown[]) => Promise<unknown> | AsyncIterable<unknown>;
      const result = method.apply(client, params);
      if (Symbol.asyncIterator in result) { for await (const _ of result) { /* consume */ } } else await result;
      const expected = row.path.replace(/\{([^}]+)\}/g, (_, name: string) => name === "key" ? "respond_to_dms" : encodeURIComponent(`test ${name}`));
      expect(observed, row.operationId).toEqual({ url: `https://agentkit.ai/api/v2${expected}`, method: row.method });
    }
  });
});
