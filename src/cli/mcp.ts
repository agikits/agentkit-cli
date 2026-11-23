import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { isDeepStrictEqual, stripVTControlCharacters } from "node:util";
import type { Command } from "commander";
import spawn from "cross-spawn";
import { jwtExpired } from "../sdk/client.js";
import { redact, resolveConfig } from "../shared/config.js";
import { isRecord } from "../shared/storage.js";
import { AGENT_ID } from "../shared/project.js";
import { clients, executable, type ClientConfig, type Target } from "./mcp-clients.js";
import { commitConfig, configEntry, contents } from "./mcp-config.js";

type Server = { command: string; args: string[]; type?: "stdio" };
type Options = { agent?: string[]; allowWrites?: boolean; scope?: string; name: string; force?: boolean; dryRun?: boolean; json?: boolean };
const fallback = ["-y", "-p", "@agikits/agentkit", "agentkit-mcp"];
function serverFor(opts: Options): Server {
  if (opts.agent?.some(id => !AGENT_ID.test(id))) throw new Error("--agent requires UUIDs.");
  const binary = executable("agentkit-mcp");
  const args = binary ? [] : [...fallback];
  if (opts.allowWrites) args.push("--allow-writes");
  if (opts.agent?.length) args.push("--agent", ...opts.agent);
  return { command: binary ?? "npx", args };
}

function sameServer(existing: unknown, desired: Server) {
  if (!isRecord(existing)) return false;
  const { type = "stdio", env = {}, args = [], ...rest } = existing;
  return type === "stdio" && isRecord(env) && !Object.keys(env).length &&
    isDeepStrictEqual({ ...rest, args }, { command: desired.command, args: desired.args });
}

function clean(value: string) {
  return redact(stripVTControlCharacters(value)).replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
}
function printJson(value: unknown) {
  console.log(JSON.stringify(value, (_key, val: unknown) => typeof val === "string" ? clean(val) : val, 2));
}
function displayCommand(argv: string[]) {
  const win = process.platform === "win32";
  const words = argv.map(arg => {
    if (/^[a-z0-9@%_+=:,./-]+$/i.test(arg)) return arg;
    return "'" + arg.replaceAll("'", win ? "''" : "'\\''") + "'";
  });
  return (win && words[0]?.startsWith("'") ? "& " : "") + words.join(" ");
}

async function choose(id: string | undefined, operation: string) {
  const all = clients();
  const detected = all.filter(client => client.detected);
  const choices = all.map(client => client.id).join(", ");
  if (!id && process.stdin.isTTY && process.stderr.isTTY) {
    const available = detected.length ? detected : all;
    const prompt = createInterface({ input: process.stdin, output: process.stderr });
    try {
      const answer = (await prompt.question(available.map((c, i) => `${i + 1}. ${c.id}`).join("\n") + "\nChoose an MCP client: ")).trim();
      id = available.find(c => c.id === answer)?.id ?? available[Number(answer) - 1]?.id;
    } finally { prompt.close(); }
  }
  if (!id) throw new Error(`Detected clients: ${detected.map(c => c.id).join(", ") || "none"}. Run agentkit mcp ${operation} <client>. Choices: ${choices}.`);
  const selected = all.find(client => client.id === id);
  if (!selected) throw new Error(`Unknown MCP client. Choices: ${choices}.`);
  return selected;
}

function checkName(name: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name) || Object.hasOwn(Object.prototype, name) || name === "prototype") {
    throw new Error("Use a server name starting with a letter or digit and containing only letters, digits, underscores or hyphens.");
  }
}

function addCommand(client: ClientConfig, target: Target, name: string, server: Server) {
  if (client.id === "claude-code") return ["claude", "mcp", "add", "--scope", target.scope, name, "--", server.command, ...server.args];
  if (client.id === "vscode" && target.scope === "user") return ["code", "--add-mcp", JSON.stringify({ name, ...server })];
}

// Let the native client produce its entry in a disposable profile. Merge just that
// entry into the destination so a failed --force never removes the previous server.
async function nativeEntry(cli: string, argv: string[], target: Target, name: string, server: Server) {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "agentkit-mcp-add-"));
  try {
    const cwd = await fs.realpath(scratch);
    const profile = path.join(cwd, "profile");
    const vscode = argv[0] === "code";
    const args = vscode ? ["--user-data-dir", profile, ...argv.slice(1)] : argv.slice(1);
    const env: NodeJS.ProcessEnv = { HOME: cwd, USERPROFILE: cwd, CLAUDE_CONFIG_DIR: profile, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" };
    for (const key of ["PATH", "PATHEXT", "SystemRoot", "ComSpec", "TMP", "TEMP", "TMPDIR", "LANG"]) {
      if (process.env[key]) env[key] = process.env[key];
    }
    env.APPDATA = env.LOCALAPPDATA = profile;
    const result = spawn.sync(cli, args, { cwd, env, timeout: 30_000, stdio: "ignore", windowsHide: true });
    if (result.error || result.status !== 0) throw new Error(`${argv[0]} failed to register the MCP server. Check that its MCP command is available.`);
    const file = vscode ? path.join(profile, "User/mcp.json")
      : target.scope === "project" ? path.join(cwd, ".mcp.json") : path.join(profile, ".claude.json");
    const keys = target.scope === "local" ? ["projects", cwd, "mcpServers"] : target.keys;
    const { current } = configEntry({ ...target, file, keys }, await contents(file), name);
    if (!sameServer(current, server)) throw new Error(`${argv[0]} did not create the expected MCP entry.`);
    return current;
  } finally { await fs.rm(scratch, { recursive: true, force: true }); }
}

