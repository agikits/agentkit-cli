import fs from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function configDir(): string {
  return process.env.AGENTKIT_CONFIG_DIR || path.join(os.homedir(), ".config", "agentkit");
}

function missing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

async function checkPath(file: string, directory = false): Promise<void> {
  try {
    const stat = await fs.lstat(file);
    if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile())) {
      throw new Error("Agentkit config paths must be regular files in a real directory, not symlinks.");
    }
  } catch (error) {
    if (!missing(error)) throw error;
  }
}

export async function readJsonFile(file: string): Promise<unknown> {
  await checkPath(path.dirname(file), true);
  await checkPath(file);
  let handle;
  try {
    handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  } catch (error) {
    if (missing(error)) return undefined;
    throw new Error("Cannot read Agentkit configuration.");
  }
  try {
    return JSON.parse(await handle.readFile("utf8")) as unknown;
  } catch {
    throw new Error("Invalid Agentkit configuration JSON; repair or remove the file.");
  } finally {
    await handle.close();
  }
}

export async function writeJsonFile(file: string, value: unknown): Promise<void> {
  const dir = path.dirname(file);
  await checkPath(dir, true);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await checkPath(dir, true);
  if (process.platform !== "win32") await fs.chmod(dir, 0o700);
  await checkPath(file);
  const temp = path.join(dir, `.agentkit-${randomUUID()}.tmp`);
  try {
    const handle = await fs.open(temp, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify(value, null, 2) + "\n");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(temp, file);
  } finally {
    await fs.rm(temp, { force: true });
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
