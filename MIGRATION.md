# Migrating the Agentkit CLI

## 0.3.0

Use `agentkit auth login` for a hidden API-key prompt,
`agentkit auth login --with-token` for piped keys, or
`agentkit auth login --browser` for workspace approval. `init` and `logout`
are hidden aliases. `auth logout` now revokes the saved key at its configured
origin before removing saved credentials. To remove only the local session,
use `auth logout --session`.

`auth status`, browser sign-in and server-side revocation need the new v2 auth
endpoints. If revocation is unavailable on an older server, the CLI reports the
error and removes the local credentials.

Existing commands still accept an explicit project. To omit it, set
`AGENTKIT_AGENT_ID` or save a default with `agentkit config set agent <id|alias>`.
Before reverting to 0.2.2, remove the `agent` field from the local CLI config if
you saved a default. You can use the environment variable with 0.3.0 to leave the
file compatible with 0.2.2.

## Earlier versions

Run `agentkit projects --import /path/to/old/projects.json` once to migrate aliases
into user config. Imports reject endpoint overrides and conflicting aliases.
Keep the old file as a backup; the package no longer loads it automatically.
Direct agent UUIDs work without a registry, including from a clean installation.

`AGENTKIT_API_KEY` is preferred. `AGENTKIT_KEY` remains a fallback. Global endpoint
flags now win consistently; aliases cannot supply endpoints. No repository config
or `.env` is loaded. Resource commands are canonical in help. Existing flat commands remain available as hidden aliases:

| Existing command | Resource command |
| --- | --- |
| `agents` | `agents list` |
| `info`, `create-agent`, `delete-agent` | `agents info`, `agents create`, `agents delete` |
| `sources`, `add-text`, `add-qna`, `add-url`, `delete-source` | `sources list`, `sources add-text`, `sources add-qna`, `sources add-url`, `sources delete` |
| `conversations`, `conversation`, `export`, `messages` | `conversations list`, `conversations get`, `conversations export`, `conversations messages` |
| `feedback`, `retry`, `tool-result` | `conversations feedback`, `conversations retry`, `conversations tool-result` |
| `contacts`, `add-contact` | `contacts list`, `contacts upsert` |
| `set-model`, `set-instructions`, `design`, `security` | `settings model`, `settings instructions`, `settings design`, `settings security` |
| `notifications`, `autotrain` | `settings notifications`, `settings training` |
| `instagram`, `ig-automation`, `ig-starters`, `ig-menu`, `ig-refresh-permissions` | `instagram status`, `instagram automation`, `instagram starters`, `instagram menu`, `instagram refresh-permissions` |

Commands still take the agent after the command: `agentkit agents info <id>`.
`chat` and `train` keep their existing names.

Corrected behavior: streamed failures now exit nonzero, truncated streams fail,
pending tool calls are visible, and human progress goes to stderr. Script against
explicit `--json`. URL-source creation now returns `UrlSourceJob`, security rate
limits require their full object, and REST types match the pinned API specification.
Missing/nullable fields and model enums may require TypeScript caller changes.

Since 0.2.0 the package is published on npm as `@agikits/agentkit`.
The executable remains `agentkit`; the added MCP executable is `agentkit-mcp`.
Retain the prior package/version and alias registry for rollback when replacing
an internal installation.

Saved API keys now carry an origin binding like saved sessions. A legacy key is
bound to the existing configured origin, or `https://agentkit.ai` when none was
saved. Changing only `--url`, `AGENTKIT_URL` or `init --url` cannot rebind that
credential. Supply a new token explicitly for the new origin. Health sends no
credentials. The SDK bounds JSON/error bodies to 16 MiB by default; override
`maxResponseBytes` deliberately when a trusted endpoint needs a larger result.

MCP is read-only by default. Existing CLI writes remain explicit CLI commands.
Local MCP writes require `agentkit-mcp --allow-writes`. Hosted access requires
a separate verified authorization provider. See the README for tool scope and
protocol support.

## New management commands

Existing account-key commands keep their authentication. Channel commands use
`AGENTKIT_SESSION_TOKEN` or the saved session when present. Common management
reads and configuration also accept the account key. Gated
operations fail locally without a session and never fall back to the key.
Store a short-lived user access token with `agentkit auth login --with-session-token` on stdin.
Saved sessions are bound to their origin.

The pinned routes match the published specification. An older self-hosted
server needs that revision. Existing Instagram status
stays at `/channels/instagram`; channel instructions use
`/channels/instagram/config`. `channels get`, `channels configure`, `channels
web-presentation` and `channels center-stage` expose those distinct settings.

Web presentation and Center Stage writes require `expectedRevision`.

Custom API action and secret writes also require a user session. New actions are
always disabled. Read `updatedAt`, pass it to update, enable, disable or delete,
and reload on HTTP 409. `secrets set` accepts stdin or `--env`; positional secret
values are intentionally unsupported.

## Email operations

`emails <project>` lists inbox threads and `email <project> <thread-id>` shows
plain-text message bodies. Both support `--json` and account API keys. The grouped
`emails list/get` and `emails drafts list/get` commands also support account keys.
Draft edit and send accept a workspace key with the reviewed revision, and
discard and restore accept a workspace key. The published draft-approval schema
matched the reviewed source on 2026-10-15. Authenticated runtime acceptance
remains pending.
Read `emails get` before mutating a thread and `emails drafts get` before editing
or sending. Discard takes the reviewed inbound/draft IDs and editedAt; restore,
edit and send take the reviewed revision. A conflict requires a fresh read.
Email pages return `pagination.nextCursor`, unlike older API lists' `cursor`.
Automated mail reasons become available for newly stored mail; absent historical
mail is not backfilled.
