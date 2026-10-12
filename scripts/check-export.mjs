import { readdir, readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const forbiddenPaths = new Set(['projects.json', 'agent-instructions', 'agentkit-chatlogs-review', 'node_modules', '.git', '.npmrc', 'auth.json', 'config.json']);
const permittedDotPaths = new Set(['.github', '.gitignore', '.codex-plugin', '.cursor-plugin', '.mcp.json']);

export async function auditExport(root, { paths = [''], forbiddenValues = [] } = {}) {
  if ((await lstat(root)).isSymbolicLink()) throw new Error('Unexpected symlink at export root');
  async function walk(relative) {
    const full = path.join(root, relative);
    const name = path.basename(relative);
    if (forbiddenPaths.has(name) || /^\.env/i.test(name) || (name.startsWith('.') && !permittedDotPaths.has(name)) || /\.(pem|key|p12|pfx)$/i.test(name)) {
      throw new Error(`Forbidden export path: ${relative}`);
    }
    const stat = await lstat(full);
    if (stat.isSymbolicLink()) throw new Error(`Unexpected symlink: ${relative}`);
    if (stat.isDirectory()) {
      for (const entry of await readdir(full)) await walk(path.join(relative, entry));
      return;
    }
    if (!stat.isFile()) throw new Error(`Unexpected special file: ${relative}`);
    const body = await readFile(full, 'utf8');
    if (body.includes('\0')) throw new Error(`Unexpected binary file: ${relative}`);
    const normalized = relative.split(path.sep).join('/');
    // Auditor fixtures may mention internal paths. Customer-facing code and docs may not.
    if ((/^(src|skills|distribution)\//.test(normalized) || ['README.md', 'MIGRATION.md', 'CHANGELOG.md', 'SECURITY.md'].includes(normalized)) && /\/Users\/|~\/Sandbox\/|Sideplan|Sandbox consumer/.test(body)) {
      throw new Error(`Internal content: ${relative}`);
    }
    for (const value of forbiddenValues.filter(Boolean)) {
      if (body.toLowerCase().includes(value.toLowerCase())) throw new Error(`Internal identifier in ${relative}`);
    }
    if (name === 'package-lock.json') {
      const lock = JSON.parse(body);
      for (const entry of Object.values(lock.packages ?? {})) {
        if (entry.resolved && !entry.resolved.startsWith('https://registry.npmjs.org/')) throw new Error(`Private package URL in ${relative}`);
        if (entry.link) throw new Error(`Linked private dependency in ${relative}`);
      }
    }
  }
  for (const relative of paths) {
    assertRelative(relative);
    const parts = relative.split(/[\\/]/).filter(Boolean);
    // An allowlisted child must not traverse an unchecked symlink parent.
    for (let i = 1; i < parts.length; i++) {
      const prefix = path.join(...parts.slice(0, i));
      if ((await lstat(path.join(root, prefix))).isSymbolicLink()) throw new Error(`Unexpected symlink: ${prefix}`);
    }
    await walk(parts.length ? path.join(...parts) : '');
  }
}

function assertRelative(relative) {
  if (path.isAbsolute(relative) || path.win32.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error('Export selection must stay under its root');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const dir = process.argv[2];
  if (!dir) throw new Error('Pass an exported directory');
  await auditExport(dir, { forbiddenValues: process.argv.slice(3) });
  console.log('Export audit passed. No publication performed.');
}
