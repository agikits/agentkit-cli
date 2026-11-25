---
name: agentkit
description: Inspect and manage Agentkit agents, instructions, models, and settings through the Agentkit CLI. Use for account administration and agent configuration, not building an unrelated agent framework.
---

# Agentkit management

1. Run `agentkit --version` and the relevant command's `--help`. Use `agentkit capabilities` to distinguish supported management from dashboard-only features.
2. Resolve the target with `agentkit agents list --json`; use its UUID or an existing user alias. Health is unauthenticated and does not establish account access. With only a user session, use the exact agent UUID from the user or dashboard URL.
3. Read the current agent with `agentkit agents info <id> --json`. Save the fields the requested change affects, then apply the smallest patch that accomplishes it.
4. Read the changed setting again. Report the agent ID, changed fields, confirmed state and any unresolved outcome. A successful write response alone is not runtime verification.

Use `agentkit auth status` to check the workspace, credential source and scopes.
For manual input, use `agentkit auth login`. For browser approval, use
`agentkit auth login --browser`. In scripts, set `AGENTKIT_API_KEY` or pass a key
on stdin with `agentkit auth login --with-token`. For session-only management,
set `AGENTKIT_SESSION_TOKEN` or store a short-lived user token on stdin with
`agentkit auth login --with-session-token`. Keep credentials out of browser
bundles, command examples, reports and repositories. Select the API origin
through trusted user config or `--url`. Prefer an explicit project on writes
when a script might run under a different default agent.

For write recovery and settings examples, read [operations](references/operations.md). Honor the user's authorized scope; this skill does not grant permission to publish channels, delete agents or message their customers. Deletion cascades and requires `--yes`.

Custom API actions use `actions list|get|create|update|enable|disable|delete`.
Create actions disabled. Before enabling, verify the destination, variables,
named secret references and saved sample response. Pass the loaded `updatedAt`
to update, enable, disable and delete. Use `secrets set` with stdin or `--env`.
Never put a secret value in an argument, file, transcript or report.

For feature workflows, read the knowledge, conversations, channels, Widgets or Backstage skill.
