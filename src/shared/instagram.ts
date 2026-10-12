import {
  INSTAGRAM_AUTOMATION_KEYS,
  INSTAGRAM_MENU_LIMITS,
  INSTAGRAM_STARTER_LIMITS,
} from "../sdk/types.js";
import type {
  InstagramAutomationKey,
  InstagramMenuItem,
  InstagramStarterPrompt,
} from "../sdk/types.js";

/** Separator between question and scripted reply in `--prompt "Q => M"`. */
export const STARTER_PROMPT_SEPARATOR = "=>";

export function parseAutomationKey(value: string): InstagramAutomationKey {
  const key = value.trim().replace(/-/g, "_") as InstagramAutomationKey;
  if (!(INSTAGRAM_AUTOMATION_KEYS as readonly string[]).includes(key)) {
    throw new Error(
      `unknown automation '${value}'. Use: ${INSTAGRAM_AUTOMATION_KEYS.join(" | ")}`,
    );
  }
  return key;
}

/**
 * Parse one `--prompt` value: `"<question> => <message>"`. The message may be
 * omitted for a draft (go-live then fails server-side with "Add a message.").
 * Links can't be expressed inline — use `--file <prompts.json>` for those.
 */
export function parseStarterPromptArg(text: string): InstagramStarterPrompt {
  const at = text.indexOf(STARTER_PROMPT_SEPARATOR);
  const question = (at === -1 ? text : text.slice(0, at)).trim();
  const message =
    at === -1 ? "" : text.slice(at + STARTER_PROMPT_SEPARATOR.length).trim();
  if (!question) throw new Error("--prompt needs a question before '=>'.");
  if (question.length > INSTAGRAM_STARTER_LIMITS.questionMaxLength) {
    throw new Error(
      `Starter question must be ≤${INSTAGRAM_STARTER_LIMITS.questionMaxLength} characters (got ${question.length}).`,
    );
  }
  if (message.length > INSTAGRAM_STARTER_LIMITS.messageMaxLength) {
    throw new Error(
      `Starter message must be ≤${INSTAGRAM_STARTER_LIMITS.messageMaxLength} characters (got ${message.length}).`,
    );
  }
  return { question, message, links: [] };
}

/**
 * Parse a JSON prompts document (`--file` / stdin): an array of
 * `{ question, message, links? }`, or an object carrying `prompts` /
 * `draft_prompts` (so a `GET` payload can be edited and fed back).
 */
export function parseStarterPromptsJson(text: string): InstagramStarterPrompt[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Prompts must be JSON (an array of { question, message, links }).");
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    value = obj.prompts ?? obj.draft_prompts;
  }
  if (!Array.isArray(value)) {
    throw new Error("Prompts JSON must be an array (or an object with `prompts`).");
  }
  return value.map((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`prompts[${i}] must be an object.`);
    }
    const p = item as Record<string, unknown>;
    if (typeof p.question !== "string") {
      throw new Error(`prompts[${i}].question must be a string.`);
    }
    const links = p.links ?? [];
    if (!Array.isArray(links)) {
      throw new Error(`prompts[${i}].links must be an array.`);
    }
    return {
      question: p.question,
      message: typeof p.message === "string" ? p.message : "",
      links: links as InstagramStarterPrompt["links"],
    };
  });
}

/** Apply the count limit shared by the CLI and the server schema. */
export function limitStarterPrompts(
  prompts: InstagramStarterPrompt[],
): InstagramStarterPrompt[] {
  if (prompts.length > INSTAGRAM_STARTER_LIMITS.prompts.max) {
    throw new Error(
      `At most ${INSTAGRAM_STARTER_LIMITS.prompts.max} conversation starters allowed.`,
    );
  }
  return prompts;
}

/** Parse an automation config document (JSON object). */
export function parseAutomationConfigJson(
  text: string,
): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Config must be a JSON object.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Config must be a JSON object.");
  }
  // Accept a GET payload (`{ key, status, config }`) pasted back verbatim.
  const obj = value as Record<string, unknown>;
  if (obj.config && typeof obj.config === "object" && "key" in obj) {
    return obj.config as Record<string, unknown>;
  }
  return obj;
}

/**
 * Parse a JSON Main Menu document (`--file` / stdin): an array of
 * `{ id?, title, action }` (or an object carrying `items` / `draft_items`, so
 * a `GET` payload can be edited and fed back). A missing `id` gets a fresh
 * UUID — keep ids stable across edits so live taps keep matching.
 */
export function parseMenuItemsJson(text: string): InstagramMenuItem[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Menu items must be JSON (an array of { id?, title, action }).");
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    value = obj.items ?? obj.draft_items;
  }
  if (!Array.isArray(value)) {
    throw new Error("Menu JSON must be an array (or an object with `items`).");
  }
  if (value.length > INSTAGRAM_MENU_LIMITS.maxItems) {
    throw new Error(`At most ${INSTAGRAM_MENU_LIMITS.maxItems} menu items allowed.`);
  }
  return value.map((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`items[${i}] must be an object.`);
    }
    const m = item as Record<string, unknown>;
    if (typeof m.title !== "string") throw new Error(`items[${i}].title must be a string.`);
    if (m.title.trim().length > INSTAGRAM_MENU_LIMITS.maxTitleLength) {
      throw new Error(
        `items[${i}].title must be ≤${INSTAGRAM_MENU_LIMITS.maxTitleLength} characters.`,
      );
    }
    const a = m.action;
    if (!a || typeof a !== "object" || Array.isArray(a)) {
      throw new Error(`items[${i}].action must be { kind:'postback', reply } or { kind:'web_url', url }.`);
    }
    const action = a as Record<string, unknown>;
    let parsedAction: InstagramMenuItem["action"];
    if (action.kind === "postback" && typeof action.reply === "string") {
      if (action.reply.length > INSTAGRAM_MENU_LIMITS.maxReplyLength) {
        throw new Error(
          `items[${i}].action.reply must be ≤${INSTAGRAM_MENU_LIMITS.maxReplyLength} characters.`,
        );
      }
      parsedAction = { kind: "postback", reply: action.reply };
    } else if (action.kind === "web_url" && typeof action.url === "string") {
      parsedAction = { kind: "web_url", url: action.url };
    } else {
      throw new Error(`items[${i}].action must be { kind:'postback', reply } or { kind:'web_url', url }.`);
    }
    const id = typeof m.id === "string" && m.id ? m.id : crypto.randomUUID();
    return { id, title: m.title.trim(), action: parsedAction };
  });
}
