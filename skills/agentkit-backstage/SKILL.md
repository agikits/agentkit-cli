---
name: agentkit-backstage
description: Inspect Agentkit through Backstage, run assistant sessions and review proposed changes using the CLI. Use for Backstage workflows and explicit proposal decisions.
---

# Backstage

Start with `backstage overview <agent>` for bounded inventory. Session commands
require the matching management API and a user access token. Account keys cannot
approve changes. MFA, account access and rollout permissions still apply.

Use `backstage chat <agent> <message> --client-message-id <unique-id>`; pass
`--session-id` to continue. Output is JSON lines with text, session metadata and
proposal displays. Retain the returned session ID. Chat consumes credits; stop
on errors rather than automatically retrying with a fresh message ID.

Recover using `backstage sessions` with cursors and `backstage session` to read
the latest 40 messages. Do not describe that bounded response as a full export.
A stopped or timed-out turn may have persisted; inspect before another write.

For proposals, run `backstage change <agent> <changeId>` and show the exact diff
and target. Approve only an explicitly authorized change using
`backstage decide <agent> <changeId> approve --yes`; rejection uses `reject`.
Never approve a proposal just because the assistant suggested it. A stale,
expired, busy or failed change needs inspection, not blind replay.

Read back affected resources after execution. Report the change ID and actual
state; approval requested is not execution completed. Delete a session only
when requested with its exact ID and `backstage delete-session --yes`.
