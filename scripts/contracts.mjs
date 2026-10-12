import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import openapiTS, { astToString } from 'openapi-typescript';
const root = new URL('../', import.meta.url);
const snapshot = new URL('contracts/openapi.json', root);
const normalizeLines = value => value.replace(/\r\n/g, '\n');
const source = normalizeLines(await readFile(snapshot, 'utf8'));
const provenance = JSON.parse(await readFile(new URL('contracts/provenance.json', root), 'utf8'));
if (createHash('sha256').update(source).digest('hex') !== provenance.sha256) throw new Error('Spec checksum changed; review and update provenance.');
let generated = '// Generated from the pinned OpenAPI snapshot. Do not edit.\n' + astToString(await openapiTS(snapshot));
// TypeScript rejects an indexed-access self-reference in a schema property.
// A standalone recursive JSON alias preserves the exact JSON value contract.
generated = 'export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };\n' + generated.replace(/        JsonValue: [\s\S]*?(?=        Health:)/, '        JsonValue: JsonValue;\n');
const target = new URL('src/sdk/generated.ts', root);
if (process.argv.includes('--write')) await writeFile(target, generated);
else if (normalizeLines(await readFile(target, 'utf8')) !== normalizeLines(generated)) throw new Error('Generated types differ. Run npm run contracts:generate and review the diff.');
if (process.argv.includes('--live')) {
  const response = await fetch('https://agentkit.ai/openapi.json', { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`OpenAPI request failed: HTTP ${response.status}`);
  const live = await response.json();
  let liveSource = source;
  if (provenance.liveBaseline) {
    if (provenance.liveBaseline.path !== 'deployed-openapi.json') throw new Error('Live baseline must use deployed-openapi.json.');
    const baselineSource = normalizeLines(await readFile(new URL('contracts/deployed-openapi.json', root), 'utf8'));
    if (createHash('sha256').update(baselineSource).digest('hex') !== provenance.liveBaseline.sha256) throw new Error('Deployed baseline checksum changed.');
    if (provenance.deploymentStatus === 'schema-observed' && !isDeepStrictEqual(JSON.parse(baselineSource), JSON.parse(source))) throw new Error('Observed live baseline must match the reviewed snapshot.');
  }
  if (provenance.deploymentStatus === 'pending') {
    if (provenance.liveBaseline?.path !== 'deployed-openapi.json') throw new Error('Pending candidate needs an explicit deployed contract baseline.');
    liveSource = normalizeLines(await readFile(new URL('contracts/deployed-openapi.json', root), 'utf8'));
    if (createHash('sha256').update(liveSource).digest('hex') !== provenance.liveBaseline.sha256) throw new Error('Deployed baseline checksum changed.');
    console.log('No live-spec acceptance is recorded for the candidate. Comparing against the pinned observed baseline.');
  } else if (provenance.deploymentStatus === 'schema-observed') {
    console.log('Published OpenAPI was observed matching the pinned product source. Authenticated runtime acceptance remains a separate release gate.');
  }
  const pinned = JSON.parse(liveSource);
  const changed = [];
  for (const group of ['paths', 'components']) {
    const keys = new Set([...Object.keys(pinned[group]), ...Object.keys(live[group])]);
    for (const key of keys) if (!isDeepStrictEqual(pinned[group][key], live[group][key])) changed.push(`${group}.${key}`);
  }
  if (changed.length) { console.error('Upstream contract changed:\n' + changed.join('\n')); process.exitCode = 1; }
  else console.log('Live paths and components match the pinned contract.');
}
