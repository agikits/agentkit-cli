import type { EmailThreadDetail, EmailThreadSummary } from "../sdk/types.js";

export function emailReviewReason(
  reason: EmailThreadSummary["discardReason"], source: string | null,
): string {
  if (!reason) return source ?? "No discard reason was recorded";
  return Object.entries(reason).map(([key, value]) =>
    `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`,
  ).join("; ");
}

/** Keep HTML-only replies readable without printing markup or script/style content. */
function messageText(text: string | null, html: string | null): string {
  if (text?.trim()) return text;
  if (!html) return "[No message body]";
  const entities: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    ndash: "–", mdash: "—", hellip: "…", copy: "©", reg: "®",
  };
  return html
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, "")
    .replace(/<br\b[^>]*>|<\/(?:p|div|li|h[1-6]|tr|blockquote|pre)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (!entity.startsWith("#")) return entities[entity.toLowerCase()] ?? match;
      const codePoint = entity[1]?.toLowerCase() === "x"
        ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      return codePoint > 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
        ? String.fromCodePoint(codePoint) : match;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() || "[No message body]";
}

export function printEmailThread(thread: EmailThreadDetail): void {
  console.log(`# ${thread.subject} (${thread.id})`);
  console.log(`Status: ${thread.status}`);
  if (thread.discarded) console.log(`Review reason: ${emailReviewReason(thread.discardReason, thread.discardSource)}`);
  for (const message of thread.messages) {
    const draft = thread.drafts.find(row => row.id === message.draftId);
    const state = message.direction === "outbound"
      ? draft?.deliveryStatus ?? (message.providerEmailId ? "sent" : "unknown") : "received";
    console.log(`\n[${state} ${message.id}]`);
    console.log(`From: ${message.fromAddress}`);
    console.log(`To: ${message.toAddresses.join(", ")}`);
    if (message.ccAddresses.length) console.log(`Cc: ${message.ccAddresses.join(", ")}`);
    if (message.bccAddresses.length) console.log(`Bcc: ${message.bccAddresses.join(", ")}`);
    console.log(`Subject: ${message.subject}`);
    console.log(`Time: ${message.createdAt}`);
    if (message.discardReason) console.log(`Review reason: ${emailReviewReason(message.discardReason, null)}`);
    console.log(`\n${messageText(message.text, message.html)}`);
  }
  for (const draft of thread.drafts) {
    console.log(`\n[draft ${draft.id}]`);
    console.log(`State: ${draft.status} (${draft.deliveryStatus})`);
    console.log(`To: ${thread.customerEmail}`);
    console.log(`Subject: ${draft.subject}`);
    console.log(`Time: ${draft.sentAt ?? draft.editedAt ?? draft.generatedAt}`);
    if (draft.reviewReason) console.log(`Review reason: ${draft.reviewReason}`);
    console.log(`\n${draft.bodyText}`);
  }
}
