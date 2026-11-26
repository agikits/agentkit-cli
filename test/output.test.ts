import { describe, expect, it } from "vitest";
import { messageText } from "../src/shared/email.js";
import { safeJson, terminalText } from "../src/shared/terminal.js";

describe("terminal output safety", () => {
  it("removes terminal controls, carriage returns and bidi formatting", () => {
    expect(terminalText("a\u001b[31mb\r\nc\td\u009b\u202ee\u200f")).toBe("a[31mb\nc\tde");
  });

  it("escapes JSON C1 and bidi controls without changing parsed data", () => {
    const value = { text: "a\u009bb\u202ec", rtl: "x\u200fy" };
    const text = safeJson(value);
    expect(text).not.toMatch(/[\u007F-\u009F\u200F\u202A-\u202E]/);
    expect(JSON.parse(text)).toEqual(value);
  });

  it("strips hostile HTML and comments without backtracking", () => {
    expect(messageText(null, "<".repeat(1_000_000)).length).toBe(1_000_000);
    expect(messageText(null, "<!--".repeat(200_000))).toBe("[No message body]");
    expect(messageText(null, '<!--<p>no</p>--><p>Yes</p><script>bad</script><style>.x{}</style>')).toBe("Yes");
  });

  it("trims long whitespace runs in linear time", () => {
    const text = messageText(null, `${" ".repeat(200_000)}x`);
    expect(text).toBe("x");
  });

  it("keeps script indexing aligned after Unicode case folding", () => {
    const text = messageText(null, `${"\u0130".repeat(20)}<script>alert(1)</script><p>ok</p>`);
    expect(text).not.toContain("alert");
    expect(text).toContain("ok");
    expect(text.length).toBe(22);
  });
});
