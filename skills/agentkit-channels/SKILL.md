---
name: agentkit-channels
description: Read and configure Agentkit channels, Center Stage and Instagram automations. Use for email inbox review, presentation settings, instructions, action bindings or existing Instagram integrations.
---

# Channels

Run `agentkit channels list <agent> --json`, then `channels get <agent> <channel>`
to inspect effective instructions, entitlement, connection and saved overrides.
New management commands need the matching product API; a missing route is not
permission to call undocumented runtime endpoints.

Use `channels configure --help` for a complete override object. Preserve the
existing action allowlist and instruction mode unless the request changes them.
Use `channels web-presentation` for bubble/iframe toggles. Its write body needs
`expectedRevision` from the preceding channel read; reload on a conflict.

Use `channels center-stage <agent>` to read dedicated settings. To save, pass
`--file` with `{ "settings": <edited-settings>, "expectedRevision": <revision> }`.
Reading and saving require a user session. Saving also requires Center Stage plan access.

For Instagram, read `instagram status`, the automation or `instagram instances`
before editing. Connect/reconnect stays in the dashboard. Live/off changes and
permission refresh can affect Meta; act only within the request, read back sync
status, and never blindly retry a timeout. Keep existing unrelated JSON fields.

Report saved settings separately from tested live behavior; tests may consume credits or message users.

## Email

1. Read with a workspace API key. Use `emails <agent> --status all --json` and `email <agent> <thread-id>` for headers, plain-text bodies and draft states. Lists default to all partitions. Reuse `pagination.nextCursor` with the same filters. Detail supplies discard reasons and reviewed IDs and revisions. Reads leave message status unchanged.
2. Discard with the reviewed inbound ID and pending draft ID and editedAt when present. Restore with the thread revision to return the thread to review.
3. Read a draft with `emails drafts get`. Edit with `--body-file` and `--expected-revision`. Use `emails send` to approve the reviewed revision. Reload after a conflict. A send retry retains the same draft identity.
