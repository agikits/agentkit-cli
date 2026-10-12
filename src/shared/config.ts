import path from "node:path";
import { DEFAULT_BASE_URL } from "../sdk/client.js";
import { validateBaseUrl } from "../sdk/url.js";
import { configDir, isRecord, readJsonFile, writeJsonFile } from "./storage.js";

export type Config = { url?: string; key?: string; keyUrl?: string; sessionToken?: string; sessionUrl?: string };
export type ResolvedConfig = { url: string; key: string; sessionToken?: string };
const secrets = new Set<string>();
export function rememberKey(key: string): string {
  if (key) secrets.add(key);
  return key;
}
export function redact(text: string): string {
  for (const key of secrets) text = text.split(key).join("[REDACTED]");
  return text;
}
export function configPath(): string { return path.join(configDir(), "config.json"); }

export async function readConfig(): Promise<Config> {
  const value = await readJsonFile(configPath());
  if (value === undefined) return {};
  if (!isRecord(value) || Object.keys(value).some(k => !["url", "key", "keyUrl", "sessionToken", "sessionUrl"].includes(k)) ||
      (value.key !== undefined && typeof value.key !== "string") ||
      (value.url !== undefined && typeof value.url !== "string") ||
      (value.keyUrl !== undefined && typeof value.keyUrl !== "string") ||
      (value.sessionToken !== undefined && typeof value.sessionToken !== "string") ||
      (value.sessionUrl !== undefined && typeof value.sessionUrl !== "string") ||
      (value.sessionToken !== undefined && value.sessionUrl === undefined)) {
    throw new Error("Invalid Agentkit configuration; expected optional key and url strings.");
  }
  if (typeof value.key === "string") rememberKey(value.key);
  if (typeof value.sessionToken === "string") rememberKey(value.sessionToken);
  const config = value as Config;
  // Migrate legacy binding in memory before an init command can change url.
  return config.key ? { ...config, keyUrl: validateBaseUrl(config.keyUrl ?? config.url ?? DEFAULT_BASE_URL) } : config;
}
export async function writeConfig(config: Config): Promise<void> {
  if (config.url !== undefined) config = { ...config, url: validateBaseUrl(config.url) };
  if (config.key !== undefined && (!config.key.trim() || /\s/.test(config.key))) {
    throw new Error("API key must be a nonempty token without whitespace.");
  }
  if (config.key !== undefined) config = { ...config, keyUrl: validateBaseUrl(config.keyUrl ?? config.url ?? DEFAULT_BASE_URL) };
  if (config.sessionToken !== undefined) {
    const sessionToken = config.sessionToken;
    if (!sessionToken.trim() || /\s/.test(sessionToken) || !config.sessionUrl) throw new Error("Session token requires a nonempty token and its origin.");
    config = { ...config, sessionUrl: validateBaseUrl(config.sessionUrl) };
    rememberKey(sessionToken);
  }
  await writeJsonFile(configPath(), config);
}
export async function resolveConfig(
  options: { url?: string; key?: string } = {},
  { requireKey = true, allowSession = false, ignoreCredentials = false }: { requireKey?: boolean; allowSession?: boolean; ignoreCredentials?: boolean } = {},
): Promise<ResolvedConfig> {
  const saved = await readConfig();
  const url = validateBaseUrl(options.url || process.env.AGENTKIT_URL || saved.url || DEFAULT_BASE_URL);
  if (ignoreCredentials) return { url, key: "" };
  const explicitKey = options.key || process.env.AGENTKIT_API_KEY || process.env.AGENTKIT_KEY;
  const sessionToken = allowSession ? rememberKey(process.env.AGENTKIT_SESSION_TOKEN || saved.sessionToken || "") : "";
  if (sessionToken && !process.env.AGENTKIT_SESSION_TOKEN && saved.sessionUrl !== url) throw new Error("Saved session belongs to a different origin. Re-authenticate for this origin or provide AGENTKIT_SESSION_TOKEN explicitly.");
  const wrongSavedKeyOrigin = !explicitKey && !!saved.key && saved.keyUrl !== url;
  if (wrongSavedKeyOrigin && (requireKey || !sessionToken)) throw new Error("Saved API key belongs to a different origin. Supply credentials for this origin explicitly.");
  // A correctly bound session can serve management without carrying an unrelated saved key.
  const key = rememberKey(explicitKey || (wrongSavedKeyOrigin ? "" : saved.key) || "");
  if (requireKey && !key) throw new Error("Missing Agentkit API key. Set AGENTKIT_API_KEY or run agentkit init --with-token with a token on stdin.");
  if (allowSession) {
    if (!key && !sessionToken) throw new Error("Missing credentials. Set AGENTKIT_API_KEY or AGENTKIT_SESSION_TOKEN.");
    return { url, key, ...(sessionToken ? { sessionToken } : {}) };
  }
  return { url, key };
}
