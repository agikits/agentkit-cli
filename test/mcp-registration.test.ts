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

it("does not prompt to select an MCP client with --no-input", async () => {
  const terminal = path.join(home, "terminal.cjs");
  await fs.writeFile(terminal, "process.stdin.isTTY = process.stderr.isTTY = true;");
  const result = run(["add", "--no-input"], { NODE_OPTIONS: `--require="${terminal.replaceAll("\\", "/")}"` });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Run agentkit mcp add <client>");
  expect(result.stderr).not.toContain("Choose an MCP client");
});

it.each(["cursor", "vscode", "claude-desktop", "windsurf"])("merges, replaces and removes only the named %s entry", async client => {
  const scope = client === "vscode" ? ["--scope", "project"] : [];
  const file = client === "vscode" ? path.join(project, ".vscode/mcp.json")
    : client === "claude-desktop" ? path.join(appData, "Claude/claude_desktop_config.json")
    : client === "cursor" ? path.join(home, ".cursor/mcp.json") : path.join(home, ".codeium/windsurf/mcp_config.json");
  const key = client === "vscode" ? "servers" : "mcpServers";
  const body = `{\n  "${key}": { "other": { "command": "keep" } },\n  "extra": true\n}\n`;
  await write(file, body);
  const args = ["add", "--local", client, ...scope, "--name", "custom"];
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
  let added = success(["add", "--local", "codex", "--agent", uuid]);
  expect(added.server.command).toBe(binaryPath);
  expect(toml(await fs.readFile(file, "utf8")).mcp_servers.agentkit.args).toEqual(["--agent", uuid]);
  expect(success(["add", "--local", "codex", "--agent", uuid]).action).toBe("unchanged");
  expect(await fs.readFile(file + ".bak", "utf8")).toBe(original);
  expect(run(["add", "--local", "codex"]).status).toBe(1);
  added = success(["add", "--local", "codex", "--force"]);
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
  success(["add", "--local", "cursor", "--scope", "project"]);
  await expect(fs.stat(path.join(home, ".cursor/mcp.json"))).rejects.toMatchObject({ code: "ENOENT" });
});

it("previews native arguments and reports a manual command when Claude Code is absent", () => {
  const res = success(["add", "--local", "claude-code", "--scope", "project", "--allow-writes"]);
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
  const args = ["add", "--local", "claude-code", "--scope", scope, "--allow-writes"];
  expect(success(args).action).toBe("add");
  expect(success(args).action).toBe("unchanged");
  const settings = JSON.parse(await fs.readFile(file, "utf8"));
  expect(settings.unrelated).toBe("keep");
  expect((scope === "local" ? settings.projects[project] : settings).mcpServers.agentkit.args).toEqual([...fallback, "--allow-writes"]);
  expect(success(["status"]).clients).toContainEqual({ client: "claude-code", scope, configured: true, transport: "stdio", args: [...fallback, "--allow-writes"] });
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
  success(["add", "--local", "vscode"]);
  const saved = await fs.readFile(file, "utf8");
  expect(JSON.parse(saved).servers).toMatchObject({ agentkit: { command: "npx", type: "stdio" }, other: { command: "keep" } });
  await binary("code", "process.exit(1)");
  expect(run(["add", "--local", "vscode", "--allow-writes", "--force"]).status).toBe(1);
  expect(await fs.readFile(file, "utf8")).toBe(saved);
  expect(await fs.readFile(file + ".bak", "utf8")).toBe(body);
});

