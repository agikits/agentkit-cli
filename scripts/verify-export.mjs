import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { auditExport } from './check-export.mjs';

const temp = await mkdtemp(path.join(tmpdir(), 'agentkit-export-guards-'));
try {
  const safe = path.join(temp, 'safe');
  await mkdir(path.join(safe, 'src'), { recursive: true });
  await writeFile(path.join(safe, 'package.json'), JSON.stringify({ name: '@owner/renamed-client', private: false }));
  await writeFile(path.join(safe, 'src/index.ts'), 'export const safe = true;\n');
  await auditExport(safe);
  for (const name of ['.env', '.env.local', '.env.production', '.npmrc', 'auth.json', 'private.pem']) {
    const file = path.join(safe, 'src', name);
    await writeFile(file, 'fake-secret');
    await assert.rejects(auditExport(safe), /Forbidden export path/);
    await rm(file);
  }
  const secret = path.join(temp, 'secret');
  await writeFile(secret, 'fake-secret');
  const link = path.join(safe, 'src/link.ts');
  await symlink(secret, link);
  await assert.rejects(auditExport(safe), /Unexpected symlink/);
  await rm(link);
  const folder = path.join(temp, 'private-folder');
  await mkdir(folder);
  const nested = path.join(folder, 'approved');
  await mkdir(nested);
  const parentLink = path.join(safe, 'linked-parent');
  await symlink(folder, parentLink, 'dir');
  await assert.rejects(auditExport(safe, { paths: ['linked-parent/approved'] }), /Unexpected symlink/);
  await rm(parentLink);
  await symlink(folder, link, 'dir');
  await assert.rejects(auditExport(safe), /Unexpected symlink/);
  await rm(link);
  await writeFile(path.join(safe, 'src/index.ts'), 'const internal = "sample-internal-identifier";');
  await assert.rejects(auditExport(safe, { forbiddenValues: ['sample-internal-identifier'] }), /Internal identifier/);
  await writeFile(path.join(safe, 'src/index.ts'), 'export const safe = true;\n');
  await writeFile(path.join(safe, 'package-lock.json'), JSON.stringify({ packages: { dependency: { resolved: 'https://private.invalid/pkg.tgz' } } }));
  await assert.rejects(auditExport(safe), /Private package URL/);
  await rm(path.join(safe, 'package-lock.json'));
  const candidate = path.join(temp, 'candidate');
  execFileSync(process.execPath, ['scripts/export-private.mjs', candidate], { stdio: 'inherit' });
  await auditExport(candidate);
  for (const client of ['codex', 'cursor']) {
    const plugin = JSON.parse(await readFile(path.join(candidate, 'distribution', client, `.${client}-plugin/plugin.json`), 'utf8'));
    const configuration = JSON.parse(await readFile(path.join(candidate, 'distribution', client, plugin.mcpServers), 'utf8'));
    assert.equal(configuration.mcpServers.agentkit.command, 'agentkit-mcp');
    assert.deepEqual(configuration.mcpServers.agentkit.args, []);
    assert.equal(plugin.license, 'MIT');
  }
  const metadata = JSON.parse(await readFile(path.join(candidate, 'distribution/server.json.template'), 'utf8'));
  assert(metadata.name.includes('REPLACE_WITH_'));
  assert.equal(metadata.packages[0].transport.type, 'stdio');
  assert.equal(metadata.remotes, undefined);
  assert.equal(metadata.packages[0].environmentVariables[0].isSecret, true);
  console.log('Export guards passed for public renamed metadata, nested credentials, file/directory symlinks, identifiers, dependency URLs and a sanitized candidate.');
} finally {
  await rm(temp, { recursive: true, force: true });
}
