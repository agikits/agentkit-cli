/** Inbox reads accept account keys or explicit sessions; email setup and writes require a session. */
export type EmailListOptions = { status?: "all" | "to_review" | "sent" | "discarded"; since?: string; limit?: number; cursor?: string };
import type { components } from "./generated.js";
type Schemas = components["schemas"];
export type EmailThreadList = Schemas["EmailThreadList"];
export type EmailDraftList = Schemas["EmailDraftList"];
export type EmailMessage = Schemas["EmailMessageDetail"]["data"];
export type EmailStatus = NonNullable<EmailListOptions["status"]>;
export type EmailThreadSummary = Schemas["EmailThreadList"]["data"][number];
export type EmailThreadDetail = Schemas["EmailThreadDetail"]["data"];
export type EmailDraft = Schemas["EmailDraftDetail"]["data"];
export type EmailPage<T> = { data: T[]; pagination: Schemas["EmailThreadList"]["pagination"] };
export type EmailSettingsPatch = Schemas["EmailSettingsRequest"];
export type EmailChannelData = Schemas["EmailChannelResponse"]["data"];
export type EmailReplyAddressResponse = Schemas["EmailReplyAddressResponse"];
export type EmailMutationResult = Schemas["EmailMutationResponse"];
export type DiscardEmailRequest = Schemas["EmailDiscardRequest"];
// The server supplies the default note; callers may omit it.
export type ForwardEmailRequest = Omit<Schemas["EmailForwardRequest"], "note"> & Partial<Pick<Schemas["EmailForwardRequest"], "note">>;
export type EditEmailDraftRequest = Schemas["EmailEditRequest"];

export function emailQuery(options: EmailListOptions = {}): string {
  const params = new URLSearchParams();
  if (options.status !== undefined) {
    if (!["all", "to_review", "sent", "discarded"].includes(options.status)) throw new Error("Invalid email status.");
    params.set("status", options.status);
  }
  if (options.since !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(options.since) || !Number.isFinite(Date.parse(options.since)) || new Date(`${options.since.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== options.since.slice(0, 10)) throw new Error("since must be an RFC3339 timestamp.");
    params.set("since", options.since);
  }
  if (options.limit !== undefined) {
    if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100) throw new Error("Email page limit must be 1-100.");
    params.set("limit", String(options.limit));
  }
  if (options.cursor !== undefined) {
    if (!options.cursor || options.cursor.length > 2048) throw new Error("Email cursor must contain 1-2048 characters.");
    params.set("cursor", options.cursor);
  }
  return params.size ? `?${params}` : "";
}
