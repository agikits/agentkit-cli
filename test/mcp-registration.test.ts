import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parse as toml } from "@decimalturn/toml-patch";
import { parse as jsonc } from "jsonc-parser";
import { afterEach, beforeEach, expect, it } from "vitest";

const cli = path.resolve("dist/cli/index.js");
const uuid = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";
const fallback = ["-y", "-p", "@agikits/agentkit", "agentkit-mcp"];
let home: string, project: string, bin: string, appData: string;
beforeEach(async () => {
  home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "agentkit-registration-")));
  project = path.join(home, "project");
  bin = path.join(home, "test bin");
  appData = process.platform === "darwin" ? path.join(home, "Library/Application Support")
    : process.platform === "win32" ? path.join(home, "AppData/Roaming") : path.join(home, ".config");
  await Promise.all([fs.mkdir(project), fs.mkdir(bin)]);
});
afterEach(() => fs.rm(home, { force: true, recursive: true }));

function run(args: string[], env: NodeJS.ProcessEnv = {}) {
  const r = spawnSync(process.execPath, [cli, "mcp", ...args], {
    cwd: project, encoding: "utf8", timeout: 10000,
    env: { HOME: home, USERPROFILE: home, PATH: bin, APPDATA: appData, SystemRoot: process.env.SystemRoot,
      ComSpec: process.env.ComSpec, PATHEXT: process.env.PATHEXT, TEMP: home, TMP: home, ...env },
  });
  if (r.error) throw r.error;
  return r;
}
function success(args: string[], env?: NodeJS.ProcessEnv) {
  const result = run([...args, "--json"], env);
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}
async function write(file: string, body: string) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
}
async function binary(name: string, script: string) {
  const file = path.join(bin, name + (process.platform === "win32" ? ".cmd" : ""));
  if (process.platform === "win32") {
    await fs.writeFile(file + ".cjs", script);
    await fs.writeFile(file, `@"${process.execPath}" "%~f0.cjs" %*\r\n`);
  } else {
    await fs.writeFile(file, `#!${process.execPath}\n${script}`, { mode: 0o755 });
  }
  return file;
}

it.each(["cursor", "vscode", "claude-desktop", "windsurf"])("merges, replaces and removes only the named %s entry", async client => {
  const scope = client === "vscode" ? ["--scope", "project"] : [];
  const file = client === "vscode" ? path.join(project, ".vscode/mcp.json")
    : client === "claude-desktop" ? path.join(appData, "Claude/claude_desktop_config.json")
    : client === "cursor" ? path.join(home, ".cursor/mcp.json") : path.join(home, ".codeium/windsurf/mcp_config.json");
  const key = client === "vscode" ? "servers" : "mcpServers";
  const body = `{\n  "${key}": { "other": { "command": "keep" } },\n  "extra": true\n}\n`;
  await write(file, body);
  const args = ["add", client, ...scope, "--name", "custom"];
  const preview = success([...args, "--dry-run"]);
  expect(preview.server.args).toEqual(fallback);
  expect(await fs.readFile(file, "utf8")).toBe(body);
  await expect(fs.stat(file + ".bak")).rejects.toMatchObject({ code: "ENOENT" });
  expect(success(args).action).toBe("add");
  expect(success(args).action).toBe("unchanged");
  expect(await fs.readFile(file + ".bak", "utf8")).toBe(body);
  const conflict = run([...args, "--allow-writes"]);
  expect(conflict.status).toBe(1);
  expect(conflict.stderr).toContain("--force");
  const previous = await fs.readFile(file, "utf8");
  const changed = success([...args, "--force", "--allow-writes", "--agent", uuid, second]);
  expect(changed.action).toBe("replace");
  expect(await fs.readFile(file + ".bak", "utf8")).toBe(previous);
  const updated = JSON.parse(await fs.readFile(file, "utf8"));
  expect(updated[key].custom.args).toEqual([...fallback, "--allow-writes", "--agent", uuid, second]);
  const options = ["remove", client, ...scope, "--name", "custom"];
  expect(success([...options, "--dry-run"]).dryRun).toBe(true);
  expect(success(options).action).toBe("remove");
  expect(success(options).action).toBe("unchanged");
  expect(JSON.parse(await fs.readFile(file, "utf8"))).toEqual(JSON.parse(body));
});

