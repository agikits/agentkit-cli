import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { isDeepStrictEqual, stripVTControlCharacters } from "node:util";
import type { Command } from "commander";
import spawn from "cross-spawn";
import { jwtExpired } from "../sdk/client.js";
import { redact, redactValue, resolveConfig } from "../shared/config.js";
import { printLine, printJsonLine } from "../shared/terminal.js";
import { isRecord } from "../shared/storage.js";
import { AGENT_ID } from "../shared/project.js";
import { clients, executable, type Client, type ClientConfig, type Target } from "./mcp-clients.js";
import { commitConfig, configEntry, contents } from "./mcp-config.js";

type LocalServer = { command: string; args: string[]; type?: "stdio" };
type Server = LocalServer | { url: string; type?: "http" } | { serverUrl: string };
type Options = { url?: string; remote?: boolean; local?: boolean; allowDelete?: boolean; allowExport?: boolean; agent?: string[]; allowWrites?: boolean; scope?: string; name: string; force?: boolean; dryRun?: boolean; json?: boolean; plain?: boolean; quiet?: boolean; input?: boolean };
const fallback = ["-y", "-p", "@agikits/agentkit", "agentkit-mcp"];
async function serverFor(client: Client, opts: Options): Promise<Server> {
  if (opts.remote && opts.local) throw new Error("Choose either --remote or --local.");
  if (!opts.local) {
    if (opts.agent || opts.allowWrites || opts.allowDelete || opts.allowExport) {
      throw new Error("--agent and --allow-* flags require --local. Remote OAuth grants are workspace-wide with scopes selected on the consent screen.");
    }
    const config = await resolveConfig({ url: opts.url }, { ignoreCredentials: true });
    const url = `${config.url}/api/mcp`;
    if (client === "windsurf") return { serverUrl: url };
    if (client === "claude-code" || client === "vscode") return { type: "http", url };
    return { url };
  }
  if (opts.agent?.some(id => !AGENT_ID.test(id))) throw new Error("--agent requires UUIDs.");
  const binary = executable("agentkit-mcp");
  const args = binary ? [] : [...fallback];
  if (opts.allowWrites) args.push("--allow-writes");
  if (opts.allowDelete) args.push("--allow-delete");
  if (opts.allowExport) args.push("--allow-export");
  if (opts.agent?.length) args.push("--agent", ...opts.agent);
  const server: LocalServer = { command: binary ?? "npx", args };
  if (client === "vscode") server.type = "stdio";
  return server;
}

function sameServer(existing: unknown, desired: Server) {
  if (!isRecord(existing)) return false;
  if (!("command" in desired)) return isDeepStrictEqual({ ...existing }, desired);
  const { type = "stdio", env = {}, args = [], ...rest } = existing;
  return type === "stdio" && isRecord(env) && !Object.keys(env).length &&
    isDeepStrictEqual({ ...rest, args }, { command: desired.command, args: desired.args });
}

function clean(value: string) {
  return redact(stripVTControlCharacters(value)).replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
}
function printJson(value: unknown, plain?: boolean) {
  printJsonLine(redactValue(value), plain ? undefined : 2);
}
function displayCommand(argv: string[]) {
  const win = process.platform === "win32";
  const words = argv.map(arg => {
    if (/^[a-z0-9@%_+=:,./-]+$/i.test(arg)) return arg;
    return "'" + arg.replaceAll("'", win ? "''" : "'\\''") + "'";
  });
  return (win && words[0]?.startsWith("'") ? "& " : "") + words.join(" ");
}

