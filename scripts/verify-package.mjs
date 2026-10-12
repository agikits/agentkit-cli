import { mkdtemp, readFile, readdir, rm, mkdir, cp } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const exec = promisify(execFile);
const npm = 'npm';
const npmPath = process.env.npm_execpath;
assert(npmPath, 'Run this check with npm run verify:package');
const root = process.cwd();
const temp = await mkdtemp(path.join(tmpdir(), 'agentkit-package-'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
let server;
const env = { ...process.env, AGENTKIT_CONFIG_DIR: path.join(temp, 'config') };
for (const key of Object.keys(env)) if (key.startsWith('AGENTKIT_') && key !== 'AGENTKIT_CONFIG_DIR') delete env[key];
async function run(command, args, cwd = root, extraEnv = {}) {
  return exec(command === npm ? process.execPath : command, command === npm ? [npmPath, ...args] : args, { cwd, env: { ...env, ...extraEnv }, timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
}
async function verifyMcp(command, args, cwd) {
  const child = spawn(command, args, { cwd, env: { ...env, AGENTKIT_API_KEY: 'package-verification-fake-key' }, stdio: ['pipe', 'pipe', 'pipe'] });
  let buffered = '';
  let failure;
  let responses = 0;
  let sequence = 0;
  const pending = new Map();
  function fail(error) {
    failure = error;
    for (const { reject, timer } of pending.values()) { clearTimeout(timer); reject(error); }
    pending.clear();
  }
  child.on('error', fail);
  child.on('exit', code => { if (pending.size) fail(new Error(`MCP exited before response with code ${code}`)); });
  child.stderr.resume();
  child.stdout.on('data', chunk => {
    buffered += chunk.toString();
    try {
      assert(buffered.length < 1024 * 1024, 'MCP stdout exceeds protocol limit');
      let newline;
      while ((newline = buffered.indexOf('\n')) >= 0) {
        const line = buffered.slice(0, newline); buffered = buffered.slice(newline + 1);
        if (!line.trim()) continue;
        const message = JSON.parse(line);
        assert.equal(message.jsonrpc, '2.0', 'MCP stdout must contain only JSON-RPC');
        responses++;
        const waiter = pending.get(message.id);
        if (waiter) {
          pending.delete(message.id); clearTimeout(waiter.timer);
          if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
          else waiter.resolve(message.result);
        }
      }
    } catch (error) { fail(error); }
  });
  async function request(method, params) {
    if (failure) throw failure;
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`MCP ${method} timed out`)); }, 10000);
      pending.set(id, { resolve, reject, timer });
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }
  try {
    const initialized = await request('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'package-verification', version: '1.0.0' } });
    assert(initialized.serverInfo?.name, 'Installed MCP must identify itself');
    assert.equal(initialized.serverInfo.version, pkg.version);
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    const discovered = await request('tools/list', {});
    assert(discovered.tools?.length > 0, 'Installed MCP must expose tools');
    assert(discovered.tools.every(tool => tool.annotations?.readOnlyHint === true), 'Default MCP tool set must be read-only');
    assert(responses >= 2);
    assert.equal(buffered.trim(), '', 'No trailing stdout junk');
    if (failure) throw failure;
  } finally {
    for (const { timer } of pending.values()) clearTimeout(timer);
    child.stdin.end();
    child.kill();
  }
}
try {
  const packed = JSON.parse((await run(npm, ['pack', '--ignore-scripts', '--json', '--pack-destination', temp])).stdout)[0];
  assert(typeof pkg.name === 'string' && pkg.name.length > 0, 'Package must have an identity');
  assert.equal(pkg.bin?.agentkit, './dist/cli/index.js');
  assert.equal(pkg.bin?.['agentkit-mcp'], './dist/mcp/stdio.js');
  for (const file of packed.files) {
    assert(/^(dist\/|skills\/(agentkit|agentkit-knowledge|agentkit-conversations|agentkit-channels|agentkit-widgets|agentkit-backstage)\/|contracts\/|distribution\/|README\.md$|MIGRATION\.md$|CHANGELOG\.md$|LICENSE$|SECURITY\.md$|package\.json$)/.test(file.path), `Unexpected packed path: ${file.path}`);
    assert(!file.path.split('/').some(segment => /^\.env/i.test(segment) || ['.npmrc', 'auth.json', 'config.json', 'projects.json'].includes(segment)), `Private packed path: ${file.path}`);
    assert(!file.path.endsWith('.map'), 'Source maps must not ship without sources');
  }
  for (const required of ['LICENSE', 'SECURITY.md', 'dist/sdk/index.js', 'dist/mcp/index.js', 'dist/mcp/stdio.js']) assert(packed.files.some(file => file.path === required), `Missing packed file: ${required}`);
  const tarball = path.join(temp, packed.filename);
  const local = path.join(temp, 'local'); await mkdir(local);
  await run(npm, ['install', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', '--prefix', local, tarball]);
  const installed = path.join(local, 'node_modules', ...pkg.name.split('/'));
  const blacklist = [/\/Users\//, /~\/Sandbox\//, /Sideplan/, /Sandbox consumer/];
  try {
    const registry = JSON.parse(await readFile('projects.json', 'utf8'));
    for (const value of Object.values(registry.projects ?? {})) if (value.agentId) blacklist.push(new RegExp(value.agentId, 'i'));
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const file of packed.files) {
    const text = await readFile(path.join(installed, file.path), 'utf8');
    for (const pattern of blacklist) assert(!pattern.test(text), `Internal content in ${file.path}`);
  }
  assert(!((await readdir(path.join(local, 'node_modules'))).includes('typescript')), 'Install must not need dev dependencies');
  const bin = path.join(installed, 'dist/cli/index.js');
  assert.equal((await run(process.execPath, [bin, '--version'], local)).stdout.trim(), pkg.version);
  await run(process.execPath, [bin, '--help'], local);
  await run(process.execPath, ['--input-type=module', '-e', `import { AgentkitClient } from ${JSON.stringify(pkg.name)}; if (typeof AgentkitClient !== 'function') throw new Error('Missing SDK export');`], local);
  const mcpImport = await run(process.execPath, ['--input-type=module', '-e', `import { createAgentkitMcpServer, createAgentkitHttpHandler } from ${JSON.stringify(`${pkg.name}/mcp`)}; if (typeof createAgentkitMcpServer !== 'function' || typeof createAgentkitHttpHandler !== 'function') throw new Error('Missing MCP exports'); process.stdout.write('mcp-export-ok\\n');`], local);
  assert.equal(mcpImport.stdout, 'mcp-export-ok\n', 'MCP SDK import must be silent');
  await verifyMcp(process.execPath, [path.join(installed, 'dist/mcp/stdio.js')], local);
  await verifyMcp(process.execPath, [bin, 'mcp'], local);
  server = createServer((_req, res) => res.end(JSON.stringify({ status: 'ok', timestamp: 1 })));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  assert.equal(JSON.parse((await run(process.execPath, [bin, '--url', url, 'health', '--json'], local)).stdout).status, 'ok');
  await run(npm, ['exec', '--offline', '--prefix', local, '--', 'agentkit', '--version'], local);
  const global = path.join(temp, 'global');
  await run(npm, ['install', '--global', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', global, tarball]);
  const globalEntry = path.join(global, ...(process.platform === 'win32' ? [] : ['lib']), 'node_modules', ...pkg.name.split('/'), 'dist/cli/index.js');
  assert.equal((await run(process.execPath, [globalEntry, '--version'], local)).stdout.trim(), pkg.version);
  if (process.platform !== 'win32') assert.equal((await run(path.join(global, 'bin', 'agentkit'), ['--version'], local)).stdout.trim(), pkg.version);
  if (process.platform !== 'win32') await verifyMcp(path.join(global, 'bin', 'agentkit-mcp'), [], local);
  // Reproduce the linked checkout with no generated dist in an isolated prefix.
  // npm ci runs prepare, and npm link must also recover a removed build.
  const source = path.join(temp, 'source'); await mkdir(source);
  for (const entry of ['package.json', 'package-lock.json', 'tsconfig.json', 'src', 'scripts']) {
    await cp(path.join(root, entry), path.join(source, entry), { recursive: true });
  }
  const linked = path.join(temp, 'linked');
  await run(npm, ['ci', '--no-audit', '--no-fund'], source);
  await run(process.execPath, [path.join(source, 'dist/cli/index.js'), '--help'], source);
  await verifyMcp(process.execPath, [path.join(source, 'dist/mcp/stdio.js')], source);
  await rm(path.join(source, 'dist'), { recursive: true });
  await run(npm, ['link', '--no-audit', '--no-fund'], source, { npm_config_prefix: linked });
  const linkedBin = path.join(linked, ...(process.platform === 'win32' ? [] : ['bin']), process.platform === 'win32' ? 'agentkit.cmd' : 'agentkit');
  if (process.platform !== 'win32') await run(linkedBin, ['--help'], source);
  else await run(process.execPath, [path.join(source, 'dist/cli/index.js'), '--help'], source);
  await run(npm, ['run', 'build'], source);
  if (process.platform !== 'win32') await run(linkedBin, ['--help'], source);
  else await run(process.execPath, [path.join(source, 'dist/cli/index.js'), '--help'], source);
  if (process.platform !== 'win32') await verifyMcp(path.join(linked, 'bin', 'agentkit-mcp'), [], source);
  else await verifyMcp(process.execPath, [path.join(source, 'dist/mcp/stdio.js')], source);
  console.log('Isolated missing-dist source lifecycle passed: npm ci (prepare), remove dist, npm link (prepare), rebuild linked source, agentkit --help.');
  console.log(`Verified ${packed.files.length} packed files, isolated SDK/MCP exports, protocol-only MCP bins, health, npm exec and global install.`);
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
