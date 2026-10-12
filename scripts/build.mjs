import { readFile, writeFile, rm, chmod } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
await writeFile(new URL('../src/sdk/version.ts', import.meta.url), `// Generated from package.json by scripts/build.mjs.\nexport const VERSION = ${JSON.stringify(pkg.version)};\n`);
await rm(new URL('../dist', import.meta.url), { recursive: true, force: true });
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], { stdio: 'inherit' });
await chmod(new URL('../dist/cli/index.js', import.meta.url), 0o755);
await chmod(new URL('../dist/mcp/stdio.js', import.meta.url), 0o755);
