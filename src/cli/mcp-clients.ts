import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export type Client = "claude-code" | "codex" | "cursor" | "vscode" | "claude-desktop" | "windsurf";
export type Scope = "user" | "project" | "local";
export type Target = { file: string; keys: string[]; scope: Scope };
export type ClientConfig = { id: Client; targets: Target[]; detected: boolean; cli?: string };

export function executable(name: string): string | undefined {
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ".com"] : [""];
  for (const dir of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    for (const ext of extensions) {
      const file = path.resolve(dir, name + ext);
      try {
        accessSync(file, constants.X_OK);
        if (statSync(file).isFile()) return file;
      } catch { /* Keep looking on PATH. */ }
    }
  }
}

function localProject(cwd: string): string {
  let dir = cwd;
  while (!existsSync(path.join(dir, ".git"))) {
    const parent = path.dirname(dir);
    if (parent === dir) return cwd;
    dir = parent;
  }
  // Claude shares local-scope settings across linked Git worktrees.
  if (statSync(path.join(dir, ".git")).isFile()) {
    const git = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: dir, encoding: "utf8", timeout: 3000 });
    const common = git.stdout?.trim();
    if (git.status === 0 && common && path.basename(common) === ".git") return path.dirname(common);
  }
  return dir;
}

export function clients(): ClientConfig[] {
  const home = homedir();
  const cwd = realpathSync(process.cwd());
  const data = process.platform === "darwin" ? path.join(home, "Library/Application Support")
    : process.platform === "win32" ? process.env.APPDATA || path.join(home, "AppData/Roaming")
    : process.env.XDG_CONFIG_HOME || path.join(home, ".config");
  const claudeConfig = process.env.CLAUDE_CONFIG_DIR || path.join(home, ".claude");
  const claudeGlobal = path.join(process.env.CLAUDE_CONFIG_DIR || home, ".claude.json");
  const codexHome = process.env.CODEX_HOME || path.join(home, ".codex");
  const user = (file: string, ...keys: string[]): Target => ({ file, keys, scope: "user" });
  const project = (file: string, key: string): Target => ({ file: path.join(cwd, file), keys: [key], scope: "project" });
  function client(id: Client, bin: string | undefined, markers: string[], targets: Target[], app?: string): ClientConfig {
    const appPaths = app && process.platform === "darwin"
      ? [path.join("/Applications", app + ".app"), path.join(home, "Applications", app + ".app")] : [];
    let cli = bin && executable(bin);
    if (!cli && id === "vscode") cli = appPaths.map(p => path.join(p, "Contents/Resources/app/bin/code")).find(existsSync);
    return { id, cli, targets, detected: !!cli || [...markers, ...appPaths, ...targets.map(t => t.file)].some(p => existsSync(p)) };
  }
  return [
    // https://code.claude.com/docs/en/mcp#choose-the-right-scope
    client("claude-code", "claude", [claudeConfig], [
      user(claudeGlobal, "mcpServers"), project(".mcp.json", "mcpServers"),
      { file: claudeGlobal, keys: ["projects", localProject(cwd), "mcpServers"], scope: "local" },
    ]),
    // https://developers.openai.com/codex/mcp/
    client("codex", "codex", [codexHome], [user(path.join(codexHome, "config.toml"), "mcp_servers")]),
    // https://cursor.com/docs/mcp
    client("cursor", "cursor", [path.join(home, ".cursor"), path.join(data, "Cursor")], [
      user(path.join(home, ".cursor/mcp.json"), "mcpServers"), project(".cursor/mcp.json", "mcpServers"),
    ], "Cursor"),
    // https://code.visualstudio.com/docs/agents/reference/mcp-configuration
    client("vscode", "code", [path.join(data, "Code")], [
      user(path.join(data, "Code/User/mcp.json"), "servers"), project(".vscode/mcp.json", "servers"),
    ], "Visual Studio Code"),
    // https://modelcontextprotocol.io/docs/develop/connect-local-servers
    client("claude-desktop", undefined, [path.join(data, "Claude")], [
      user(path.join(data, "Claude/claude_desktop_config.json"), "mcpServers"),
    ], "Claude"),
    // Stable editor discovery file: https://docs.devin.ai/windsurf/plugins/cascade/mcp#mcp_config-json
    client("windsurf", "windsurf", [path.join(home, ".codeium/windsurf"), path.join(data, "Windsurf")], [
      user(path.join(home, ".codeium/windsurf/mcp_config.json"), "mcpServers"),
    ], "Windsurf"),
  ];
}
