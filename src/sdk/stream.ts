import { AgentkitError } from "./errors.js";
import type { StreamEvent } from "./types.js";
export const SSE_DONE = "[DONE]";
const MAX_FRAME_CHARS = 1_048_576;
function protocolError(message: string): AgentkitError {
  return new AgentkitError({ code: "STREAM_INVALID_FRAME", message, status: 200 });
}
export function parseSseBuffer(buffer: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = [];
  const normalized = buffer.replace(/\r\n/g, "\n");
  const lastBoundary = normalized.lastIndexOf("\n\n");
  if (lastBoundary === -1) {
    if (buffer.length > MAX_FRAME_CHARS) throw protocolError("Stream frame exceeds the size limit.");
    return { events, rest: buffer };
  }
  const rest = normalized.slice(lastBoundary + 2);
  for (const frame of normalized.slice(0, lastBoundary).split("\n\n")) {
    if (frame.length > MAX_FRAME_CHARS) throw protocolError("Stream frame exceeds the size limit.");
    const payload = frame.split("\n").filter(line => line.startsWith("data:"))
      .map(line => line.slice(5).trimStart()).join("\n").trim();
    if (!payload) continue;
    if (payload === SSE_DONE) { events.push({ type: "done" }); break; }
    let value: unknown;
    try { value = JSON.parse(payload); } catch { throw protocolError("Stream contains invalid JSON."); }
    if (!value || typeof value !== "object" || !("type" in value) || typeof value.type !== "string") {
      throw protocolError("Stream event is missing its type.");
    }
    events.push(value as StreamEvent);
  }
  if (rest.length > MAX_FRAME_CHARS) throw protocolError("Stream frame exceeds the size limit.");
  return { events, rest };
}

/** Requires the API's terminal [DONE] marker, and cancels the body on early exit. */
export async function* parseSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const parsed = parseSseBuffer(done ? buffer + "\n\n" : buffer);
      buffer = parsed.rest;
      for (const event of parsed.events) {
        if (event.type === "done") return;
        yield event;
      }
      if (done) throw new AgentkitError({ code: "STREAM_TRUNCATED", message: "Stream ended without [DONE]; the write outcome may be unknown.", status: 200 });
    }
  } finally {
    try { await reader.cancel(); } catch { /* Preserve the original stream failure. */ }
    reader.releaseLock();
  }
}
