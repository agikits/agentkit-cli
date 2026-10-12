import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { readConfig, writeConfig, resolveConfig } from "../src/shared/config.js";
import { addProject, importProjects, loadProject } from "../src/shared/project.js";
const ID = "00000000-0000-4000-8000-000000000001";
const keys = ["AGENTKIT_CONFIG_DIR", "AGENTKIT_API_KEY", "AGENTKIT_KEY", "AGENTKIT_URL", "AGENTKIT_SESSION_TOKEN"];
let saved: Record<string, string | undefined>, dir: string;
beforeEach(async () => {
  saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  keys.forEach(k => delete process.env[k]);
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentkit-storage-"));
  process.env.AGENTKIT_CONFIG_DIR = dir;
});
afterEach(async () => {
  for (const key of keys) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  await fs.rm(dir, { recursive: true, force: true });
});
it("repairs existing permissions and replaces credentials atomically", async () => {
  const file = path.join(dir, "config.json");
  await fs.writeFile(file, '{"key":"old"}', { mode: 0o644 });
  await writeConfig({ key: "new" });
  expect(await readConfig()).toEqual({ key: "new", keyUrl: "https://agentkit.ai" });
  if (process.platform !== "win32") {
    expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
    expect((await fs.stat(dir)).mode & 0o777).toBe(0o700);
  }
  expect(await fs.readdir(dir)).toEqual(["config.json"]);
});
it("rejects malformed config instead of silently falling back", async () => {
  await fs.writeFile(path.join(dir, "config.json"), "not JSON");
  await expect(readConfig()).rejects.toThrow("Invalid Agentkit configuration JSON");
});
it.skipIf(process.platform === "win32")("does not read or write through a credential symlink", async () => {
  const target = path.join(dir, "original.json");
  await fs.writeFile(target, '{"key":"unchanged"}');
  await fs.symlink(target, path.join(dir, "config.json"));
  await expect(writeConfig({ key: "changed" })).rejects.toThrow("symlinks");
  await expect(readConfig()).rejects.toThrow("symlinks");
  expect(await fs.readFile(target, "utf8")).toContain("unchanged");
});
it("uses explicit/canonical/legacy/saved precedence", async () => {
  await writeConfig({ key: "saved", url: "https://saved.example" });
  process.env.AGENTKIT_KEY = "legacy"; process.env.AGENTKIT_API_KEY = "canonical";
  expect((await resolveConfig()).key).toBe("canonical");
  expect((await resolveConfig({ key: "explicit" })).key).toBe("explicit");
  delete process.env.AGENTKIT_API_KEY;
  expect((await resolveConfig()).key).toBe("legacy");
});
it("accepts a direct UUID even with an invalid registry and never imports endpoint overrides", async () => {
  await fs.writeFile(path.join(dir, "projects.json"), "bad JSON");
  expect(await loadProject(ID)).toEqual({ agentId: ID });
  await fs.writeFile(path.join(dir, "projects.json"), JSON.stringify({ projects: { demo: { agentId: ID, baseUrl: "https://untrusted.example" } } }));
  await expect(loadProject("demo")).rejects.toThrow("endpoint overrides");
});
it("migrates aliases explicitly, preserves conflicts, and blocks prototype names", async () => {
  const file = path.join(dir, "legacy.json");
  await fs.writeFile(file, JSON.stringify({ projects: { demo: { agentId: ID } } }));
  expect(await importProjects(file)).toBe(1);
  expect(await loadProject("demo")).toEqual({ agentId: ID });
  await expect(addProject("demo", "00000000-0000-4000-8000-000000000002")).rejects.toThrow("different agent");
  await expect(addProject("__proto__", ID)).rejects.toThrow("Invalid alias");
});
it.each(["http://example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com?key=secret", "file:///tmp/test"])("rejects unsafe endpoint %s", async url => {
  await expect(resolveConfig({ url }, { requireKey: false })).rejects.toThrow("HTTPS origin");
});

it("binds saved credentials to their origin", async () => {
  await writeConfig({ key: "account-key", sessionToken: "user-jwt", sessionUrl: "https://agentkit.ai" });
  expect(await resolveConfig({}, { requireKey: false, allowSession: true })).toMatchObject({ sessionToken: "user-jwt" });
  await expect(resolveConfig({ url: "https://different.example" }, { requireKey: false, allowSession: true })).rejects.toThrow("different origin");
  await expect(resolveConfig({ url: "https://different.example" })).rejects.toThrow("different origin");
  process.env.AGENTKIT_API_KEY = "explicit-key";
  process.env.AGENTKIT_SESSION_TOKEN = "explicit-user-jwt";
  expect(await resolveConfig({ url: "https://different.example" }, { requireKey: false, allowSession: true })).toMatchObject({ sessionToken: "explicit-user-jwt" });
});
it.each(["https://different.example", "http://127.0.0.1:3000"])("does not carry a legacy saved key to %s", async url => {
  await fs.writeFile(path.join(dir, "config.json"), JSON.stringify({ key: "saved-key", url: "https://agentkit.ai" }));
  await expect(resolveConfig({ url })).rejects.toThrow("different origin");
  process.env.AGENTKIT_URL = url;
  await expect(resolveConfig()).rejects.toThrow("different origin");
});
it("does not rebind a saved key when changing only the endpoint", async () => {
  await writeConfig({ key: "saved-key", url: "https://agentkit.ai" });
  await writeConfig({ ...await readConfig(), url: "https://different.example" });
  await expect(resolveConfig()).rejects.toThrow("different origin");
  expect(await resolveConfig({ key: "explicit-key" })).toMatchObject({ key: "explicit-key" });
});
it("requires an origin when persisting a session and redacts the saved token", async () => {
  await expect(writeConfig({ sessionToken: "jwt" })).rejects.toThrow("origin");
  await writeConfig({ sessionToken: "secret-session-jwt", sessionUrl: "https://agentkit.ai" });
  const { redact } = await import("../src/shared/config.js");
  expect(redact("echo secret-session-jwt")).toBe("echo [REDACTED]");
});

it("uses a newly bound session without sending the saved key from another origin", async () => {
  await writeConfig({ key: "production-key", url: "https://agentkit.ai" });
  await writeConfig({ ...await readConfig(), url: "https://staging.example", sessionToken: "staging-jwt", sessionUrl: "https://staging.example" });
  expect(await resolveConfig({}, { requireKey: false, allowSession: true })).toEqual({
    url: "https://staging.example", key: "", sessionToken: "staging-jwt",
  });
  await expect(resolveConfig()).rejects.toThrow("different origin");
});
