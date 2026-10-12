import { emailQuery } from "./email.js";
import type { EmailListOptions, EmailPage, EmailThreadSummary, EmailThreadDetail, EmailDraft, EmailSettingsPatch, EmailChannelData, EmailReplyAddressResponse, EmailMutationResult, DiscardEmailRequest, ForwardEmailRequest, EditEmailDraftRequest, EmailMessage } from "./email.js";
import { VERSION } from "./version.js";
import { validateBaseUrl } from "./url.js";
import { AgentkitError, errorFromResponse, readResponseText } from "./errors.js";
import { parseSseStream } from "./stream.js";
import type {
  AddQnaSource,
  AddTextSource,
  AddUrlSource,
  AgentSummary,
  AiSettings,
  ChatRequest,
  ChatResult,
  Contact,
  CreatedSource,
  CreateFileUploadUrlsRequest,
  FileUploadUrls,
  RegisterFilesRequest,
  ConversationDetail,
  ConversationSummary,
  CreateAgentRequest,
  CreateContactRequest,
  ImportContactsRequest,
  ImportContactsResult,
  Lead,
  LeadListOptions,
  DesignSettings,
  DesignUpdate,
  Feedback,
  HealthResult,
  InstagramAutomation,
  InstagramAutomationKey,
  InstagramAutomationUpdate,
  InstagramAutomationInstance,
  InstagramAutomationInstanceKey,
  CreateInstagramAutomationInstanceRequest,
  UpdateInstagramAutomationInstanceRequest,
  InstagramChannel,
  InstagramConversationStarters,
  InstagramConversationStartersUpdate,
  InstagramMenu,
  InstagramMenuUpdate,
  InstagramPermissionsRefresh,
  ListOptions,
  Message,
  NotificationSettings,
  Paginated,
  SecuritySettings,
  SourceDocument,
  StreamEvent,
  TrainStatus,
  ToolResultRequest,
  UrlSourceJob,
  SecurityUpdate,
  NotificationUpdate,
  AiUpdate,
  TrainingSettings,
  UpdateAgentRequest,
  ManagementChannel,
  ManagementChannelId,
  ManagementChannelDetail,
  ChannelOverrideRequest,
  WebPresentationRequest,
  CenterStageView,
  CenterStageRequest,
  Widget,
  CreateWidgetRequest,
  SaveWidgetDraftRequest,
  SetWidgetStatusRequest,
  PublishWidgetRequest,
  PublishedWidgetResult,
  WidgetVersion,
  WidgetVersionSummary,
  WidgetPackage,
  WidgetMutationResult,
  ImportWidgetRequest,
  BackstageOverview,
  BackstageSessionList,
  BackstageSessionDetail,
  BackstageChange,
  BackstageChangeState,
  BackstageDecision,
  BackstageMessageRequest,
  CustomApiAction,
  CreateCustomApiActionRequest,
  UpdateCustomApiActionRequest,
  SetCustomApiActionStatusRequest,
  DeleteCustomApiActionRequest,
  SecretMetadata,
  SetAgentSecretRequest,
} from "./types.js";

export type ClientOptions = {
  /** Account-scoped API key (Bearer). Optional for `health`. */
  key?: string;
  /** Short-lived Supabase user access token. Used only by management methods. */
  sessionToken?: string;
  /** Base origin, default https://agentkit.ai. */
  baseUrl?: string;
  /** Injectable for tests; defaults to global fetch. */
  fetch?: typeof fetch;
  /** Total request/stream deadline, default 60 seconds. No automatic retries. */
  timeoutMs?: number;
  /** Cancels requests made by this client. */
  signal?: AbortSignal;
  /** Maximum buffered JSON/error response size. Default 16 MiB; MCP uses 512 KiB. */
  maxResponseBytes?: number;
};

export const DEFAULT_BASE_URL = "https://agentkit.ai";

/**
 * Thin, dependency-free client over the Agentkit v2 REST API. Safe in node,
 * workers (uses fetch + Web Streams). Keep account keys server-side.
 */
export class AgentkitClient {
  private readonly key?: string;
  private readonly sessionToken?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  private readonly timeoutMs: number;
  private readonly signal?: AbortSignal;
  private readonly maxResponseBytes: number;

