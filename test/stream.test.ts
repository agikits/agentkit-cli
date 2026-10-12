import { describe, expect, it } from "vitest";

import { parseSseBuffer, parseSseStream } from "../src/sdk/stream.js";
import type { StreamEvent } from "../src/sdk/types.js";

describe("parseSseBuffer", () => {
  it("parses complete frames and carries the trailing partial", () => {
    const buf =
      'data: {"type":"text-delta","id":"a","delta":"Hi"}\n\n' +
      'data: {"type":"text-delta","id":"a","delta":" there"}\n\n' +
      'data: {"type":"finish"';
    const { events, rest } = parseSseBuffer(buf);
    expect(events.map((e) => (e as { delta?: string }).delta)).toEqual([
      "Hi",
      " there",
    ]);
    expect(rest).toBe('data: {"type":"finish"');
  });

  it("surfaces [DONE] as a done sentinel and ignores non-data lines", () => {
    const buf = ": keepalive\ndata: [DONE]\n\n";
    const { events } = parseSseBuffer(buf);
    expect(events).toEqual([{ type: "done" }]);
  });

  it("returns the buffer unchanged when no frame boundary yet", () => {
    const buf = 'data: {"type":"text-delta"';
    const { events, rest } = parseSseBuffer(buf);
    expect(events).toEqual([]);
    expect(rest).toBe(buf);
  });

  it("normalizes CRLF line endings", () => {
    const buf = 'data: {"type":"message-start","messageId":"m1"}\r\n\r\n';
    const { events } = parseSseBuffer(buf);
    expect(events[0]).toMatchObject({ type: "message-start", messageId: "m1" });
  });
});

describe("parseSseStream", () => {
  it("cancels the response when the consumer stops early", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode('data: {"type":"text-delta","delta":"hi"}\n\n')); },
      cancel() { cancelled = true; },
    });
    for await (const event of parseSseStream(stream)) { expect(event.type).toBe("text-delta"); break; }
    expect(cancelled).toBe(true);
    expect(stream.locked).toBe(false);
  });

  it("rejects malformed frames instead of silently skipping them", async () => {
    await expect(async () => {
      for await (const event of parseSseStream(streamOf(['data: {broken}\n\n']))) void event;
    }).rejects.toThrow();
  });

  it("yields events across chunk boundaries and stops at [DONE]", async () => {
    const chunks = [
      'data: {"type":"text-delta","id":"a","de',
      'lta":"Hel"}\n\ndata: {"type":"text-delta","id":"a","delta":"lo"}\n\n',
      'data: {"type":"finish","finishReason":"stop"}\n\ndata: [DONE]\n\n',
      'data: {"type":"text-delta","id":"a","delta":"IGNORED"}\n\n',
    ];
    const stream = streamOf(chunks);
    const collected: StreamEvent[] = [];
    for await (const event of parseSseStream(stream)) collected.push(event);
    expect(collected.map((e) => e.type)).toEqual([
      "text-delta",
      "text-delta",
      "finish",
    ]);
    expect(
      collected
        .filter((e) => e.type === "text-delta")
        .map((e) => (e as { delta: string }).delta),
    ).toEqual(["Hel", "lo"]);
  });
});

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i++]!));
      } else {
        controller.close();
      }
    },
  });
}
