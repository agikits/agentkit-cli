import { readFile } from "node:fs/promises";
import { Command, InvalidArgumentError } from "commander";
import { AgentkitError } from "../sdk/errors.js";
import type { AgentkitClient } from "../sdk/client.js";
import { emailQuery } from "../sdk/email.js";
import type { EmailListOptions, EmailSettingsPatch } from "../sdk/email.js";

type Resolve = (project: string) => Promise<{ agentId: string; client: AgentkitClient }>;
type Print = (value: unknown) => void;
const option = (command: Command) => command.option("--json", "Print JSON output");
function limit(value: string): number {
  if (!/^[1-9][0-9]*$/.test(value) || Number(value) > 100) throw new InvalidArgumentError("must be 1-100");
  return Number(value);
}
function since(value: string): string { emailQuery({ since: value }); return value; }
function cursor(value: string): string { emailQuery({ cursor: value }); return value; }
function status(value: string): EmailListOptions["status"] {
  if (!["all", "to_review", "sent", "discarded"].includes(value)) throw new InvalidArgumentError("must be all, to_review, sent or discarded");
  return value as EmailListOptions["status"];
}
function onOff(value: string): boolean {
  if (value === "on") return true;
  if (value === "off") return false;
  throw new InvalidArgumentError("must be on or off");
}
function address(value: string): string {
  if (value.length > 254 || !/^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/.test(value)) throw new InvalidArgumentError("must be an email address");
  return value;
}
function localPart(value: string): string {
  if (!/^[a-z0-9][a-z0-9._-]{0,62}[a-z0-9]$/.test(value) && !/^[a-z0-9]$/.test(value)) throw new InvalidArgumentError("must be a 1-64 character lowercase inbox local part");
  return value;
}
function uuid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new InvalidArgumentError("must be a UUID");
  return value;
}
function revision(value: string): string {
  if (!/^\d+$/.test(value) || value.length > 200) throw new InvalidArgumentError("must be the revision from the reviewed detail");
  return value;
}
async function fileText(file: string): Promise<string> {
  if (file !== "-") return readFile(file, "utf8");
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
function mutation(print: Print, value: { status?: string }): void {
  if (value.status !== undefined && !["sent", "already_sent", "forwarded", "already_forwarded", "discarded", "restored", "drafted", "already_verified"].includes(value.status)) throw new AgentkitError({ code: "EMAIL_OPERATION_INCOMPLETE", message: `Email operation returned ${value.status}. Read back before retrying.`, status: 200, details: value });
  print(value);
}

export function registerEmailCommands(program: Command, resolve: Resolve, resolveRead: Resolve, print: Print): void {
  const emails = program.commands.find(command => command.name() === "emails")!;
  emails.hook("preAction", (parent, child) => {
    if (parent === child) return;
    for (const opt of child.options) {
      const key = opt.attributeName();
      if (parent.getOptionValueSource(key) !== "cli" || child.getOptionValueSource(key) === "cli") continue;
      const value = parent.getOptionValue(key);
      child.setOptionValueWithSource(key, opt.parseArg ? opt.parseArg(String(value), undefined) : value, "cli");
    }
  });
  option(emails.command("list <project>").description("Read all inbox partitions without marking messages read"))
    .option("--status <status>", "Inbox partition", status, "all")
    .option("--since <datetime>", "Activity since RFC3339 timestamp", since)
    .option("--limit <n>", "Page size (1-100)", limit)
    .option("--cursor <cursor>", "Filter-bound cursor from nextCursor", cursor)
    .action(async (project: string, opts: EmailListOptions) => { const { agentId, client } = await resolveRead(project); print(await client.listEmails(agentId, opts)); });
  option(emails.command("get <project> <threadId>").description("Read complete stored bodies, headers, reasons, drafts and revisions"))
    .action(async (project: string, threadId: string) => { const { agentId, client } = await resolveRead(project); print(await client.getEmail(agentId, threadId)); });
  option(emails.command("discard <project> <threadId>").description("Discard the reviewed inbound and pending draft"))
    .requiredOption("--inbound-message-id <id>", "Inbound message ID from the reviewed detail")
    .option("--draft-id <id>", "Pending draft ID from the reviewed detail")
    .option("--draft-edited-at <datetime>", "Pending draft editedAt from the reviewed detail", since)
    .action(async (project: string, threadId: string, opts: { inboundMessageId: string; draftId?: string; draftEditedAt?: string }) => {
      if (opts.draftEditedAt && !opts.draftId) throw new Error("--draft-edited-at requires --draft-id.");
      const { agentId, client } = await resolve(project);
      mutation(print, await client.discardEmail(agentId, threadId, { inboundMessageId: opts.inboundMessageId, draftId: opts.draftId ?? null, draftEditedAt: opts.draftEditedAt ?? null }));
    });
  option(emails.command("restore <project> <threadId>").description("Restore into review without generating or sending a reply"))
    .requiredOption("--expected-revision <revision>", "Reviewed thread revision", since)
    .action(async (project: string, threadId: string, opts: { expectedRevision: string }) => { const { agentId, client } = await resolve(project); mutation(print, await client.restoreEmail(agentId, threadId, { expectedRevision: opts.expectedRevision })); });
  option(emails.command("draft <project> <threadId>").description("Request a review draft without auto-send"))
    .action(async (project: string, threadId: string) => { const { agentId, client } = await resolve(project); mutation(print, await client.draftEmail(agentId, threadId)); });
  option(emails.command("forward <project> <messageId>").description("Forward once; read back using the same submission identity after timeout"))
    .requiredOption("--to <address>", "Destination address", address)
    .requiredOption("--submission-id <uuid>", "Stable delivery identity for this forward", uuid)
    .option("--note-file <file>", "UTF-8 note; use - for stdin")
    .action(async (project: string, messageId: string, opts: { to: string; submissionId: string; noteFile?: string }) => { const note = opts.noteFile === undefined ? undefined : await fileText(opts.noteFile); if (note !== undefined && note.length > 4000) throw new Error("Forward note must contain at most 4000 characters."); const { agentId, client } = await resolve(project); mutation(print, await client.forwardEmail(agentId, messageId, { to: opts.to, submissionId: opts.submissionId, ...(note !== undefined ? { note } : {}) })); });
  option(emails.command("send <project> <draftId>").description("Approve and send the reviewed revision; no automatic retry"))
    .requiredOption("--expected-revision <revision>", "Reviewed draft revision", revision)
    .action(async (project: string, draftId: string, opts: { expectedRevision: string }) => { const { agentId, client } = await resolve(project); mutation(print, await client.sendEmailDraft(agentId, draftId, { expectedRevision: opts.expectedRevision })); });
  const drafts = emails.command("drafts").description("Read and edit pending reply drafts");
  option(drafts.command("list <project>"))
    .option("--limit <n>", "Page size (1-100)", limit).option("--cursor <cursor>", "Pagination cursor", cursor).option("--since <datetime>", "Drafts generated since RFC3339 timestamp", since)
    .action(async (project: string, opts: Pick<EmailListOptions, "limit" | "cursor" | "since">) => { const { agentId, client } = await resolveRead(project); print(await client.listEmailDrafts(agentId, opts)); });
  option(drafts.command("get <project> <draftId>"))
    .action(async (project: string, draftId: string) => { const { agentId, client } = await resolveRead(project); print(await client.getEmailDraft(agentId, draftId)); });
  option(drafts.command("edit <project> <draftId>"))
    .requiredOption("--body-file <file>", "UTF-8 reply text; use - for stdin").option("--subject <text>", "Replacement subject")
    .requiredOption("--expected-revision <revision>", "Reviewed draft revision", revision)
    .action(async (project: string, draftId: string, opts: { bodyFile: string; subject?: string; expectedRevision: string }) => { const bodyText = await fileText(opts.bodyFile); if (!bodyText.trim() || bodyText.length > 12000) throw new Error("Draft body must contain 1-12000 characters."); if (opts.subject !== undefined && (!opts.subject.trim() || opts.subject.length > 300)) throw new Error("Draft subject must contain 1-300 characters."); const { agentId, client } = await resolve(project); print(await client.editEmailDraft(agentId, draftId, { bodyText, expectedRevision: opts.expectedRevision, ...(opts.subject !== undefined ? { subject: opts.subject } : {}) })); });
  const email = program.commands.find(command => command.name() === "email")!;
  option(email.command("settings <project>").description("Read settings or patch only supplied flags"))
    .option("--auto-send <on|off>", "Automatic delivery", onOff).option("--signature <on|off>", "Include signature", onOff)
    .option("--signature-file <file>", "UTF-8 plain text; an empty file clears text; use - for stdin")
    .option("--display-name <name>", "Inbox display name")
    .action(async (project: string, opts: { autoSend?: boolean; signature?: boolean; signatureFile?: string; displayName?: string }) => {
      const patch: EmailSettingsPatch = { ...(opts.autoSend !== undefined ? { autoSendEnabled: opts.autoSend } : {}), ...(opts.signature !== undefined ? { signatureEnabled: opts.signature } : {}), ...(opts.displayName !== undefined ? { displayName: opts.displayName } : {}), ...(opts.signatureFile !== undefined ? { signatureHtml: await fileText(opts.signatureFile) } : {}) };
      if (patch.signatureHtml !== undefined && patch.signatureHtml.length > 2000) throw new Error("Signature must contain at most 2000 characters.");
      if (patch.displayName !== undefined && (!patch.displayName.trim() || patch.displayName.length > 120)) throw new Error("Display name must contain 1-120 characters.");
      const { agentId, client } = await resolve(project); print(Object.keys(patch).length ? await client.updateEmailSettings(agentId, patch) : await client.getEmailSettings(agentId));
    });
  const routing = email.command("reply-address").description("Manage the single inbox reply-routing address");
  option(routing.command("status <project>")).action(async (project: string) => { const { agentId, client } = await resolve(project); print(await client.getEmailReplyAddress(agentId)); });
  option(routing.command("add <project> <address>"))
    .action(async (project: string, value: string) => { const { agentId, client } = await resolve(project); mutation(print, await client.addEmailReplyAddress(agentId, { address: address(value) })); });
  option(routing.command("verify <project> <code>"))
    .action(async (project: string, code: string) => { if (!/^\d{6}$/.test(code)) throw new Error("Verification code must contain six digits."); const { agentId, client } = await resolve(project); const result = await client.verifyEmailReplyAddress(agentId, { code }); if (!result.verified) throw new AgentkitError({ code: "EMAIL_VERIFICATION_FAILED", message: "Reply address was not verified.", status: 200, details: result }); print(result); });
  option(routing.command("remove <project>"))
    .action(async (project: string) => { const { agentId, client } = await resolve(project); print(await client.removeEmailReplyAddress(agentId)); });
  const senders = email.command("automated-senders").description("Exact From-address preferences for review; future mail only");
  option(senders.command("list <project>"))
    .action(async (project: string) => { const { agentId, client } = await resolve(project); print(await client.listEmailAutomatedSenders(agentId)); });
  for (const operation of ["add", "remove"] as const) option(senders.command(`${operation} <project> <address>`))
    .action(async (project: string, value: string) => { const sender = address(value); const { agentId, client } = await resolve(project); print(await (operation === "add" ? client.addEmailAutomatedSender(agentId, { address: sender }) : client.removeEmailAutomatedSender(agentId, { address: sender }))); });
  const channels = program.commands.find(command => command.name() === "channels")!;
  option(channels.command("enable <project> <channel>").description("Enable the email inbox; an existing inbox keeps its address"))
    .option("--address <local-part>", "First-time inbox local part", localPart)
    .action(async (project: string, channel: string, opts: { address?: string }) => { if (channel !== "email") throw new Error("Only the email channel supports this command."); const { agentId, client } = await resolve(project); print(await client.enableEmailChannel(agentId, opts.address === undefined ? {} : { address: opts.address })); });
  option(channels.command("disable <project> <channel>").description("Disable email while preserving inbox history"))
    .action(async (project: string, channel: string) => { if (channel !== "email") throw new Error("Only the email channel supports this command."); const { agentId, client } = await resolve(project); print(await client.disableEmailChannel(agentId)); });
}
