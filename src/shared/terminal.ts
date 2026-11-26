/**
 * Terminal output is data, not instructions. Customer conversations, email
 * subjects and bodies, agent names and API error text can contain ANSI/OSC
 * escapes, carriage returns, 8-bit C1 controls or bidirectional overrides.
 * Neutralize them before anything reaches a terminal so a stored message
 * cannot rewrite the display, set the clipboard or spoof a prompt.
 *
 * JSON output must stay parseable, so instead of deleting characters it
 * escapes the same code points as \\uXXXX. JSON.stringify already escapes C0
 * controls, but it leaves C1 controls and bidi formatting characters raw.
 */
const TERMINAL_CONTROLS =
  /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u061C\u200E\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069]/g;
const JSON_CONTROLS =
  /[\u007F-\u009F\u061C\u200E\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069]/g;

export function terminalText(value: string): string {
  return value.replace(TERMINAL_CONTROLS, "");
}

function escapeJsonControls(text: string): string {
  return text.replace(
    JSON_CONTROLS,
    character => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/** Serialize JSON without emitting terminal-sensitive code points. */
export function safeJson(value: unknown, space?: number): string {
  const text = JSON.stringify(value, null, space);
  return text === undefined ? "null" : escapeJsonControls(text);
}

export function printLine(value: string): void {
  process.stdout.write(`${terminalText(value)}\n`);
}

export function printErrorLine(value: string): void {
  process.stderr.write(`${terminalText(value)}\n`);
}

export function printJsonLine(value: unknown, space?: number): void {
  process.stdout.write(`${safeJson(value, space)}\n`);
}

export function printJsonErrorLine(value: unknown): void {
  process.stderr.write(`${safeJson(value)}\n`);
}