it("reports offline login and server args without copying credentials or printing arbitrary args", async () => {
  const login = path.join(home, ".config/agentkit/config.json");
  const creds = { key: "synthetic-key", sessionToken: "synthetic-session", sessionUrl: "https://agentkit.ai" };
  await write(login, JSON.stringify(creds));
  const file = path.join(home, ".cursor/mcp.json");
  success(["add", "--local", "cursor", "--agent", uuid]);
  const raw = await fs.readFile(file, "utf8");
  expect(raw).not.toContain(creds.key);
  expect(raw).not.toContain(creds.sessionToken);
  let report = success(["status"]);
  expect(report.loggedIn).toBe(true);
  expect(report.mcpApiKeyConfigured).toBe(true);
  expect(report.clients).toContainEqual({ client: "cursor", scope: "user", configured: true, transport: "stdio", args: [...fallback, "--agent", uuid] });
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
  expect(run(["add", "codex", "--local", "--agent", "bogus"]).stderr).toContain("requires UUIDs");
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

const hostedUrl = "https://agentkit.ai/api/mcp";
it.each(["cursor", "windsurf", "codex", "vscode"])("registers hosted HTTP by default for %s and recognizes it in status", async client => {
  const scope = client === "vscode" ? ["--scope", "project"] : [];
  const args = ["add", client, ...scope];
  const desired = client === "windsurf" ? { serverUrl: hostedUrl } : client === "vscode" ? { url: hostedUrl, type: "http" } : { url: hostedUrl };
  const added = success(args);
  expect(added.server).toEqual(desired);
  const raw = await fs.readFile(added.file, "utf8");
  const servers = client === "codex" ? toml(raw).mcp_servers : jsonc(raw)[client === "vscode" ? "servers" : "mcpServers"];
  expect(servers.agentkit).toEqual(desired);
  expect(success(["--remote", ...args]).action).toBe("unchanged");
  expect(success(["status"]).clients).toContainEqual({ client, scope: scope[1] ?? "user", configured: true, transport: "http", url: hostedUrl });
  expect(run(["status"]).stdout).not.toContain("requires a workspace API key");
  expect(success([...args, "--local", "--force", "--allow-delete", "--allow-export"]).server.args).toEqual([...fallback, "--allow-delete", "--allow-export"]);
  expect(run(["status"]).stdout).toContain("requires a workspace API key");
});

it("gives Claude Desktop connector instructions without touching local config", async () => {
  const file = path.join(appData, "Claude/claude_desktop_config.json");
  await write(file, "{invalid local config");
  const manual = success(["add", "claude-desktop", "--force"]);
  expect(manual.action).toBe("manual");
  expect(manual.instructions).toContain("Settings → Connectors");
  expect(manual.instructions).toContain(hostedUrl);
  expect(await fs.readFile(file, "utf8")).toBe("{invalid local config");
  expect(run(["add", "claude-desktop", "--url", "https://example.test"]).stdout).toContain("https://example.test/api/mcp");
});

it("registers remote Claude Code and VS Code through their native CLIs", async () => {
  const manual = success(["add", "claude-code", "--scope", "project"]);
  expect(manual.command).toBe(`claude mcp add --transport http --scope project agentkit ${hostedUrl}`);
  await binary("claude", `
    const fs = require("node:fs");
    const args = process.argv.slice(2);
    if (args.slice(0, 7).join(" ") !== "mcp add --transport http --scope project agentkit") process.exit(1);
    fs.writeFileSync(".mcp.json", JSON.stringify({ mcpServers: { agentkit: { type: "http", url: args[7] } } }));
  `);
  expect(success(["add", "claude-code", "--scope", "project"]).action).toBe("add");
  expect(JSON.parse(await fs.readFile(path.join(project, ".mcp.json"), "utf8")).mcpServers.agentkit).toEqual({ type: "http", url: hostedUrl });
  await binary("code", `
    const fs = require("node:fs"), path = require("node:path");
    const [dirFlag, dir, addFlag, json] = process.argv.slice(2);
    if (dirFlag !== "--user-data-dir" || addFlag !== "--add-mcp") process.exit(1);
    const { name, ...server } = JSON.parse(json);
    fs.mkdirSync(path.join(dir, "User"), { recursive: true });
    fs.writeFileSync(path.join(dir, "User/mcp.json"), JSON.stringify({ servers: { [name]: server } }));
  `);
  const added = success(["add", "vscode"]);
  expect(JSON.parse(await fs.readFile(added.file, "utf8")).servers.agentkit).toEqual({ type: "http", url: hostedUrl });
});

it("rejects conflicting transports and local grant flags on remote registrations", async () => {
  expect(run(["add", "cursor", "--local", "--remote"]).stderr).toContain("either --remote or --local");
  for (const flags of [["--agent", uuid], ["--allow-writes"], ["--allow-delete"], ["--allow-export"]]) {
    const result = run(["add", "cursor", ...flags]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("workspace-wide");
  }
  await expect(fs.stat(path.join(home, ".cursor/mcp.json"))).rejects.toMatchObject({ code: "ENOENT" });
});

it("removes embedded credentials, query, path tokens and fragments from remote status", async () => {
  await write(path.join(home, ".cursor/mcp.json"), JSON.stringify({ mcpServers: { agentkit: { url: "https://user:secret@agentkit.test/path-secret?token=secret#secret" } } }));
  const result = run(["status", "--json"]);
  expect(result.stdout).not.toContain("secret");
  expect(result.stdout).toContain("https://agentkit.test/[redacted]");
});
