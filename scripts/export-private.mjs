import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { auditExport } from './check-export.mjs';

const destination = process.argv[2];
if (!destination) throw new Error('Pass a new destination directory. No remote is created.');
const root = process.cwd();
const target = path.resolve(destination);
if (target === root || target.startsWith(`${root}${path.sep}`)) throw new Error('Export outside the source package to avoid recursive copies.');
const files = ['src', 'scripts', 'test', 'contracts', 'ci', 'distribution', 'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.test.json', 'vitest.config.ts', 'README.md', 'MIGRATION.md', 'CHANGELOG.md', 'LICENSE', 'SECURITY.md'];
const skills = ['agentkit', 'agentkit-knowledge', 'agentkit-conversations', 'agentkit-channels'];
const selected = [...files, ...skills.map(skill => `skills/${skill}`)];
let internalIds = [];
try {
  const registry = JSON.parse(await readFile('projects.json', 'utf8'));
  internalIds = Object.values(registry.projects ?? {}).flatMap(entry => entry.agentId ? [entry.agentId] : []);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
// Audit before cp, which could otherwise preserve a symlink to private source data.
await auditExport(root, { paths: selected, forbiddenValues: internalIds });
await mkdir(target); // refuse an existing directory, including a symlink
try {
  for (const file of selected) await cp(file, path.join(target, file), { recursive: true, dereference: false });
  await mkdir(path.join(target, '.github/workflows'), { recursive: true });
  await cp('ci/private-checks.yml', path.join(target, '.github/workflows/checks.yml'));
  await cp('ci/release.yml', path.join(target, '.github/workflows/release.yml'));
  await writeFile(path.join(target, '.gitignore'), 'node_modules/\ndist/\n*.tgz\n.env*\n.npmrc\n');
  const provenancePath = path.join(target, 'contracts/provenance.json');
  const internalKeys = new Set(['source', 'sourceModules', 'productBranch', 'productPullRequest']);
  const sanitize = value => {
    if (Array.isArray(value)) return value.map(sanitize);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value)
        .filter(([key]) => !internalKeys.has(key))
        .map(([key, entry]) => [key, sanitize(entry)]));
    }
    return value;
  };
  const provenance = sanitize(JSON.parse(await readFile(provenancePath, 'utf8')));
  await writeFile(provenancePath, JSON.stringify(provenance, null, 2) + '\n');
  await auditExport(target, { forbiddenValues: internalIds });
} catch (error) {
  await rm(target, { recursive: true, force: true });
  throw error;
}
console.log(`Sanitized candidate: ${target}. No repository, package, or marketplace publication performed.`);