  constructor(options: ClientOptions = {}) {
    this.key = options.key;
    this.sessionToken = options.sessionToken;
    this.baseUrl = validateBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.timeoutMs = options.timeoutMs ?? 60_000;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1) throw new Error("timeoutMs must be a positive integer.");
    this.signal = options.signal;
    this.maxResponseBytes = options.maxResponseBytes ?? 16 * 1024 * 1024;
    if (!Number.isSafeInteger(this.maxResponseBytes) || this.maxResponseBytes < 1) throw new Error("maxResponseBytes must be a positive integer.");
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error("No fetch implementation available (need Node >=22).");
    }
  }

  // ---- low-level request helpers ----

  private headers(extra?: Record<string, string>, mode: "key" | "management" | "session" | "public" = "key"): Headers {
    const headers = new Headers(extra);
    headers.set("accept", "application/json");
    headers.set("user-agent", `agentkit-js/${VERSION}`);
    if (mode === "public") return headers;
    if (mode !== "key" && this.sessionToken) {
      headers.set("authorization", `Bearer ${this.sessionToken}`);
      headers.set("x-agentkit-auth", "session");
    } else {
      if (mode === "session") throw new AgentkitError({ code: "AUTH_SESSION_REQUIRED", message: "This operation requires a user session token.", status: 401 });
      if (mode === "management" && !this.key) throw new AgentkitError({ code: "AUTH_MISSING_API_KEY", message: "Management requires an API key or user session.", status: 401 });
      if (this.key) headers.set("authorization", `Bearer ${this.key}`);
    }
    return headers;
  }

  private lifetime() {
    const controller = new AbortController();
    const abort = () => controller.abort(this.signal?.reason);
    if (this.signal?.aborted) abort();
    else this.signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => controller.abort(new AgentkitError({
      code: "REQUEST_TIMEOUT", message: "Request timed out; a write may have completed. Read back before retrying.", status: 0,
    })), this.timeoutMs);
    return { signal: controller.signal, dispose: () => {
      clearTimeout(timer);
      this.signal?.removeEventListener("abort", abort);
    } };
  }

  private async request<T>(method: string, path: string, body?: unknown, mode: "key" | "management" | "session" | "public" = "key"): Promise<T> {
    const lifetime = this.lifetime();
    try {
      const headers = this.headers(undefined, mode);
      if (body !== undefined) headers.set("content-type", "application/json");
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method, headers, redirect: "error", signal: lifetime.signal,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) throw await errorFromResponse(response, this.maxResponseBytes);
      const text = await readResponseText(response, this.maxResponseBytes);
      try { return (text ? JSON.parse(text) : {}) as T; }
      catch { throw new AgentkitError({ code: "RESPONSE_INVALID_JSON", message: "API returned invalid JSON.", status: response.status, requestId: response.headers.get("x-request-id") ?? undefined }); }
    } catch (error) {
      if (lifetime.signal.aborted) throw lifetime.signal.reason;
      throw error;
    } finally { lifetime.dispose(); }
  }

  private async *streamRequest(path: string, body: unknown, mode: "key" | "management" | "session" = "key"): AsyncGenerator<StreamEvent> {
    const lifetime = this.lifetime();
    try {
      const headers = this.headers({ "content-type": "application/json" }, mode);
      headers.set("accept", "text/event-stream");
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: "POST", headers, body: JSON.stringify(body), redirect: "error", signal: lifetime.signal,
      });
      if (!response.ok) throw await errorFromResponse(response, this.maxResponseBytes);
      if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
        await response.body?.cancel();
        throw new AgentkitError({ code: "STREAM_INVALID_RESPONSE", message: "Expected an SSE response body.", status: response.status });
      }
      for await (const event of parseSseStream(response.body)) {
        if (event.type === "error") {
          throw new AgentkitError({ code: "CHAT_STREAMING_ERROR", message: "Chat stream failed; a partial reply may have been persisted.", status: response.status, requestId: response.headers.get("x-request-id") ?? undefined });
        }
        yield event;
      }
    } catch (error) {
      if (lifetime.signal.aborted) throw lifetime.signal.reason;
      throw error;
    } finally { lifetime.dispose(); }
  }

  private managementRequest<T>(path: string, method: string, body?: unknown, sessionOnly = false): Promise<T> {
    return this.request<T>(method, path, body, sessionOnly ? "session" : "management");
  }

  private managementStream(path: string, body: unknown): AsyncGenerator<StreamEvent> {
    return this.streamRequest(path, body, "session");
  }

  private q(options: ListOptions = {}): string {
    const params = new URLSearchParams();
    if (options.limit != null) params.set("limit", String(options.limit));
    if (options.cursor) params.set("cursor", options.cursor);
    if (options.source) params.set("source", options.source);
    const s = params.toString();
    return s ? `?${s}` : "";
  }

  // ---- public API ----

  /** GET /api/v2/health — unauthenticated connectivity probe. */
  health(): Promise<HealthResult> {
    return this.request<HealthResult>("GET", "/api/v2/health", undefined, "public");
  }

  /**
   * POST /api/v2/agents/{agentId}/chat with stream:false.
   * Returns the full assistant reply in one shot.
   */
  async chat(agentId: string, req: ChatRequest): Promise<ChatResult> {
    const { data } = await this.request<{ data: ChatResult }>(
      "POST",
      `/api/v2/agents/${enc(agentId)}/chat`,
      { ...req, stream: false },
    );
    return data;
  }

  /**
   * POST /api/v2/agents/{agentId}/chat with stream:true.
   * Yields parsed SSE events (text-delta, message-metadata, finish, ...).
   */
  chatStream(agentId: string, req: ChatRequest): AsyncGenerator<StreamEvent> {
    return this.streamRequest(`/api/v2/agents/${enc(agentId)}/chat`, {
      ...req,
      stream: true,
    });
  }

  /** GET /api/v2/agents/{agentId}/conversations */
  listConversations(
    agentId: string,
    options?: ListOptions,
  ): Promise<Paginated<ConversationSummary>> {
    return this.request(
      "GET",
      `/api/v2/agents/${enc(agentId)}/conversations${this.q(options)}`,
    );
  }

  /** GET /api/v2/agents/{agentId}/users/{userId}/conversations */
  listUserConversations(
    agentId: string,
    userId: string,
    options?: ListOptions,
  ): Promise<Paginated<ConversationSummary>> {
    return this.request(
      "GET",
      `/api/v2/agents/${enc(agentId)}/users/${enc(userId)}/conversations${this.q(options)}`,
    );
  }

  /** GET /api/v2/agents/{agentId}/conversations/{id} */
  async getConversation(
    agentId: string,
    conversationId: string,
    options?: ListOptions,
  ): Promise<ConversationDetail> {
    const { data } = await this.request<{ data: ConversationDetail }>(
      "GET",
      `/api/v2/agents/${enc(agentId)}/conversations/${enc(conversationId)}${this.q(options)}`,
    );
    return data;
  }

  /** GET /api/v2/agents/{agentId}/conversations/{id}/messages */
  listMessages(
    agentId: string,
    conversationId: string,
    options?: ListOptions,
  ): Promise<Paginated<Message>> {
    return this.request(
      "GET",
      `/api/v2/agents/${enc(agentId)}/conversations/${enc(conversationId)}/messages${this.q(options)}`,
    );
  }

  /** GET /api/v2/agents/{agentId}/conversations/export (full transcripts, maxLimit 20) */
  exportConversations(
    agentId: string,
    options?: ListOptions,
  ): Promise<Paginated<ConversationDetail>> {
    return this.request(
      "GET",
      `/api/v2/agents/${enc(agentId)}/conversations/export${this.q(options)}`,
    );
  }

  /** PATCH .../messages/{messageId}/feedback */
  async setFeedback(
    agentId: string,
    conversationId: string,
    messageId: string | number,
    feedback: Feedback,
  ): Promise<Message> {
    const { data } = await this.request<{ data: Message }>(
      "PATCH",
      `/api/v2/agents/${enc(agentId)}/conversations/${enc(conversationId)}/messages/${enc(String(messageId))}/feedback`,
      { feedback },
    );
    return data;
  }

  /** POST .../retry with stream:false — regenerate an assistant message. */
  async retry(
    agentId: string,
    conversationId: string,
    messageId: string | number,
  ): Promise<ChatResult> {
    const { data } = await this.request<{ data: ChatResult }>(
      "POST",
      `/api/v2/agents/${enc(agentId)}/conversations/${enc(conversationId)}/retry`,
      { messageId, stream: false },
    );
    return data;
  }

  /** POST .../retry with stream:true. */
  retryStream(
    agentId: string,
    conversationId: string,
    messageId: string | number,
  ): AsyncGenerator<StreamEvent> {
    return this.streamRequest(
      `/api/v2/agents/${enc(agentId)}/conversations/${enc(conversationId)}/retry`,
      { messageId, stream: true },
    );
  }

  /** Resume a pending client action. Results are supplied by the caller, never executed here. */
  submitToolResult(agentId: string, conversationId: string, result: ToolResultRequest): AsyncGenerator<StreamEvent> {
    return this.streamRequest(`/api/v2/agents/${enc(agentId)}/conversations/${enc(conversationId)}/tool-result`, result);
  }

  // ---- management: agent lifecycle ----

  /** GET /api/v2/agents — list agents in the key's account. */
  listAgents(options?: ListOptions): Promise<Paginated<AgentSummary>> {
    return this.request("GET", `/api/v2/agents${this.q(options)}`);
  }

  /** POST /api/v2/agents — create an agent. */
  createAgent(req: CreateAgentRequest): Promise<AgentSummary> {
    return this.request("POST", "/api/v2/agents", req);
  }

  /** GET /api/v2/agents/{agentId} — agent config summary. */
  getAgent(agentId: string): Promise<AgentSummary> {
    return this.request("GET", `/api/v2/agents/${enc(agentId)}`);
  }

  /** PATCH /api/v2/agents/{agentId} — update name/url. */
  updateAgent(agentId: string, req: UpdateAgentRequest): Promise<AgentSummary> {
    return this.request("PATCH", `/api/v2/agents/${enc(agentId)}`, req);
  }

  /** DELETE /api/v2/agents/{agentId} — delete (cascades). */
  deleteAgent(agentId: string): Promise<unknown> {
    return this.request("DELETE", `/api/v2/agents/${enc(agentId)}`);
  }

  // ---- management: settings (PATCH merges + returns the section) ----

  getAiSettings(agentId: string): Promise<AiSettings> {
    return this.request("GET", `/api/v2/agents/${enc(agentId)}/settings/ai`);
  }

  updateAiSettings(
    agentId: string,
    patch: AiUpdate,
  ): Promise<AiSettings> {
    return this.request(
      "PATCH",
      `/api/v2/agents/${enc(agentId)}/settings/ai`,
      patch,
    );
  }

  getDesign(agentId: string): Promise<DesignSettings> {
    return this.request("GET", `/api/v2/agents/${enc(agentId)}/settings/design`);
  }

  updateDesign(
    agentId: string,
    patch: DesignUpdate,
  ): Promise<DesignSettings> {
    return this.request(
      "PATCH",
      `/api/v2/agents/${enc(agentId)}/settings/design`,
      patch,
    );
  }

  getSecurity(agentId: string): Promise<SecuritySettings> {
    return this.request("GET", `/api/v2/agents/${enc(agentId)}/settings/security`);
  }

  getNotifications(agentId: string): Promise<NotificationSettings> {
    return this.request("GET", `/api/v2/agents/${enc(agentId)}/settings/notifications`);
  }

  getTraining(agentId: string): Promise<TrainingSettings> {
    return this.request("GET", `/api/v2/agents/${enc(agentId)}/settings/training`);
  }

  updateSecurity(
    agentId: string,
    patch: SecurityUpdate,
  ): Promise<SecuritySettings> {
    return this.request(
      "PATCH",
      `/api/v2/agents/${enc(agentId)}/settings/security`,
      patch,
    );
  }

  updateNotifications(
    agentId: string,
    patch: NotificationUpdate,
  ): Promise<NotificationSettings> {
    return this.request(
      "PATCH",
      `/api/v2/agents/${enc(agentId)}/settings/notifications`,
      patch,
    );
  }

  updateTraining(
    agentId: string,
    patch: TrainingSettings,
  ): Promise<TrainingSettings> {
    return this.request(
      "PATCH",
      `/api/v2/agents/${enc(agentId)}/settings/training`,
      patch,
    );
  }

  // ---- management: knowledge sources ----

  listSources(
    agentId: string,
    options?: ListOptions,
  ): Promise<Paginated<SourceDocument>> {
    return this.request(
      "GET",
      `/api/v2/agents/${enc(agentId)}/sources${this.q(options)}`,
    );
  }

  addTextSource(agentId: string, src: AddTextSource): Promise<CreatedSource> {
    return this.request(
      "POST",
      `/api/v2/agents/${enc(agentId)}/sources/text`,
      src,
    );
  }

  addQnaSource(agentId: string, src: AddQnaSource): Promise<CreatedSource> {
    return this.request(
      "POST",
      `/api/v2/agents/${enc(agentId)}/sources/qna`,
      src,
    );
  }

  addUrlSource(agentId: string, src: AddUrlSource): Promise<UrlSourceJob> {
    return this.request(
      "POST",
      `/api/v2/agents/${enc(agentId)}/sources/url`,
      src,
    );
  }

  createFileUploadUrls(agentId: string, req: CreateFileUploadUrlsRequest): Promise<FileUploadUrls> {
    return this.request("POST", `/api/v2/agents/${enc(agentId)}/sources/file/upload-url`, req);
  }

  registerFileSources(agentId: string, req: RegisterFilesRequest): Promise<CreatedSource[]> {
    return this.request("POST", `/api/v2/agents/${enc(agentId)}/sources/file`, req);
  }

  deleteSource(agentId: string, documentId: string): Promise<unknown> {
    return this.request(
      "DELETE",
      `/api/v2/agents/${enc(agentId)}/sources/${enc(documentId)}`,
    );
  }

  // ---- management: training ----

  /** POST /api/v2/agents/{agentId}/train — kick a (re)train; returns a job. */
  train(agentId: string): Promise<{ jobId: number }> {
    return this.request("POST", `/api/v2/agents/${enc(agentId)}/train`);
  }

  /** GET /api/v2/agents/{agentId}/train — training status. */
  trainStatus(agentId: string): Promise<TrainStatus> {
    return this.request("GET", `/api/v2/agents/${enc(agentId)}/train`);
  }

  // ---- management: contacts ----

  listContacts(
    agentId: string,
    options?: ListOptions,
  ): Promise<Paginated<Contact>> {
    return this.request(
      "GET",
      `/api/v2/agents/${enc(agentId)}/contacts${this.q(options)}`,
    );
  }

  createContact(agentId: string, req: CreateContactRequest): Promise<Contact> {
    return this.request(
      "POST",
      `/api/v2/agents/${enc(agentId)}/contacts`,
      req,
    );
  }

  importContacts(agentId: string, req: ImportContactsRequest): Promise<ImportContactsResult> {
    return this.request("POST", `/api/v2/agents/${enc(agentId)}/contacts/import`, req);
  }

  listLeads(agentId: string, options: LeadListOptions = {}): Promise<Paginated<Lead>> {
    const params = new URLSearchParams();
    if (options.limit != null) params.set("limit", String(options.limit));
    if (options.cursor) params.set("cursor", options.cursor);
    if (options.createdAfter) params.set("createdAfter", options.createdAfter);
    if (options.createdBefore) params.set("createdBefore", options.createdBefore);
    const query = params.toString();
    return this.request("GET", `/api/v2/agents/${enc(agentId)}/leads${query ? `?${query}` : ""}`);
  }

  // ---- channels: Instagram (automations + conversation starters) ----
  //
  // Connect/OAuth is dashboard-only. Reads of a disconnected agent return
  // `{ connected:false }` from `getInstagram()`; the per-key GETs and every
  // PATCH need an integration row (404 INSTAGRAM_NOT_CONNECTED otherwise).

  /** GET /api/v2/agents/{agentId}/channels/instagram — connection + all automations + starters. */
  getInstagram(agentId: string): Promise<InstagramChannel> {
    return this.request("GET", `${igPath(agentId)}`);
  }

  /** GET .../channels/instagram/automations/{key} */
  getInstagramAutomation<K extends InstagramAutomationKey>(
    agentId: string,
    key: K,
  ): Promise<InstagramAutomation<K>> {
    return this.request("GET", `${igPath(agentId)}/automations/${enc(key)}`);
  }

  /** PATCH .../channels/instagram/automations/{key} — `{ config?, status? }` (at least one). */
  updateInstagramAutomation<K extends InstagramAutomationKey>(
    agentId: string,
    key: K,
    patch: InstagramAutomationUpdate<K>,
  ): Promise<InstagramAutomation<K>> {
    return this.request(
      "PATCH",
      `${igPath(agentId)}/automations/${enc(key)}`,
      patch,
    );
  }

  listInstagramAutomationInstances(
    agentId: string,
    key: InstagramAutomationInstanceKey,
  ): Promise<InstagramAutomationInstance[]> {
    return this.request("GET", `${igPath(agentId)}/automations/${enc(key)}/instances`);
  }

  createInstagramAutomationInstance(
    agentId: string,
    key: InstagramAutomationInstanceKey,
    req: CreateInstagramAutomationInstanceRequest,
  ): Promise<InstagramAutomationInstance> {
    return this.request("POST", `${igPath(agentId)}/automations/${enc(key)}/instances`, req);
  }

  getInstagramAutomationInstance(
    agentId: string,
    key: InstagramAutomationInstanceKey,
    id: string,
  ): Promise<InstagramAutomationInstance> {
    return this.request("GET", `${igPath(agentId)}/automations/${enc(key)}/instances/${enc(id)}`);
  }

  updateInstagramAutomationInstance(
    agentId: string,
    key: InstagramAutomationInstanceKey,
    id: string,
    patch: UpdateInstagramAutomationInstanceRequest,
  ): Promise<InstagramAutomationInstance> {
    return this.request("PATCH", `${igPath(agentId)}/automations/${enc(key)}/instances/${enc(id)}`, patch);
  }

  /** GET .../channels/instagram/conversation-starters */
  getConversationStarters(
    agentId: string,
  ): Promise<InstagramConversationStarters> {
    return this.request("GET", `${igPath(agentId)}/conversation-starters`);
  }

  /** PATCH .../channels/instagram/conversation-starters — `{ prompts?, status? }` (at least one). */
  updateConversationStarters(
    agentId: string,
    patch: InstagramConversationStartersUpdate,
  ): Promise<InstagramConversationStarters> {
    return this.request(
      "PATCH",
      `${igPath(agentId)}/conversation-starters`,
      patch,
    );
  }

  /** GET .../channels/instagram/menu */
  getInstagramMenu(agentId: string): Promise<InstagramMenu> {
    return this.request("GET", `${igPath(agentId)}/menu`);
  }

  /** PATCH .../channels/instagram/menu — `{ items?, status? }` (at least one). */
  updateInstagramMenu(
    agentId: string,
    patch: InstagramMenuUpdate,
  ): Promise<InstagramMenu> {
    return this.request("PATCH", `${igPath(agentId)}/menu`, patch);
  }

  /** POST .../channels/instagram/permissions/refresh — truthful token/grant/webhook re-verification. */
  refreshInstagramPermissions(
    agentId: string,
  ): Promise<InstagramPermissionsRefresh> {
    return this.request("POST", `${igPath(agentId)}/permissions/refresh`);
  }

  listManagementChannels(agentId: string): Promise<{ data: ManagementChannel[] }> {
    return this.managementRequest(`${managementPath(agentId)}/channels`, "GET");
  }
  getManagementChannel(agentId: string, channel: ManagementChannelId): Promise<ManagementChannelDetail> {
    return this.managementRequest(`${managementPath(agentId)}/channels/${enc(channel)}/config`, "GET");
  }
  updateManagementChannelOverride(agentId: string, channel: ManagementChannelId, request: ChannelOverrideRequest): Promise<ManagementChannelDetail> {
    return this.managementRequest(`${managementPath(agentId)}/channels/${enc(channel)}/config`, "PATCH", request);
  }
  updateWebPresentation(agentId: string, request: WebPresentationRequest): Promise<ManagementChannelDetail> {
    return this.managementRequest(`${managementPath(agentId)}/channels/web/presentation`, "PATCH", request);
  }
  getCenterStage(agentId: string): Promise<CenterStageView> {
    return this.managementRequest(`${managementPath(agentId)}/channels/center-stage`, "GET", undefined, true);
  }
  updateCenterStage(agentId: string, request: CenterStageRequest): Promise<CenterStageView> {
    return this.managementRequest(`${managementPath(agentId)}/channels/center-stage`, "PATCH", request, true);
  }

  /** Inbox reads accept account keys or explicit sessions; setup and writes remain session-only. */
  listEmails(agentId: string, options: EmailListOptions = {}): Promise<EmailPage<EmailThreadSummary>> { return this.request("GET", `${managementPath(agentId)}/emails${emailQuery(options)}`, undefined, this.key ? "key" : "session"); }
  getEmail(agentId: string, threadId: string): Promise<{ data: EmailThreadDetail }> { return this.request("GET", `${managementPath(agentId)}/emails/${enc(threadId)}`, undefined, this.key ? "key" : "session"); }
  async getEmailMessage(agentId: string, messageId: string): Promise<EmailMessage> {
    const { data } = await this.request<{ data: EmailMessage }>("GET", `${managementPath(agentId)}/emails/messages/${enc(messageId)}`, undefined, this.key ? "key" : "session");
    return data;
  }
  discardEmail(agentId: string, threadId: string, request: DiscardEmailRequest): Promise<EmailMutationResult> { return this.managementRequest(`${managementPath(agentId)}/emails/${enc(threadId)}/discard`, "POST", request, true); }
  restoreEmail(agentId: string, threadId: string, request: { expectedRevision: string }): Promise<EmailMutationResult> { return this.managementRequest(`${managementPath(agentId)}/emails/${enc(threadId)}/restore`, "POST", request, true); }
  draftEmail(agentId: string, threadId: string): Promise<EmailMutationResult> { return this.managementRequest(`${managementPath(agentId)}/emails/${enc(threadId)}/draft`, "POST", undefined, true); }
  forwardEmail(agentId: string, messageId: string, request: ForwardEmailRequest): Promise<EmailMutationResult> { return this.managementRequest(`${managementPath(agentId)}/emails/messages/${enc(messageId)}/forward`, "POST", request, true); }
  listEmailDrafts(agentId: string, options: Pick<EmailListOptions, "limit" | "cursor" | "since"> = {}): Promise<EmailPage<EmailDraft>> { return this.request("GET", `${managementPath(agentId)}/emails/drafts${emailQuery(options)}`, undefined, this.key ? "key" : "session"); }
  getEmailDraft(agentId: string, draftId: string): Promise<{ data: EmailDraft }> { return this.request("GET", `${managementPath(agentId)}/emails/drafts/${enc(draftId)}`, undefined, this.key ? "key" : "session"); }
  editEmailDraft(agentId: string, draftId: string, request: EditEmailDraftRequest): Promise<{ data: EmailDraft }> { return this.managementRequest(`${managementPath(agentId)}/emails/drafts/${enc(draftId)}`, "PATCH", request, true); }
  sendEmailDraft(agentId: string, draftId: string, request: { expectedRevision: string }): Promise<EmailMutationResult> { return this.managementRequest(`${managementPath(agentId)}/emails/drafts/${enc(draftId)}/send`, "POST", request, true); }
  getEmailSettings(agentId: string): Promise<{ data: EmailChannelData }> { return this.managementRequest(`${managementPath(agentId)}/email/settings`, "GET", undefined, true); }
  updateEmailSettings(agentId: string, request: EmailSettingsPatch): Promise<{ data: EmailChannelData }> { return this.managementRequest(`${managementPath(agentId)}/email/settings`, "PATCH", request, true); }
  enableEmailChannel(agentId: string, request: { address?: string } = {}): Promise<{ data: EmailChannelData }> { return this.managementRequest(`${managementPath(agentId)}/channels/email/enable`, "POST", request, true); }
  disableEmailChannel(agentId: string): Promise<{ data: EmailChannelData }> { return this.managementRequest(`${managementPath(agentId)}/channels/email/disable`, "POST", undefined, true); }
  getEmailReplyAddress(agentId: string): Promise<{ data: EmailChannelData }> { return this.managementRequest(`${managementPath(agentId)}/email/reply-address`, "GET", undefined, true); }
  addEmailReplyAddress(agentId: string, request: { address: string }): Promise<EmailReplyAddressResponse> { return this.managementRequest(`${managementPath(agentId)}/email/reply-address`, "PUT", request, true); }
  verifyEmailReplyAddress(agentId: string, request: { code: string }): Promise<EmailReplyAddressResponse> { return this.managementRequest(`${managementPath(agentId)}/email/reply-address/verify`, "POST", request, true); }
  removeEmailReplyAddress(agentId: string): Promise<{ data: EmailChannelData }> { return this.managementRequest(`${managementPath(agentId)}/email/reply-address`, "DELETE", undefined, true); }
  listEmailAutomatedSenders(agentId: string): Promise<{ data: string[] }> { return this.managementRequest(`${managementPath(agentId)}/email/automated-senders`, "GET", undefined, true); }
  addEmailAutomatedSender(agentId: string, request: { address: string }): Promise<{ data: string[] }> { return this.managementRequest(`${managementPath(agentId)}/email/automated-senders`, "POST", request, true); }
  removeEmailAutomatedSender(agentId: string, request: { address: string }): Promise<{ data: string[] }> { return this.managementRequest(`${managementPath(agentId)}/email/automated-senders`, "DELETE", request, true); }

  listCustomApiActions(agentId: string): Promise<{ data: CustomApiAction[] }> { return this.managementRequest(`${managementPath(agentId)}/actions`, "GET"); }
  getCustomApiAction(agentId: string, actionId: string): Promise<CustomApiAction> { return this.managementRequest(`${managementPath(agentId)}/actions/${enc(actionId)}`, "GET"); }
  createCustomApiAction(agentId: string, request: CreateCustomApiActionRequest): Promise<CustomApiAction> { return this.managementRequest(`${managementPath(agentId)}/actions`, "POST", request, true); }
  updateCustomApiAction(agentId: string, actionId: string, request: UpdateCustomApiActionRequest): Promise<CustomApiAction> { return this.managementRequest(`${managementPath(agentId)}/actions/${enc(actionId)}`, "PATCH", request, true); }
  setCustomApiActionStatus(agentId: string, actionId: string, request: SetCustomApiActionStatusRequest): Promise<CustomApiAction> { return this.managementRequest(`${managementPath(agentId)}/actions/${enc(actionId)}/status`, "PATCH", request, true); }
  deleteCustomApiAction(agentId: string, actionId: string, request: DeleteCustomApiActionRequest): Promise<{ deleted: true; id: string }> { return this.managementRequest(`${managementPath(agentId)}/actions/${enc(actionId)}`, "DELETE", request, true); }
  listAgentSecrets(agentId: string): Promise<{ data: SecretMetadata[] }> { return this.managementRequest(`${managementPath(agentId)}/secrets`, "GET"); }
  setAgentSecret(agentId: string, name: string, request: SetAgentSecretRequest): Promise<SecretMetadata> { return this.managementRequest(`${managementPath(agentId)}/secrets/${enc(name)}`, "PUT", request, true); }
  deleteAgentSecret(agentId: string, name: string): Promise<{ deleted: true; name: string }> { return this.managementRequest(`${managementPath(agentId)}/secrets/${enc(name)}`, "DELETE", undefined, true); }

  listWidgets(agentId: string): Promise<{ data: Widget[] }> { return this.managementRequest(`${managementPath(agentId)}/widgets`, "GET", undefined, true); }
  getWidget(agentId: string, widgetId: string): Promise<Widget> { return this.managementRequest(`${managementPath(agentId)}/widgets/${enc(widgetId)}`, "GET", undefined, true); }
  createWidget(agentId: string, request: CreateWidgetRequest): Promise<Widget> { return this.managementRequest(`${managementPath(agentId)}/widgets`, "POST", request, true); }
  saveWidgetDraft(agentId: string, widgetId: string, request: SaveWidgetDraftRequest): Promise<Widget> { return this.managementRequest(`${managementPath(agentId)}/widgets/${enc(widgetId)}`, "PATCH", request, true); }
  setWidgetStatus(agentId: string, widgetId: string, request: SetWidgetStatusRequest): Promise<{ status: "draft" | "archived" }> { return this.managementRequest(`${managementPath(agentId)}/widgets/${enc(widgetId)}/status`, "PATCH", request, true); }
  publishWidget(agentId: string, widgetId: string, request: PublishWidgetRequest): Promise<PublishedWidgetResult> { return this.managementRequest(`${managementPath(agentId)}/widgets/${enc(widgetId)}/publish`, "POST", request, true); }
  deleteWidget(agentId: string, widgetId: string): Promise<{ deleted: true }> { return this.managementRequest(`${managementPath(agentId)}/widgets/${enc(widgetId)}`, "DELETE", undefined, true); }
  duplicateWidget(agentId: string, widgetId: string): Promise<Widget> { return this.managementRequest(`${managementPath(agentId)}/widgets/${enc(widgetId)}/duplicate`, "POST", undefined, true); }
  exportWidget(agentId: string, widgetId: string): Promise<WidgetPackage> { return this.managementRequest(`${managementPath(agentId)}/widgets/${enc(widgetId)}/export`, "GET", undefined, true); }
  importWidget(agentId: string, request: ImportWidgetRequest): Promise<WidgetMutationResult> { return this.managementRequest(`${managementPath(agentId)}/widgets/import`, "POST", request, true); }
  listWidgetVersions(agentId: string, widgetId: string): Promise<WidgetVersionSummary[]> { return this.managementRequest(`${managementPath(agentId)}/widgets/${enc(widgetId)}/versions`, "GET", undefined, true); }
  getWidgetVersion(agentId: string, widgetId: string, versionId: string): Promise<WidgetVersion> { return this.managementRequest(`${managementPath(agentId)}/widgets/${enc(widgetId)}/versions/${enc(versionId)}`, "GET", undefined, true); }

  getBackstageOverview(agentId: string): Promise<BackstageOverview> { return this.managementRequest(`${managementPath(agentId)}/backstage/overview`, "GET"); }
  listBackstageSessions(agentId: string, options: Pick<ListOptions, "limit" | "cursor"> = {}): Promise<BackstageSessionList> { return this.managementRequest(`${managementPath(agentId)}/backstage/sessions${this.q(options)}`, "GET", undefined, true); }
  getBackstageSession(agentId: string, sessionId: string): Promise<BackstageSessionDetail> { return this.managementRequest(`${managementPath(agentId)}/backstage/sessions/${enc(sessionId)}`, "GET", undefined, true); }
  deleteBackstageSession(agentId: string, sessionId: string): Promise<{ deleted: true }> { return this.managementRequest(`${managementPath(agentId)}/backstage/sessions/${enc(sessionId)}`, "DELETE", undefined, true); }
  getBackstageChange(agentId: string, changeId: string): Promise<BackstageChange> { return this.managementRequest(`${managementPath(agentId)}/backstage/changes/${enc(changeId)}`, "GET", undefined, true); }
  decideBackstageChange(agentId: string, changeId: string, decision: BackstageDecision): Promise<BackstageChangeState> { return this.managementRequest(`${managementPath(agentId)}/backstage/changes/${enc(changeId)}`, "POST", { decision }, true); }
  chatBackstage(agentId: string, request: BackstageMessageRequest): AsyncGenerator<StreamEvent> { return this.managementStream(`${managementPath(agentId)}/backstage/chat`, request); }
}

function managementPath(agentId: string): string { return `/api/v2/agents/${enc(agentId)}`; }

function igPath(agentId: string): string {
  return `/api/v2/agents/${enc(agentId)}/channels/instagram`;
}

function enc(segment: string): string {
  return encodeURIComponent(segment);
}
