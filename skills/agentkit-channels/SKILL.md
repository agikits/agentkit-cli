---
name: agentkit-channels
description: Read and configure Agentkit channels, Center Stage and Instagram automations. Use for email inbox setup and review, presentation settings, instructions, action bindings or existing Instagram integrations.
---

# Channels

Run `agentkit channels list <agent> --json`, then `channels get <agent> <channel>`
to inspect effective instructions, entitlement, connection and saved overrides.
New management commands need the matching product API; a missing route is not
permission to call undocumented runtime endpoints.

Use `channels configure --help` for a complete override object. Preserve the
existing action allowlist and instruction mode unless the request changes them.
For email, send `instructionMode: "inherit"` and `instructionOverride: null`.
Only its action allowlist changes through this route. The email prompt addition
stays untouched.
Use `channels web-presentation` for bubble/iframe toggles. Its write body needs
`expectedRevision` from the preceding channel read; reload on a conflict.

Use `channels center-stage <agent>` to read dedicated settings. To save, pass
`--file` with `{ "settings": <edited-settings>, "expectedRevision": <revision> }`.
This needs a user session, rollout access and entitlement. Shared `settings design`
changes the Chat Bubble and is not a Center Stage editor.

For Instagram, read `instagram status`, the automation or `instagram instances`
before editing. Connect/reconnect stays in the dashboard. Live/off changes and
permission refresh can affect Meta; act only within the request, read back sync
status, and never blindly retry a timeout. Keep existing unrelated JSON fields.

Interactive Widgets and Backstage have their own skills. Report saved settings
separately from tested live behavior; tests may consume credits or message users.

## Email

1. For setup or writes, establish a user session and read `email settings <agent>` and `channels get <agent> email`. Session operations retain management eligibility, rollout and plan gates.
2. Enable with `channels enable <agent> email [--address local-part]`. First enable fixes the inbox address. Repeat enable reads/preserves it; another requested address conflicts.
3. Read with an account API key or user session. Use `emails <agent> --status all --json` and `email <agent> <thread-id>` for headers, plain-text bodies and draft states, or `emails list <agent>` and `emails get <agent> <thread-id>`. Lists default to all partitions. Reuse `pagination.nextCursor` with the same filters. Detail supplies complete bodies, headers, discard reasons and reviewed IDs/revisions; reads do not mark mail read. Historical mail rejected before storage remains absent.
4. For reply routing, use `email reply-address add`, read the delivered code from the inbox or destination mailbox, then `verify` and `status`. Add/status never return the challenge code.
5. Patch only requested `email settings` flags. Signature files contain UTF-8 plain text; an empty file clears text. Use exact `email automated-senders` addresses for future mail that should reach review. Exceptions authorize review visibility, not sender authentication or actions.
6. Discard with the reviewed inbound ID and pending draft ID/editedAt. Restore with the thread revision; restoration never generates or sends. Request a draft explicitly with `emails draft`, then read it with `emails drafts get`.
7. Edit with `--body-file` and `--expected-revision`. Send approves that reviewed draft revision. Reload after a conflict. A send retry retains the same draft identity. Forward uses a stable UUID `--submission-id`; read detail after timeout and retain that identity on retry. Report delivered, already delivered, conflict and unresolved separately.

Use each operation's `--help` for required reviewed values. Disabling preserves
history and does not delete the inbox. Report saved configuration separately from
verified message delivery.
