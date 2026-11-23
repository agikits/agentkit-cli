import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseToml, patch } from "@decimalturn/toml-patch";
import { applyEdits, createScanner, findNodeAtLocation, getNodeValue, modify, parseTree, SyntaxKind, type Node, type ParseError } from "jsonc-parser";
import { isRecord } from "../shared/storage.js";
import type { Target } from "./mcp-clients.js";

export async function contents(file: string): Promise<string | undefined> {
  try {
    if (!(await fs.lstat(file)).isFile()) throw new Error(`Expected a regular config file at ${file}.`);
    return await fs.readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export function configEntry(target: Target, original: string | undefined, name: string) {
  const toml = target.file.endsWith(".toml");
  const source = original ?? (toml ? "" : "{}\n");
  let root: unknown;
  let tree: Node | undefined;
  try {
    const errors: ParseError[] = [];
    if (toml) root = parseToml(source);
    else {
      tree = parseTree(source, errors, { allowTrailingComma: true });
      let parent = tree;
      for (const key of [...target.keys, name]) {
        const matches: Node[] | undefined = parent?.children?.filter(property => property.children?.[0]?.value === key);
        if (matches && matches.length > 1) throw new Error();
        parent = matches?.[0]?.children?.[1];
      }
      root = tree && getNodeValue(tree);
    }
    if (errors.length || !isRecord(root)) throw new Error();
  } catch {
    // Parser diagnostics can contain credentials from an unrelated entry.
    throw new Error(`Invalid MCP configuration in ${target.file}.`);
  }
  let servers = root;
  for (const key of target.keys) {
    if (!Object.hasOwn(servers, key)) servers[key] = {};
    const child = servers[key];
    if (!isRecord(child)) throw new Error(`Expected an object at ${key} in ${target.file}.`);
    servers = child;
  }
  const current: unknown = Object.hasOwn(servers, name) ? servers[name] : undefined;
  return {
    current,
    update(value: unknown): string {
      if (toml) {
        if (value === undefined) delete servers[name];
        else servers[name] = value;
        try { return patch(source, root, { inlineTableStart: 3 }); }
        catch { throw new Error(`Cannot edit TOML in ${target.file}.`); }
      }
      const keys = [...target.keys, name];
      if (value === undefined && tree) {
        const prop = findNodeAtLocation(tree, keys)?.parent;
        if (!prop) return source;
        // jsonc-parser's deletion also consumes intervening comments. Remove the
        // property and one adjacent comma separately to keep sibling comments.
        const scanner = createScanner(source, true);
        scanner.setPosition(prop.offset + prop.length);
        const edits = [{ offset: prop.offset, length: prop.length, content: "" }];
        if (scanner.scan() === SyntaxKind.CommaToken) {
          edits.push({ offset: scanner.getTokenOffset(), length: 1, content: "" });
        } else {
          const siblings = prop.parent?.children ?? [];
          const previous = siblings[siblings.indexOf(prop) - 1];
          if (previous) {
            scanner.setPosition(previous.offset + previous.length);
            if (scanner.scan() === SyntaxKind.CommaToken) edits.unshift({ offset: scanner.getTokenOffset(), length: 1, content: "" });
          }
        }
        return applyEdits(source, edits);
      }
      const edits = modify(source, keys, value, { formattingOptions: { tabSize: 2, insertSpaces: true } });
      return applyEdits(source, edits);
    },
  };
}

async function atomicWrite(file: string, text: string, mode: number) {
  const temp = path.join(path.dirname(file), `.agentkit-${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temp, text, { flag: "wx", mode });
    await fs.rename(temp, file);
  } finally {
    await fs.rm(temp, { force: true });
  }
}

export async function commitConfig(file: string, original: string | undefined, next: string) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const lock = file + ".agentkit-lock";
  try {
    await fs.writeFile(lock, String(process.pid), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error(`Another edit holds ${lock}. Retry after it finishes, or delete the lock file if no agentkit command is running.`);
    throw error;
  }
  try {
    if (original !== await contents(file)) throw new Error(`Configuration changed in ${file}. Retry the command.`);
    const mode = original === undefined ? 0o600 : (await fs.stat(file)).mode & 0o777;
    if (original !== undefined) await atomicWrite(file + ".bak", original, 0o600);
    await atomicWrite(file, next, mode);
  } finally {
    await fs.unlink(lock);
  }
}
