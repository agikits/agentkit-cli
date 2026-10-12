import { describe, expect, it } from "vitest";

import {
  limitStarterPrompts,
  parseAutomationConfigJson,
  parseAutomationKey,
  parseStarterPromptArg,
  parseStarterPromptsJson,
  parseMenuItemsJson,
} from "../src/shared/instagram.js";

describe("parseAutomationKey", () => {
  it("accepts the four keys and normalizes dashes", () => {
    expect(parseAutomationKey("respond_to_dms")).toBe("respond_to_dms");
    expect(parseAutomationKey("comment-to-dm")).toBe("comment_to_dm");
  });
  it("rejects unknown keys", () => {
    expect(() => parseAutomationKey("dm_everyone")).toThrow(/unknown automation/);
  });
});

describe("parseStarterPromptArg", () => {
  it("splits question => message", () => {
    expect(parseStarterPromptArg("What's the price? => $9/mo, link below")).toEqual({
      question: "What's the price?",
      message: "$9/mo, link below",
      links: [],
    });
  });
  it("allows a question-only draft", () => {
    expect(parseStarterPromptArg("Hours?")).toEqual({
      question: "Hours?",
      message: "",
      links: [],
    });
  });
  it("enforces the question length limit", () => {
    expect(() => parseStarterPromptArg("x".repeat(81))).toThrow(/≤80/);
  });
  it("rejects an empty question", () => {
    expect(() => parseStarterPromptArg(" => hi")).toThrow(/needs a question/);
  });
});

describe("parseStarterPromptsJson", () => {
  it("accepts an array", () => {
    const prompts = parseStarterPromptsJson(
      JSON.stringify([{ question: "Q", message: "M", links: [{ label: "L", url: "https://x.y" }] }]),
    );
    expect(prompts[0]!.links[0]!.url).toBe("https://x.y");
  });
  it("accepts a GET payload with draft_prompts", () => {
    const prompts = parseStarterPromptsJson(
      JSON.stringify({ status: "draft", draft_prompts: [{ question: "Q" }] }),
    );
    expect(prompts).toEqual([{ question: "Q", message: "", links: [] }]);
  });
  it("rejects non-JSON / wrong shapes", () => {
    expect(() => parseStarterPromptsJson("nope")).toThrow(/JSON/);
    expect(() => parseStarterPromptsJson('[{"message":"m"}]')).toThrow(/question/);
  });
});

describe("limitStarterPrompts", () => {
  it("caps at 4", () => {
    const p = { question: "q", message: "m", links: [] };
    expect(() => limitStarterPrompts([p, p, p, p, p])).toThrow(/At most 4/);
    expect(limitStarterPrompts([p])).toHaveLength(1);
  });
});

describe("parseAutomationConfigJson", () => {
  it("returns the object as-is", () => {
    expect(parseAutomationConfigJson('{"mode":"all"}')).toEqual({ mode: "all" });
  });
  it("unwraps a pasted GET row", () => {
    expect(
      parseAutomationConfigJson('{"key":"story_mentions","status":"draft","config":{"message":"hi"}}'),
    ).toEqual({ message: "hi" });
  });
  it("rejects arrays and non-JSON", () => {
    expect(() => parseAutomationConfigJson("[]")).toThrow(/JSON object/);
    expect(() => parseAutomationConfigJson("{")).toThrow(/JSON object/);
  });
});

describe("parseMenuItemsJson", () => {
  it("accepts an items array, keeps ids, and fills missing ids", () => {
    const items = parseMenuItemsJson(
      JSON.stringify([
        { id: "keep", title: " Pricing ", action: { kind: "postback", reply: "hi" } },
        { title: "Site", action: { kind: "web_url", url: "https://agentkit.ai" } },
      ]),
    );
    expect(items[0]).toEqual({ id: "keep", title: "Pricing", action: { kind: "postback", reply: "hi" } });
    expect(items[1]!.id).toMatch(/[0-9a-f-]{36}/);
  });

  it("accepts a GET payload object via draft_items and enforces limits", () => {
    const six = Array.from({ length: 6 }, (_, i) => ({
      title: `Item ${i}`,
      action: { kind: "postback", reply: "x" },
    }));
    expect(() => parseMenuItemsJson(JSON.stringify({ draft_items: six }))).toThrow(/At most 5/);
    expect(() =>
      parseMenuItemsJson(JSON.stringify([{ title: "t", action: { kind: "nope" } }])),
    ).toThrow(/action must be/);
  });
});