async function change(operation: "add" | "remove", id: string | undefined, opts: Options) {
  checkName(opts.name);
  const client = await choose(id, operation);
  const target = client.targets.find(t => t.scope === (opts.scope ?? "user"));
  if (!target) throw new Error(`Supported scopes for ${client.id}: ${client.targets.map(t => t.scope).join(", ")}.`);
  const original = await contents(target.file);
  const entry = configEntry(target, original, opts.name);
  const server = operation === "add" ? serverFor(opts) : undefined;
  if (server && client.id === "vscode") server.type = "stdio";
  const exists = entry.current !== undefined;
  const unchanged = server ? sameServer(entry.current, server) : !exists;
  if (server && exists && !unchanged && !opts.force) throw new Error(`A different ${opts.name} entry exists in ${target.file}. Use --force to replace it.`);
  const argv = server ? addCommand(client, target, opts.name, server) : undefined;
  const manual = !!argv && !client.cli && !unchanged;
  const action = unchanged ? "unchanged" : manual ? "manual" : operation === "remove" ? "remove" : exists ? "replace" : "add";
  if (!unchanged && !opts.dryRun && !manual) {
    const value = argv && client.cli && server ? await nativeEntry(client.cli, argv, target, opts.name, server) : server;
    await commitConfig(target.file, original, entry.update(value));
  }
  const command = argv && displayCommand(argv);
  const removeFirst = manual && exists && client.id === "claude-code"
    ? displayCommand(["claude", "mcp", "remove", "--scope", target.scope, opts.name]) : undefined;
  const notice = server?.command === "npx" ? "agentkit-mcp was not found on PATH. Using the npx fallback." : undefined;
  if (opts.json) printJson({ action, dryRun: !!opts.dryRun, client: client.id, scope: target.scope, name: opts.name, file: target.file, server, removeFirst, command, notice });
  else {
    console.log(clean(`${opts.dryRun ? "Dry run: " : ""}${action} ${opts.name} (${client.id}, ${target.scope}) in ${target.file}`));
    if (removeFirst) console.log(clean(`Run: ${removeFirst}`));
    if (manual && command) console.log(clean(`Run: ${command}`));
    else if (server) console.log(clean(displayCommand([server.command, ...server.args])));
    if (notice) console.log(notice);
  }
}

function statusArgs(entry: unknown): string[] {
  if (!isRecord(entry) || !Array.isArray(entry.args)) return [];
  // Other programs may store secrets in arbitrary positional arguments.
  return entry.args.map(arg => typeof arg === "string" &&
    (["--allow-writes", "--agent", ...fallback].includes(arg) || AGENT_ID.test(arg)) ? arg : "[redacted]");
}

async function status(opts: Options & { url?: string }) {
  checkName(opts.name);
  const { key, sessionToken } = await resolveConfig({ url: opts.url }, { requireKey: false, allowSession: "optional" });
  const loggedIn = !!key || (!!sessionToken && !jwtExpired(sessionToken));
  const rows = [];
  for (const client of clients().filter(c => c.detected)) {
    for (const target of client.targets) {
      if (opts.scope && target.scope !== opts.scope) continue;
      try {
        const { current } = configEntry(target, await contents(target.file), opts.name);
        rows.push({ client: client.id, scope: target.scope, configured: current !== undefined, args: statusArgs(current) });
      } catch {
        rows.push({ client: client.id, scope: target.scope, error: `Cannot read MCP configuration in ${target.file}.` });
        process.exitCode = 1;
      }
    }
  }
  if (opts.json) printJson({ loggedIn, mcpApiKeyConfigured: !!key, name: opts.name, clients: rows });
  else {
    console.log(`Agentkit login: ${loggedIn ? "credentials configured" : "no credentials configured"}`);
    if (loggedIn && !key) console.log("MCP requires a workspace API key. Only a CLI session is configured.");
    if (!rows.length) console.log("No MCP clients detected for this scope.");
    for (const row of rows) {
      const state = row.error ?? (row.configured ? `configured, args ${JSON.stringify(row.args)}` : "not configured");
      console.log(clean(`${row.client} (${row.scope}): ${opts.name} ${state}`));
    }
  }
}

export function registerMcpCommands(group: Command) {
  group.option("--remote", "Use the hosted MCP server (unavailable)")
    .hook("preAction", () => {
      if (group.opts().remote) throw new Error("Remote MCP server is not available yet");
      if (group.optsWithGlobals().key) throw new Error("MCP keys must come from saved config or AGENTKIT_API_KEY, not command arguments.");
    });
  for (const operation of ["add", "remove", "status"] as const) {
    const cmd = group.command(operation).configureHelp({ showGlobalOptions: true }).description({
      add: "Register the local Agentkit MCP server with a client",
      remove: "Remove a named MCP registration from a client",
      status: "Show local API key and client registration status",
    }[operation]).option("--name <server-name>", "Server registration name", "agentkit")
      .option("--scope <scope>", operation === "status" ? "Filter by user, project or local scope" : "Configuration scope: user (default), project or local");
    if (operation === "status") {
      cmd.action(() => {
        const opts = cmd.optsWithGlobals<Options>();
        if (opts.scope && !["user", "project", "local"].includes(opts.scope)) throw new Error("Choose user, project or local scope.");
        return status(opts);
      });
    } else {
      cmd.argument("[client]", "claude-code, codex, cursor, vscode, claude-desktop or windsurf")
        .option("--dry-run", "Print the proposed change without writing");
      if (operation === "add") cmd.option("--force", "Replace a different registration with this name");
      cmd.action((client?: string) => change(operation, client, cmd.optsWithGlobals<Options>()));
    }
  }
}
