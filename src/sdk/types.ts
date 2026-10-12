/** REST types derive from the reviewed contracts/openapi.json snapshot. */
import type { components } from "./generated.js";
type Schemas = components["schemas"];
export type TextPart = Schemas["TextPart"];
export type ConversationSummary = Schemas["Conversation"];
export type Message = Schemas["Message"];
export type ConversationDetail = Schemas["ConversationWithMessages"];
export type Pagination = Schemas["Pagination"];
export type HealthResult = Schemas["Health"];
export type AiSettings = Schemas["AiSettings"];
export type AiUpdate = Schemas["UpdateAiSettingsRequest"];
export type DesignSettings = Schemas["DesignSettings"];
export type DesignUpdate = Schemas["UpdateDesignSettingsRequest"];
export type SecuritySettings = Schemas["SecuritySettings"];
export type SecurityUpdate = Schemas["UpdateSecuritySettingsRequest"];
export type NotificationSettings = Schemas["NotificationSettings"];
export type NotificationUpdate = Schemas["UpdateNotificationSettingsRequest"];
export type TrainingSettings = Schemas["TrainingSettings"];
export type AgentSettings = Schemas["AgentSettings"];
export type AgentSummary = Schemas["Agent"];
export type CreateAgentRequest = Schemas["CreateAgentRequest"];
export type UpdateAgentRequest = Schemas["UpdateAgentRequest"];
export type SourceDocument = Schemas["Source"];
export type AddTextSource = Schemas["CreateTextSourceRequest"];
export type AddQnaSource = Schemas["CreateQnaSourceRequest"];
export type AddUrlSource = Schemas["CreateUrlSourceRequest"];
export type CreatedSource = Schemas["DocumentCreated"];
export type UrlSourceJob = Schemas["UrlSourceJob"];
export type CreateFileUploadUrlsRequest = Schemas["CreateFileUploadUrlsRequest"];
export type FileUploadUrls = Schemas["FileUploadUrls"];
export type RegisterFilesRequest = Schemas["RegisterFilesRequest"];
export type TrainStatus = Schemas["TrainingStatus"];
export type Contact = Schemas["Contact"];
export type CreateContactRequest = Schemas["UpsertContactRequest"];
export type ImportContactsRequest = Schemas["ImportContactsRequest"];
export type ImportContactsResult = Schemas["ImportContactsResult"];
export type Lead = Schemas["Lead"];
export type LeadListOptions = Pick<ListOptions, "limit" | "cursor"> & { createdAfter?: string; createdBefore?: string };
export type { EmailThreadList, EmailThreadSummary, EmailThreadDetail, EmailDraftList, EmailDraft, EmailMessage, EmailStatus, EmailListOptions } from "./email.js";
export type ToolResultRequest = Schemas["ToolResultRequest"];
export type InstagramLink = Schemas["InstagramLink"];
export type InstagramIntentRow = Schemas["InstagramIntent"];
export type RespondToDmsConfig = Schemas["RespondToDmsConfig"];
export type CommentToDmConfig = Schemas["CommentToDmConfig"];
export type StoryLeadsConfig = Schemas["StoryLeadsConfig"];
export type StoryMentionsConfig = Schemas["StoryMentionsConfig"];
export type InstagramStarterPrompt = Schemas["InstagramConversationStarter"];
export type InstagramConversationStarters = Schemas["InstagramConversationStarters"];
export type InstagramConversationStartersUpdate = Schemas["UpdateInstagramConversationStartersRequest"];
export type InstagramLoginKind = Schemas["InstagramLoginKind"];
export type InstagramPermissionsRefresh = Schemas["InstagramPermissionRefresh"];
export type InstagramMenuItem = Schemas["InstagramMenuItem"];
export type InstagramMenu = Schemas["InstagramMenu"];
export type InstagramMenuUpdate = Schemas["UpdateInstagramMenuRequest"];
export type InstagramAutomationInstanceKey = Schemas["InstagramAutomationInstance"]["key"];
export type InstagramAutomationInstance = Schemas["InstagramAutomationInstance"];
export type CreateInstagramAutomationInstanceRequest = Schemas["CreateInstagramAutomationInstanceRequest"];
export type UpdateInstagramAutomationInstanceRequest = Schemas["UpdateInstagramAutomationInstanceRequest"];
export type ManagementChannelId = Schemas["ManagementChannel"]["id"];
export type ManagementChannel = Schemas["ManagementChannel"];
export type ManagementChannelDetail = Schemas["ManagementChannelDetail"];
export type ChannelOverrideRequest = Schemas["ChannelOverrideRequest"];
export type WebPresentationRequest = Schemas["WebPresentationRequest"];
export type CenterStageView = Schemas["CenterStageView"];
export type CenterStageRequest = Schemas["CenterStageRequest"];
export type Widget = Schemas["Widget"];
export type WidgetDraft = Schemas["WidgetDraft"];
export type CreateWidgetRequest = Schemas["CreateWidgetRequest"];
export type SaveWidgetDraftRequest = Schemas["SaveWidgetDraftRequest"];
export type SetWidgetStatusRequest = Schemas["SetWidgetStatusRequest"];
export type PublishWidgetRequest = Schemas["PublishWidgetRequest"];
export type PublishedWidgetResult = Schemas["PublishedWidgetResult"];
export type WidgetVersion = Schemas["WidgetVersion"];
export type WidgetVersionSummary = Schemas["WidgetVersionSummary"];
export type WidgetPackage = Schemas["WidgetPackage"];
export type WidgetMutationResult = Schemas["WidgetMutationResult"];
export type ImportWidgetRequest = Schemas["ImportWidgetRequest"];
export type BackstageOverview = Schemas["BackstageOverview"];
export type BackstageSession = Schemas["BackstageSession"];
export type BackstageSessionList = Schemas["BackstageSessionList"];
export type BackstageSessionDetail = Schemas["BackstageSessionDetail"];
export type BackstageChange = Schemas["BackstageChange"];
export type BackstageChangeState = Schemas["BackstageChangeState"];
export type BackstageDecision = Schemas["BackstageDecisionRequest"]["decision"];
export type BackstageMessageRequest = Schemas["BackstageMessageRequest"];
export type CustomApiAction = Schemas["CustomApiAction"];
export type CreateCustomApiActionRequest = Schemas["CreateCustomApiActionRequest"];
export type UpdateCustomApiActionRequest = Schemas["UpdateCustomApiActionRequest"];
export type SetCustomApiActionStatusRequest = Schemas["SetCustomApiActionStatusRequest"];
export type DeleteCustomApiActionRequest = Schemas["DeleteCustomApiActionRequest"];
export type SecretMetadata = Schemas["SecretMetadata"];
export type SetAgentSecretRequest = Schemas["SetAgentSecretRequest"];

