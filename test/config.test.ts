import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveConfig } from "../src/shared/config.js";

const ENV_KEYS = ["AGENTKIT_URL", "AGENTKIT_API_KEY", "AGENTKIT_KEY", "AGENTKIT_CONFIG_DIR"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  // Isolate from any real ~/.config/agentkit/config.json by pointing at an
  // empty temp dir, so file-fallback tests are deterministic.
  process.env.AGENTKIT_CONFIG_DIR = path.join(
    os.tmpdir(),
    "agentkit-cli-test-empty",
  );
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("resolveConfig precedence", () => {
  it("prefers explicit options over env", async () => {
    process.env.AGENTKIT_URL = "https://env.example.com";
    process.env.AGENTKIT_KEY = "env-key";
    const cfg = await resolveConfig({
      url: "https://opt.example.com/",
      key: "opt-key",
    });
    expect(cfg.url).toBe("https://opt.example.com"); // trailing slash stripped
    expect(cfg.key).toBe("opt-key");
  });

  it("falls back to env, then default URL", async () => {
    process.env.AGENTKIT_KEY = "env-key";
    const cfg = await resolveConfig();
    expect(cfg.url).toBe("https://agentkit.ai");
    expect(cfg.key).toBe("env-key");
  });

  it("throws when a key is required but absent", async () => {
    await expect(resolveConfig()).rejects.toThrow(/Missing Agentkit API key/);
  });

  it("allows a missing key when requireKey is false", async () => {
    const cfg = await resolveConfig({}, { requireKey: false });
    expect(cfg.key).toBe("");
  });
});
