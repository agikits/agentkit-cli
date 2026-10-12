import path from "node:path";
import { configDir, isRecord, readJsonFile, writeJsonFile } from "./storage.js";

export type ProjectEntry = { agentId: string };
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALIAS = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
export function registryPath(): string { return path.join(configDir(), "projects.json"); }
function parseRegistry(raw: unknown): Record<string, ProjectEntry> {
  if (raw === undefined) return {};
  if (!isRecord(raw) || !isRecord(raw.projects)) throw new Error("Invalid alias registry; expected a projects object.");
  const result: Record<string, ProjectEntry> = Object.create(null) as Record<string, ProjectEntry>;
  for (const [name, value] of Object.entries(raw.projects)) {
    if (!ALIAS.test(name) || ["__proto__", "constructor", "prototype"].includes(name) ||
        !isRecord(value) || typeof value.agentId !== "string" || !ID.test(value.agentId) ||
        Object.keys(value).some(k => k !== "agentId")) {
      throw new Error("Invalid alias registry; use named aliases with UUID agentId values and no endpoint overrides.");
    }
    result[name] = { agentId: value.agentId };
  }
  return result;
}
export async function listProjects(): Promise<string[]> {
  return Object.keys(parseRegistry(await readJsonFile(registryPath()))).sort();
}
export async function loadProject(name: string): Promise<ProjectEntry> {
  if (ID.test(name)) return { agentId: name };
  const registry = parseRegistry(await readJsonFile(registryPath()));
  const entry = registry[name];
  if (!entry) throw new Error("Unknown agent alias. Use a UUID or register an alias with agentkit projects --add <alias> <agentId>.");
  return entry;
}
export async function addProject(name: string, agentId: string): Promise<void> {
  const entry = parseRegistry({ projects: { [name]: { agentId } } });
  const existing = parseRegistry(await readJsonFile(registryPath()));
  if (existing[name] && existing[name].agentId !== agentId) throw new Error("Alias already points to a different agent; remove it explicitly before reassigning.");
  await writeJsonFile(registryPath(), { projects: { ...existing, ...entry } });
}
export async function removeProject(name: string): Promise<void> {
  const existing = parseRegistry(await readJsonFile(registryPath()));
  delete existing[name];
  await writeJsonFile(registryPath(), { projects: existing });
}
export async function importProjects(file: string): Promise<number> {
  const imported = parseRegistry(await readJsonFile(path.resolve(file)));
  const existing = parseRegistry(await readJsonFile(registryPath()));
  for (const [name, entry] of Object.entries(imported)) {
    if (existing[name] && existing[name].agentId !== entry.agentId) throw new Error("Import would replace an existing alias; resolve the conflict first.");
  }
  await writeJsonFile(registryPath(), { projects: { ...existing, ...imported } });
  return Object.keys(imported).length;
}