async function choose(id: string | undefined, operation: string, input?: boolean) {
  const all = clients();
  const detected = all.filter(client => client.detected);
  const choices = all.map(client => client.id).join(", ");
  if (!id && input !== false && process.stdin.isTTY && process.stderr.isTTY) {
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
  if (client.id === "claude-code" && "url" in server) return ["claude", "mcp", "add", "--transport", "http", "--scope", target.scope, name, server.url];
  if (client.id === "claude-code" && "command" in server) return ["claude", "mcp", "add", "--scope", target.scope, name, "--", server.command, ...server.args];
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
  const client = await choose(id, operation, opts.input);
  const target = client.targets.find(t => t.scope === (opts.scope ?? "user"));
  if (!target) throw new Error(`Supported scopes for ${client.id}: ${client.targets.map(t => t.scope).join(", ")}.`);
  const server = operation === "add" ? await serverFor(client.id, opts) : undefined;
  if (client.id === "claude-desktop" && server && "url" in server) {
    const instructions = `Open Claude Desktop Settings → Connectors, add a custom connector named ${opts.name} with URL ${server.url}, then sign in.`;
    if (opts.json) printJson({ action: "manual", client: client.id, name: opts.name, scope: target.scope, dryRun: !!opts.dryRun, server, instructions }, opts.plain);
    else printLine(clean(instructions));
    return;
  }
  const original = await contents(target.file);
  const entry = configEntry(target, original, opts.name);
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
  const notice = server && "command" in server && server.command === "npx" ? "agentkit-mcp was not found on PATH. Using the npx fallback." : undefined;
  if (opts.json) printJson({ action, dryRun: !!opts.dryRun, client: client.id, scope: target.scope, name: opts.name, file: target.file, server, removeFirst, command, notice }, opts.plain);
  else {
    printLine(clean(`${opts.dryRun ? "Dry run: " : ""}${action} ${opts.name} (${client.id}, ${target.scope}) in ${target.file}`));
    if (removeFirst) printLine(clean(`Run: ${removeFirst}`));
    if (manual && command) printLine(clean(`Run: ${command}`));
    else if (server && "command" in server) printLine(clean(displayCommand([server.command, ...server.args])));
    else if (server) printLine(clean("url" in server ? server.url : server.serverUrl));
    if (notice && !opts.quiet) printLine(notice);
  }
}

function statusArgs(entry: unknown): string[] {
  if (!isRecord(entry) || !Array.isArray(entry.args)) return [];
  // Other programs may store secrets in arbitrary positional arguments.
  return entry.args.map(arg => typeof arg === "string" &&
    (["--allow-writes", "--allow-delete", "--allow-export", "--agent", ...fallback].includes(arg) || AGENT_ID.test(arg)) ? arg : "[redacted]");
}

function transportDetails(entry: unknown) {
  if (!isRecord(entry)) return {};
  const remote = entry.url ?? entry.serverUrl;
  if (typeof remote === "string") {
    let display = "[redacted]";
    try {
      const url = new URL(remote);
      if (["https:", "http:"].includes(url.protocol)) {
        // Paths, query strings and userinfo in third-party entries can carry credentials.
        display = url.origin + (url.pathname === "/api/mcp" ? url.pathname : "/[redacted]");
      }
    } catch { /* Preserve the registration without printing arbitrary text. */ }
    return { transport: "http", url: display };
  }
  if (typeof entry.command === "string") return { transport: "stdio", args: statusArgs(entry) };
  return {};
}

async function status(opts: Options) {
  checkName(opts.name);
  const { key, sessionToken } = await resolveConfig({ url: opts.url }, { requireKey: false, allowSession: "optional" });
  const loggedIn = !!key || (!!sessionToken && !jwtExpired(sessionToken));
  const rows = [];
  let needsLocalKey = false;
  for (const client of clients().filter(c => c.detected)) {
    for (const target of client.targets) {
      if (opts.scope && target.scope !== opts.scope) continue;
      try {
        const { current } = configEntry(target, await contents(target.file), opts.name);
        if (isRecord(current) && typeof current.command === "string" && !(isRecord(current.env) && (current.env.AGENTKIT_API_KEY || current.env.AGENTKIT_KEY))) {
          const bin = path.basename(current.command).replace(/\.(cmd|exe|bat)$/i, "");
          if (bin === "agentkit-mcp" || (bin === "npx" && Array.isArray(current.args) && current.args.includes("agentkit-mcp"))) needsLocalKey = true;
        }
        rows.push({ client: client.id, scope: target.scope, configured: current !== undefined, ...transportDetails(current) });
      } catch {
        rows.push({ client: client.id, scope: target.scope, error: `Cannot read MCP configuration in ${target.file}.` });
        process.exitCode = 1;
      }
    }
  }
  if (opts.json) printJson({ loggedIn, mcpApiKeyConfigured: !!key, name: opts.name, clients: rows }, opts.plain);
  else {
    printLine(`Agentkit login: ${loggedIn ? "credentials configured" : "no credentials configured"}`);
    if (!key && needsLocalKey) printLine("Local Agentkit stdio requires a workspace API key.");
    if (!rows.length) printLine("No MCP clients detected for this scope.");
    for (const row of rows) {
      const state = row.error ?? (row.transport === "http" ? `configured, HTTP ${row.url}`
        : row.transport === "stdio" ? `configured, stdio args ${JSON.stringify(row.args)}` : row.configured ? "unrecognized registration" : "not configured");
      printLine(clean(`${row.client} (${row.scope}): ${opts.name} ${state}`));
    }
  }
}

export function registerMcpCommands(group: Command) {
  group.option("--remote", "Register hosted HTTP with mcp add (default)")
    .option("--local", "Register local stdio with mcp add")
    .hook("preAction", (_owner, action) => {
      if ((group.opts().remote || group.opts().local) && action.name() !== "add") {
        throw new Error("Use transport flags with agentkit mcp add <client>.");
      }
      if (group.optsWithGlobals().key) throw new Error("MCP keys must come from saved config or AGENTKIT_API_KEY, not command arguments.");
    });
  for (const operation of ["add", "remove", "status"] as const) {
    const cmd = group.command(operation).configureHelp({ showGlobalOptions: true }).description({
      add: "Register the hosted Agentkit MCP server with a client",
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
