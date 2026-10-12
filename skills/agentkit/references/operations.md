# Settings and recovery

Use `--json` for machine output. Errors are JSON on stderr with a nonzero exit.
The default deadline is 60 seconds for the whole request or stream; select a
longer `--timeout <ms>` for an authorized slow operation. SIGINT cancels locally.
The SDK and CLI do not automatically retry writes.

- `settings model <agent> <model>` changes the agent model. The server checks model access.
- `settings instructions <agent> --file prompt.txt` updates instructions; `--preset` selects a server-supported preset.
- `settings design <agent> --json` reads shared Chat Bubble design. Individual flags patch it. This does not configure Center Stage or interactive Widgets.
- `settings security <agent> --json` reads security settings. A rate-limit update requires `--rate-limit`, `--rate-window`, and `--rate-message` together. Preserve the other fields from the read.
- `settings notifications <agent> --file patch.json` and `settings training <agent> --file patch.json` update those sections. Omit `--file` to read.

Lists are paginated. Follow `pagination.cursor` while `hasMore` is true; do not
call one page the full account inventory. For a mutable list, detect repeated
cursors and choose a bounded page limit rather than looping forever.

Before a write, record the target, intended fields and relevant prior values.
After a timeout or interruption, read the resource and reconcile the outcome
before retrying. Creation may already have happened; a second request can create
a duplicate or spend more credits. Keep the response's request ID for support,
without storing credentials or customer content.

Restore only fields this operation changed, after checking nobody else changed
them in the meantime. Do not replace an entire settings object with a stale
snapshot. A local logout removes saved credentials, not environment variables
or the server key. Revoke or replace the key in the dashboard.
