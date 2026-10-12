import { AgentkitClient } from '../dist/sdk/index.js';
const execute = process.argv.includes('--execute');
const writes = process.argv.includes('--allow-paid-writes');
const id = process.env.AGENTKIT_SMOKE_AGENT_ID;
const name = process.env.AGENTKIT_SMOKE_AGENT_NAME;
if (!execute) {
  console.log(JSON.stringify({ dryRun: true, reads: ['health', 'getAgent', 'getDesign'], writes: writes ? ['one JSON chat', 'patch title and restore'] : [], requirements: 'Explicit test agent ID/name and AGENTKIT_API_KEY. Names must start cli-smoke-. No Instagram writes.' }, null, 2));
} else {
  if (!id || !name?.startsWith('cli-smoke-') || !process.env.AGENTKIT_API_KEY) throw new Error('Set AGENTKIT_SMOKE_AGENT_ID, AGENTKIT_SMOKE_AGENT_NAME beginning cli-smoke-, and AGENTKIT_API_KEY.');
  const client = new AgentkitClient({ key: process.env.AGENTKIT_API_KEY, timeoutMs: 60000 });
  await client.health();
  const agent = await client.getAgent(id);
  if (agent.name !== name) throw new Error('Test agent identity mismatch; no writes performed.');
  const before = await client.getDesign(id);
  if (!writes) console.log(JSON.stringify({ readsPassed: true, agentId: id, writes: false }));
  else {
    if (typeof before.title !== 'string' || !before.title) throw new Error('Test agent must have a title that can be restored.');
    const title = `CLI smoke ${Date.now()}`;
    let attempted = false;
    try {
      const reply = await client.chat(id, { message: 'Reply with OK. Do not call tools.', userId: 'cli-smoke' });
      if (reply.pendingToolCall || !reply.id) throw new Error('Chat needs follow-up; no settings write performed.');
      attempted = true;
      await client.updateDesign(id, { title });
      if ((await client.getDesign(id)).title !== title) throw new Error('Title readback did not match.');
    } finally {
      if (attempted) {
        const current = await client.getDesign(id);
        if (current.title !== title && current.title !== before.title) throw new Error('Concurrent title change; restore skipped. Reconcile the test agent manually.');
        if (current.title === title) await client.updateDesign(id, { title: before.title });
        if ((await client.getDesign(id)).title !== before.title) throw new Error('Cleanup not confirmed; stop further writes.');
      }
    }
    console.log(JSON.stringify({ smokePassed: true, agentId: id, restored: true, chatRequests: 1 }));
  }
}