export type Role = Message["role"];
export type Feedback = Schemas["FeedbackRequest"]["feedback"];
export type Paginated<T> = { data: T[]; pagination: Pagination };
export type ChatResult = Schemas["ChatResponse"]["data"];
export type ChatMetadata = ChatResult["metadata"];
export type ChatRequest = Omit<Schemas["ChatRequest"], "stream" | "channel"> &
  Partial<Pick<Schemas["ChatRequest"], "channel">>;
export type PendingToolCall = NonNullable<ChatResult["pendingToolCall"]>;
/** all includes API, API Playground, and widget chats, not other channels. */
export type ConversationSource = "api_v2" | "playground" | "widget" | "all";
export type ListOptions = { limit?: number; cursor?: string; source?: ConversationSource };
export type StreamMetadata = Omit<ChatMetadata, "userMessageId"> & { type: "message-metadata"; messageId: string | null };
export type StreamToolCall = PendingToolCall & { type: "tool-call" };
export type StreamError = { type: "error"; error: { code: string } };
export type StreamEvent =
  | { type: "message-start"; messageId: string }
  | { type: "text-start"; id: string }
  | { type: "text-delta"; id: string; delta: string }
  | { type: "text-end"; id: string }
  | StreamMetadata | StreamToolCall | StreamError
  | { type: "finish"; finishReason: string }
  | { type: "done" }
  | { type: string; [key: string]: unknown };

export const INSTAGRAM_AUTOMATION_KEYS = ["respond_to_dms", "comment_to_dm", "story_leads", "story_mentions"] as const;
export type InstagramAutomationKey = typeof INSTAGRAM_AUTOMATION_KEYS[number];
export type InstagramAutomationStatus = "draft" | "live" | "off";
export type InstagramAutomationConfigByKey = {
  respond_to_dms: RespondToDmsConfig;
  comment_to_dm: CommentToDmConfig;
  story_leads: StoryLeadsConfig;
  story_mentions: StoryMentionsConfig;
};
export type InstagramAutomationConfig = InstagramAutomationConfigByKey[InstagramAutomationKey];
export type InstagramAutomation<K extends InstagramAutomationKey = InstagramAutomationKey> = {
  key: K; status: InstagramAutomationStatus; config: InstagramAutomationConfigByKey[K];
};
export type InstagramAutomationUpdate<K extends InstagramAutomationKey = InstagramAutomationKey> = {
  config?: InstagramAutomationConfigByKey[K]; status?: InstagramAutomationStatus;
};
export type InstagramAskEmailFields = Pick<RespondToDmsConfig, "askEmailEnabled" | "askEmailPrompt" | "askEmailRetryMessage" | "askEmailConfirmMessage">;
export type InstagramIntegrationStatus = "connected" | "disabled" | "reconnect_required";
// Runtime auth can report unknown scopes as null; see contracts/README.md.
export type InstagramChannelConnected = Omit<Extract<Schemas["InstagramChannel"], { connected: true }>, "scopes"> & { scopes: string[] | null };
export type InstagramChannel = { connected: false } | InstagramChannelConnected;

export const DESIGN_LIMITS = {
  initialMessages: { max: 5, maxLength: 140 },
  prompts: { max: 4, maxLength: 80 },
  messagePlaceholderMaxLength: 100,
} as const;

export const INSTAGRAM_STARTER_LIMITS = {
  prompts: { max: 4 },
  questionMaxLength: 80,
  messageMaxLength: 640,
  linksMax: 3,
} as const;

export const INSTAGRAM_MENU_LIMITS = {
  maxItems: 5,
  maxTitleLength: 30,
  maxReplyLength: 1000,
} as const;