it("keeps Codex TOML comments and unrelated tables across all edits", async () => {
  const file = path.join(home, ".codex/config.toml");
  const original = '# my config\nmodel = "example" # keep\n\n[mcp_servers.other]\ncommand = "keep" # server note\n';
  await write(file, original);
  const binaryPath = await binary("agentkit-mcp", "process.exit(44)");
  let added = success(["add", "codex", "--agent", uuid]);
  expect(added.server.command).toBe(binaryPath);
  expect(toml(await fs.readFile(file, "utf8")).mcp_servers.agentkit.args).toEqual(["--agent", uuid]);
  expect(success(["add", "codex", "--agent", uuid]).action).toBe("unchanged");
  expect(await fs.readFile(file + ".bak", "utf8")).toBe(original);
  expect(run(["add", "codex"]).status).toBe(1);
  added = success(["add", "codex", "--force"]);
  expect(added.server.args).toEqual([]);
  success(["remove", "codex"]);
  const result = await fs.readFile(file, "utf8");
  expect(result).toContain('# my config');
  expect(result).toContain('model = "example" # keep');
  expect(result).toContain('command = "keep" # server note');
  expect(toml(result)).toEqual(toml(original));
});

it("preserves neighboring VS Code JSONC comments and other scope", async () => {
  const file = path.join(project, ".vscode/mcp.json");
  await write(file, '{\n"servers": {\n"agentkit": {"command":"old"},\n// keep sibling comment\n"mine": {"command":"other"},\n},\n"inputs": [],\n}');
  success(["remove", "vscode", "--scope", "project"]);
  const text = await fs.readFile(file, "utf8");
  expect(text).toContain("// keep sibling comment");
  expect(jsonc(text)).toEqual({ servers: { mine: { command: "other" } }, inputs: [] });
  success(["add", "cursor", "--scope", "project"]);
  await expect(fs.stat(path.join(home, ".cursor/mcp.json"))).rejects.toMatchObject({ code: "ENOENT" });
});

it("previews native arguments and reports a manual command when Claude Code is absent", () => {
  const res = success(["add", "claude-code", "--scope", "project", "--allow-writes"]);
  expect(res.action).toBe("manual");
  expect(res.command).toBe("claude mcp add --scope project agentkit -- npx -y -p @agikits/agentkit agentkit-mcp --allow-writes");
});

it.each(["user", "project", "local"])("calls Claude Code and preserves other %s settings", async scope => {
  await binary("claude", `
    const fs = require('node:fs'), path = require('node:path');
    const [mcp, add, flag, scope, name, dash, command, ...args] = process.argv.slice(2);
    if (mcp !== 'mcp' || add !== 'add' || flag !== '--scope' || scope !== '${scope}' || dash !== '--') process.exit(4);
    fs.mkdirSync(process.env.CLAUDE_CONFIG_DIR, {recursive: true});
    const file = scope === 'project' ? '.mcp.json' : path.join(process.env.CLAUDE_CONFIG_DIR, '.claude.json');
    const entry = {mcpServers: {[name]: {command, args, env:{}, type:'stdio'}}};
    fs.writeFileSync(file, JSON.stringify(scope === 'local' ? {projects: {[process.cwd()]: entry}} : entry));
  `);
  const file = scope === "project" ? path.join(project, ".mcp.json") : path.join(home, ".claude.json");
  await write(file, '{"unrelated":"keep"}');
  const args = ["add", "claude-code", "--scope", scope, "--allow-writes"];
  expect(success(args).action).toBe("add");
  expect(success(args).action).toBe("unchanged");
  const settings = JSON.parse(await fs.readFile(file, "utf8"));
  expect(settings.unrelated).toBe("keep");
  expect((scope === "local" ? settings.projects[project] : settings).mcpServers.agentkit.args).toEqual([...fallback, "--allow-writes"]);
  expect(success(["status"]).clients).toContainEqual({ client: "claude-code", scope, configured: true, args: [...fallback, "--allow-writes"] });
  success(["remove", "claude-code", "--scope", scope]);
});

