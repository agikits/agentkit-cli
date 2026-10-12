---
name: agentkit-widgets
description: Create, edit, import, export and publish Agentkit interactive Widgets through the CLI. Use for versioned Widget authoring, not Chat Bubble styling.
---

# Interactive Widgets

Use `widgets list <agent>` and `widgets get <agent> <widgetId>` first. These
commands require the new management API, a user session and Widget rollout access.
Read `widgets create --help` for the draft JSON body; a Widget draft includes
source and schema source. Runtime action bindings are separate configuration.

Save edits with `widgets save <agent> <widgetId> --file <json>`, including the
`expectedUpdatedAt` read from that Widget. Preserve unrelated draft fields.
On conflict, reload and reconcile; never replace the revision just to force a save.

Inspect compiler diagnostics and fix the draft before publication. Publish only
when requested, using `widgets publish <agent> <widgetId> --expected-updated-at <timestamp> --yes`.
Read back the Widget and `widgets versions` to confirm the version. Publication
is not proof that the Widget is attached to an action or works in live chat.

`widgets export` writes package JSON to stdout. `widgets import --file` expects
`{ "package": <exported-package> }` and creates a draft. Preserve package hashes;
use normal draft editing after import. Duplicate makes a separate draft.

Deletion needs the exact Widget ID and `--yes`. Status `draft` takes a published
Widget offline; `archived` hides it from the active list. Report these effects
before applying them within the user's scope. A timeout leaves an unknown outcome.
