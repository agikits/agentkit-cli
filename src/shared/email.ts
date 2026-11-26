import type { EmailThreadDetail, EmailThreadSummary } from "../sdk/types.js";
import { printLine } from "./terminal.js";

export function emailReviewReason(
  reason: EmailThreadSummary["discardReason"], source: string | null,
): string {
  if (!reason) return source ?? "No discard reason was recorded";
  return Object.entries(reason).map(([key, value]) =>
    `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`,
  ).join("; ");
}

/** Remove paired blocks without backtracking over the remaining document. */
function stripPairs(html: string, open: string, close: string): string {
  let result = "";
  let index = 0;
  for (;;) {
    const start = html.indexOf(open, index);
    if (start === -1) return result + html.slice(index);
    const end = html.indexOf(close, start + open.length);
    if (end === -1) return result + html.slice(index, start);
    result += html.slice(index, start);
    index = end + close.length;
  }
}

/** Drop script/style blocks; an unclosed block is discarded rather than printed. */
function stripTagBlocks(html: string, tag: "script" | "style"): string {
  // ASCII-only folding keeps index offsets aligned; Unicode lowercasing can
  // expand a character (for example U+0130 becomes two code units).
  const lower = html.replace(/[A-Z]/g, character => character.toLowerCase());
  const open = `<${tag}`;
  const close = `</${tag}`;
  let result = "";
  let index = 0;
  for (;;) {
    const start = lower.indexOf(open, index);
    if (start === -1) return result + html.slice(index);
    const boundary = lower[start + open.length];
    if (boundary !== undefined && !/[\s>/]/.test(boundary)) {
      result += html.slice(index, start + open.length);
      index = start + open.length;
      continue;
    }
    const openEnd = html.indexOf(">", start + open.length);
    if (openEnd === -1) return result + html.slice(index, start);
    const closeStart = lower.indexOf(close, openEnd + 1);
    if (closeStart === -1) return result + html.slice(index, start);
    const closeEnd = html.indexOf(">", closeStart + close.length);
    if (closeEnd === -1) return result + html.slice(index, start);
    result += html.slice(index, start);
    index = closeEnd + 1;
  }
}

/** Trim trailing spaces and tabs in linear time; a `[ \t]+$` regex backtracks. */
function trimTrailing(line: string): string {
  let end = line.length;
  while (end > 0 && (line[end - 1] === " " || line[end - 1] === "\t")) end--;
  return line.slice(0, end);
}

/** Keep HTML-only replies readable without printing markup or script/style content. */
export function messageText(text: string | null, html: string | null): string {
  if (text?.trim()) return text;
  if (!html) return "[No message body]";
  const entities: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    ndash: "–", mdash: "—", hellip: "…", copy: "©", reg: "®",
  };
  const withoutBlocks = stripTagBlocks(stripTagBlocks(stripPairs(html, "<!--", "-->"), "script"), "style");
  return withoutBlocks
    .replace(/<br\b[^<>]*>|<\/(?:p|div|li|h[1-6]|tr|blockquote|pre)>/gi, "\n")
    // `[^<>]` keeps this linear on unclosed "<" runs; `[^>]` is quadratic there.
    .replace(/<[^<>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (!entity.startsWith("#")) return entities[entity.toLowerCase()] ?? match;
      const codePoint = entity[1]?.toLowerCase() === "x"
        ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      return codePoint > 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
        ? String.fromCodePoint(codePoint) : match;
    })
    .split("\n").map(trimTrailing).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() || "[No message body]";
}

export function printEmailThread(thread: EmailThreadDetail): void {
  printLine(`# ${thread.subject} (${thread.id})`);
  printLine(`Status: ${thread.status}`);
  if (thread.discarded) printLine(`Review reason: ${emailReviewReason(thread.discardReason, thread.discardSource)}`);
  for (const message of thread.messages) {
    const draft = thread.drafts.find(row => row.id === message.draftId);
    const state = message.direction === "outbound"
      ? draft?.deliveryStatus ?? (message.providerEmailId ? "sent" : "unknown") : "received";
    printLine(`\n[${state} ${message.id}]`);
    printLine(`From: ${message.fromAddress}`);
    printLine(`To: ${message.toAddresses.join(", ")}`);
    if (message.ccAddresses.length) printLine(`Cc: ${message.ccAddresses.join(", ")}`);
    if (message.bccAddresses.length) printLine(`Bcc: ${message.bccAddresses.join(", ")}`);
    printLine(`Subject: ${message.subject}`);
    printLine(`Time: ${message.createdAt}`);
    if (message.discardReason) printLine(`Review reason: ${emailReviewReason(message.discardReason, null)}`);
    printLine(`\n${messageText(message.text, message.html)}`);
  }
  for (const draft of thread.drafts) {
    printLine(`\n[draft ${draft.id}]`);
    printLine(`State: ${draft.status} (${draft.deliveryStatus})`);
    printLine(`To: ${thread.customerEmail}`);
    printLine(`Subject: ${draft.subject}`);
    printLine(`Time: ${draft.sentAt ?? draft.editedAt ?? draft.generatedAt}`);
    if (draft.reviewReason) printLine(`Review reason: ${draft.reviewReason}`);
    printLine(`\n${draft.bodyText}`);
  }
}