it("uses the VS Code CLI for user registration and leaves config intact on native failure", async () => {
  const file = path.join(appData, "Code/User/mcp.json");
  const body = '{ "servers": { "other": {"command":"keep"} }, "inputs": [] }';
  await write(file, body);
  await binary("code", `
    const fs = require('node:fs'), path = require('node:path');
    const [dirFlag, data, flag, json] = process.argv.slice(2);
    if (flag !== '--add-mcp' || dirFlag !== '--user-data-dir') process.exit(5);
    const {name, ...server} = JSON.parse(json);
    fs.mkdirSync(path.join(data,'User'), {recursive:true});
    fs.writeFileSync(path.join(data,'User/mcp.json'), JSON.stringify({servers:{[name]:server}}));
  `);
  success(["add", "vscode"]);
  const saved = await fs.readFile(file, "utf8");
  expect(JSON.parse(saved).servers).toMatchObject({ agentkit: { command: "npx", type: "stdio" }, other: { command: "keep" } });
  await binary("code", "process.exit(1)");
  expect(run(["add", "vscode", "--allow-writes", "--force"]).status).toBe(1);
  expect(await fs.readFile(file, "utf8")).toBe(saved);
  expect(await fs.readFile(file + ".bak", "utf8")).toBe(body);
});

it("reports offline login and server args without copying credentials or printing arbitrary args", async () => {
  const login = path.join(home, ".config/agentkit/config.json");
  const creds = { key: "synthetic-key", sessionToken: "synthetic-session", sessionUrl: "https://agentkit.ai" };
  await write(login, JSON.stringify(creds));
  const file = path.join(home, ".cursor/mcp.json");
  success(["add", "cursor", "--agent", uuid]);
  const raw = await fs.readFile(file, "utf8");
  expect(raw).not.toContain(creds.key);
  expect(raw).not.toContain(creds.sessionToken);
  let report = success(["status"]);
  expect(report.loggedIn).toBe(true);
  expect(report.mcpApiKeyConfigured).toBe(true);
  expect(report.clients).toContainEqual({ client: "cursor", scope: "user", configured: true, args: [...fallback, "--agent", uuid] });
  await write(login, JSON.stringify({ sessionToken: creds.sessionToken, sessionUrl: creds.sessionUrl }));
  await write(file, JSON.stringify({ mcpServers: { agentkit: { command: "other", args: ["--token", "foreign-secret\u001b[31m\n"], env: { PASSWORD: "other-secret" } } } }));
  report = success(["status", "--scope", "user"]);
  expect(report).toMatchObject({ loggedIn: true, mcpApiKeyConfigured: false });
  const res = run(["status"]);
  for (const secret of [creds.sessionToken, "foreign-secret", "other-secret", "\u001b"]) expect(res.stdout + res.stderr).not.toContain(secret);
  await fs.unlink(login);
  expect(success(["status"]).loggedIn).toBe(false);
});

it("requires an explicit noninteractive choice; rejects unsupported scopes, transport and invalid arguments before writes", async () => {
  await fs.mkdir(path.join(home, ".cursor"));
  for (const args of [["add"], ["remove"]]) {
    const result = run(args);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("cursor");
    expect(result.stderr).toContain("<client>");
  }
  for (const args of [["add", "--remote"], ["add", "cursor", "--scope", "local"], ["add", "cursor", "--agent", "--bad"],
    ["add", "cursor", "--name", "__proto__"], ["add", "cursor", "--agent", "bogus"], ["add", "codex", "--scope", "project"]]) {
    expect(run(args).status).toBe(1);
  }
  expect(run(["--remote"]).stderr).toContain("Remote MCP server is not available yet");
  expect(await fs.readdir(path.join(home, ".cursor"))).toEqual([]);
});

it("refuses malformed or ambiguous files even with force and checks remaining clients", async () => {
  const file = path.join(home, ".cursor/mcp.json");
  for (const bad of ['{"secret":"hidden",', '{"mcpServers":[]}', '{"mcpServers":{"agentkit":1,"agentkit":2}}']) {
    await write(file, bad);
    const add = run(["add", "cursor", "--force"]);
    expect(add.status).toBe(1);
    expect(add.stderr).not.toContain("hidden");
    expect(await fs.readFile(file, "utf8")).toBe(bad);
    const report = run(["status", "--json"]);
    expect(report.status).toBe(1);
    expect(JSON.parse(report.stdout).clients).toContainEqual(expect.objectContaining({ client: "cursor", scope: "user", error: expect.any(String) }));
  }
});
