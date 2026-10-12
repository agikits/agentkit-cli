---
name: agentkit
description: Inspect and manage Agentkit agents, instructions, models, and settings through the Agentkit CLI. Use for account administration and agent configuration, not building an unrelated agent framework.
---

# Agentkit management

1. Run `agentkit --version` and the relevant command's `--help`. Use `agentkit capabilities` to distinguish supported management from dashboard-only features.
2. Resolve the target with `agentkit agents list --json`; use its UUID or an existing user alias. Health is unauthenticated and does not establish account access. With only a user session, use the exact agent UUID from the user or dashboard URL.
3. Read the current agent with `agentkit agents info <id> --json`. Save the fields the requested change affects, then apply the smallest patch that accomplishes it.
4. Read the changed setting again. Report the agent ID, changed fields, confirmed state and any unresolved outcome. A successful write response alone is not runtime verification.

Use `AGENTKIT_SESSION_TOKEN` for user-bound management; store it with `init --with-session-token` via stdin. It expires and cannot bypass MFA or rollout gates. Use `AGENTKIT_API_KEY` or `agentkit init --with-token` with token stdin. Never place an account key in browser code, command examples, reports or a repository. Aliases contain IDs only; endpoint selection belongs to trusted user config or explicit `--url`.

For write recovery and settings examples, read [operations](references/operations.md). Honor the user's authorized scope; this skill does not grant permission to publish channels, delete agents or message their customers. Deletion cascades and requires `--yes`.

Custom API actions use `actions list|get|create|update|enable|disable|delete`.
Create actions disabled. Before enabling, verify the destination, variables,
named secret references and saved sample response. Pass the loaded `updatedAt`
to update, enable, disable and delete. Use `secrets set` with stdin or `--env`.
Never put a secret value in an argument, file, transcript or report.

For feature workflows, read the knowledge, conversations, channels, Widgets or Backstage skill.
