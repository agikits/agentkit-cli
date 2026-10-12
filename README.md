# Agentkit SDK, CLI and MCP

Manage Agentkit agents, knowledge sources, settings, email inboxes and API conversations from
Node.js. The package exports an ESM SDK, the `agentkit` executable and the `agentkit-mcp`
executable. Node 22+ is required. The SDK import does not load Commander; the combined package installs
Commander for the CLI.

The release candidate is version 0.2.0 under the MIT license. The intended npm
package is `@agikits/agentkit`. It has not been published to npm. Build locally
with `npm ci && npm run build`, then use `node dist/cli/index.js`, or install
the tarball produced by `npm pack`.

## Connect

Obtain an API key from your Agentkit dashboard. API calls require the appropriate
workspace entitlement. Keys reach every agent in that workspace; keep them on a
trusted server, never in a browser bundle.

```sh
export AGENTKIT_API_KEY='your-token'
agentkit agents list --json
agentkit agents info <agent-uuid> --json
agentkit projects --add demo <agent-uuid>
agentkit sources list demo --json
```

Email, Center Stage, Widgets and most Backstage commands require a short-lived Supabase
user access token from an authenticated Agentkit session. Set
`AGENTKIT_SESSION_TOKEN`, or pipe it to `agentkit init --with-session-token`.
Saved API keys and session tokens are bound to their configured origin. Sessions
expire normally and are
never refreshed by the CLI. Workspace API keys remain the credential for ordinary
v2 methods.
All 75 pinned API paths and every component match the specification published at
agentkit.ai, observed 2026-10-12. Authenticated runtime acceptance remains a
separate release gate. Session, rollout and paid-plan requirements still apply.

A secret manager can pipe a token into `agentkit init --with-token`. Avoid putting
keys in command arguments or shell history. Config lives in
`~/.config/agentkit/config.json`, or `AGENTKIT_CONFIG_DIR/config.json`. On POSIX,
config writes use a 0700 directory and atomically replace a 0600 file. Symlinks
and malformed files are rejected. Windows access follows the user's directory ACL.

Key precedence: `--key`, `AGENTKIT_API_KEY`, legacy `AGENTKIT_KEY`, saved config.
Endpoint precedence: `--url`, `AGENTKIT_URL`, saved config, `https://agentkit.ai`.
Endpoints must be HTTPS origins; explicit loopback HTTP is accepted for local
servers. Redirects, URL credentials, paths and query strings are rejected.
Aliases never override endpoints. No automatic `.env` or repository config loading.

`logout` removes both saved credentials. Environment variables and server keys remain
active; revoke a key in the dashboard. `health` is an unauthenticated connectivity
check, not an authentication or entitlement test.

## Commands

```sh
agentkit capabilities                 # offline support catalogue, not live status
agentkit agents list --json
agentkit settings design demo --json
agentkit settings instructions demo --file instructions.txt
agentkit sources add-text demo --title FAQ --file faq.txt
agentkit train demo --status --json
agentkit conversations list demo --source widget --json
agentkit emails demo --status all --json
agentkit email demo <thread-id>
agentkit chat demo 'What are your opening hours?' --json
agentkit instagram status demo --json
agentkit channels list demo --json
agentkit actions list demo --json
agentkit secrets list demo --json
agentkit widgets list demo --json
agentkit backstage overview demo --json
```

`chat` defaults to the Playground channel for testing. Use `--channel api_v2`
for customer API conversations, including when continuing an existing API chat.
The selected channel must match the conversation being continued. Use
`conversations list/get/export --source playground` to inspect CLI tests.

Use each command's `--help` for arguments. Resource commands are canonical in help. Existing flat commands remain supported as hidden aliases.
Read [the command migration guide](MIGRATION.md) and the complete
[REST/SDK/CLI coverage table](contracts/COVERAGE.md) in the repository.

Success data goes to stdout. `--json` requests JSON independently of TTY state.
Errors are a JSON envelope on stderr and exit nonzero. Human streaming text goes
to stdout, with metadata and pending tool calls on stderr. `tool-result --json`
collects the completed stream into one event array. Progress/cursor hints use
stderr. JSON-only commands such as health, projects and design always emit JSON.

Lists are paginated. Pass `pagination.cursor` back as `--cursor` while `hasMore`
is true. Page limits are 1-100; conversation export is 1-20. `source=all` includes
API v2, API Playground and widget chats, not Instagram, Center Stage or every
channel. Widget reads are supported by list/detail/export; message listing, per-user queries,
feedback, retry and continuation remain API-v2-only.

Email reads use the account API key. `emails <project>` defaults to `--status all`,
including discarded threads and their review reasons. Filter with
`--status to_review|sent|discarded|all` and `--since <iso>`; use `--limit` and
`--cursor` for paging. Email list responses use `pagination.nextCursor`.
`email <project> <thread-id>` prints message headers, plain-text bodies and draft
states; add `--json` for the complete thread. The SDK also exposes
`listEmailDrafts` and `getEmailMessage`. Email sending, forwarding, discarding,
restoring and draft edits require a user session. Use the grouped commands below
for those operations.
The pinned published API specification includes these email reads. Their
authenticated runtime acceptance remains pending.

A pending client tool call needs a caller-supplied result. The CLI never executes
it automatically:

```sh
agentkit conversations tool-result demo <conversation-id> <tool-call-id> --file result.json --json
```

Deletion requires `--yes`. Retrying a reply removes that reply and later messages.
Training, chat and channel writes can spend credits or change live behavior.
Instagram commands are experimental; OAuth setup remains in the dashboard.

Custom API actions use a disabled-first workflow. Create one with
`actions create --file action.json`, test its destination and sample response,
then use `actions enable --expected-updated-at <timestamp>`. Updates and deletes
also require the last `updatedAt` value. Action and secret writes require a user
session. Set secrets with stdin or `secrets set --env VARIABLE`; the CLI does not
accept or print a positional secret value.

## SDK

```ts
import { AgentkitClient } from '@agikits/agentkit';

const controller = new AbortController();
const client = new AgentkitClient({
  key: process.env.AGENTKIT_API_KEY,
  timeoutMs: 60_000,
  signal: controller.signal,
});
const reply = await client.chat(agentId, { message: 'Hello', userId: 'demo' });
if (reply.pendingToolCall) {
  // Obtain an authorized result, then call client.submitToolResult(...).
} else {
  console.log(reply.parts);
}
```

SDK `chat` and `chatStream` preserve the API default of `api_v2`. Pass
`channel: "playground"` when testing.

`chatStream`, `retryStream` and `submitToolResult` return async iterators. Stream
errors and missing terminal markers throw; abandoning iteration cancels the
response body. `AgentkitError` exposes `code`, `status`, `details`, and available
`requestId`. Generated REST types derive from a pinned OpenAPI snapshot, with
reviewed runtime exceptions documented in [contracts/README.md](contracts/README.md).

All requests and streams have a total 60-second deadline by default. CLI
`--timeout <ms>` or SDK `timeoutMs` changes it. SIGINT cancels the CLI. There are
no automatic retries. A timeout after a write does not prove that the write
failed; read current state before resubmitting. URL-source creation returns a
job ID and retrain flag, not a document ID. Security rate limits are objects with
`maxMessages`, `windowSeconds` and `limitMessage`.

## MCP

The same package provides a local stdio process and a stateless HTTP handler.
Both support the 2026-07-28 protocol and legacy initialization. Stateless HTTP
uses a fresh server for each request. It needs no separate persistent process or
session store. Public remote connectors still need a hosted HTTPS endpoint.

After installing the reviewed tarball, configure your MCP client with this entry.
`agentkit mcp` is an equivalent command for package launchers that select the
default executable.
Use `agentkit init --with-token` to save a workspace key on stdin first.

```json
{
  "mcpServers": {
    "agentkit": {
      "command": "agentkit-mcp",
      "args": ["--agent", "YOUR_AGENT_UUID"]
    }
  }
}
```

Replace the UUID with the agent you want to expose. Omit `--agent` to permit
reads across the key's workspace, or repeat it for several agents. Do not put a
key in the JSON or command arguments. The process also accepts an explicit
`AGENTKIT_API_KEY` environment variable. Saved credentials cannot follow an
endpoint override to another origin. Environment credentials are the operator's
explicit choice for the selected endpoint. The process never prompts for login.

Eleven tools read agents, AI/design/security/notification/training settings,
knowledge sources, conversations and training status. Reads are enabled by
default. `--allow-writes` additionally exposes text-source creation and live
instruction updates. Agent creation is exposed only without an agent restriction.
Enabling writes permits those operations for the entire connection. Review your
client's confirmation settings. The server never starts training, sends messages
or emails, deletes resources, reads secrets, or executes arbitrary URLs or shell
commands. Conversations and instructions can contain private customer content.

Tool inputs reject unknown fields. Requests are capped at 128 KiB, stdio API
responses at 512 KiB, and tool results at 64 KiB. Oversized results fail with a
request for a smaller page. Upstream errors do not expose response bodies or
credentials. Credential redaction is local to each connection. There are no
automatic write retries.

The HTTP adapter is exported from `@agikits/agentkit/mcp` as
`createAgentkitHttpHandler`. Mount its `fetch` handler at the configured resource
URL and its corresponding `/.well-known/oauth-protected-resource/...` path. The
host must implement the `authorize` callback using an audited authorization
service. It must verify token issuer, resource audience, expiry, scopes, current
workspace membership and revocation, then construct the SDK client from that
workspace's credentials. The callback receives each request independently.
It must never read shared CLI configuration. Use `admit` for deployment rate
limits. Invalid tokens fail closed. A complete OAuth authorization service,
consent UI and hosted deployment are not included in this package.

Do not use a general Supabase user token as an MCP-scoped token. Tool visibility
does not reduce the database permissions attached to such a token. The HTTP
handler accepts only POST at the canonical resource URL and validates Host and
Origin. It publishes OAuth protected-resource metadata without claiming to
implement an authorization server. Browser clients from other origins need an
explicitly reviewed hosting integration.

Local [Codex and Cursor plugin files](distribution/README.md) are included.
Registry and marketplace submissions require published artifacts and real-client
checks. These files do not represent accepted listings.

## Agent skills

The tarball includes six short skills under `skills/`: `agentkit`,
`agentkit-knowledge`, `agentkit-conversations`, `agentkit-channels`, `agentkit-widgets`, and `agentkit-backstage`.
Copy the relevant skill folders into your coding agent's supported skills
location. Installation does not activate a skill automatically or authorize writes.
The package excludes internal chatlog-review instructions and local registries.

Center Stage, interactive Widgets and Backstage management use the management
commands and require user-session authentication where the coverage table says
so. Publishing a widget and approving a Backstage change require `--yes`.
`settings design` still configures the legacy shared Chat Bubble fields.

## Management workflow

The pinned management routes match the published Agentkit API specification.
An older self-hosted server needs that API revision. Existing API-key commands
continue to use their existing endpoints. This package does not deploy a server.

```sh
agentkit channels list <agent-id> --json
agentkit channels get <agent-id> web --json
agentkit channels web-presentation <agent-id> --file presentation.json
agentkit channels center-stage <agent-id> --json
agentkit widgets get <agent-id> <widget-id> --json
agentkit widgets save <agent-id> <widget-id> --file draft.json
agentkit backstage change <agent-id> <change-id> --json
```

Web presentation writes include `expectedRevision` from the preceding read.
Center Stage updates contain `settings` and `expectedRevision`. Widget saves
include `draft` and the Widget's `expectedUpdatedAt`. Reload and reconcile on
HTTP 409. Do not substitute a newer revision merely to force a write through.
Widget publication requires that same timestamp and `--yes`; imports create
drafts. Invalid source/package responses include compiler diagnostics.

Backstage chat emits JSON lines with session metadata and proposal displays.
Use a unique `--client-message-id` and retain the session ID. Read the exact
proposal before an authorized decision. A stale/failed/busy approval exits
nonzero; it is not reported as executed. Session reads contain the latest 40
messages, while session lists are paginated.

## Development and release preparation

```sh
npm ci
npm run check
npm test
npm run verify:package
npm run verify:export
npm run contracts:live       # read-only upstream drift check; needs network
npm run smoke:live           # dry run; no network or writes by default
```

`npm run contracts:generate` regenerates types only after the pinned spec and its
provenance checksum have been reviewed. `npm run export:private -- <new-directory>`
creates a sanitized repository candidate. It does not create a remote or publish
anything. CI validates builds, tests, exports and both executable installs. The
manual release workflow defaults to a dry run. See [release instructions](distribution/README.md).

The optional live smoke runner requires `--execute`, an exact dedicated test-agent
ID/name and a key. `--allow-paid-writes` additionally permits one chat plus a title
patch/readback/restore. It is a small smoke check, not the complete beta acceptance
suite, and has not been run against a live account.

The release remains 0.x. Breaking command/type changes require a minor version
and migration notes; patches preserve behavior. Node/server use is the tested
runtime target. Browser and worker support are not release claims yet.

Authoritative API docs: [overview](https://agentkit.ai/docs/developer/api-v2),
[errors](https://agentkit.ai/docs/developer/api-v2-errors), and
[OpenAPI](https://agentkit.ai/openapi.json). Do not post tokens or customer
transcripts in bug reports. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Email inbox and setup

Email inbox reads accept account API keys or an explicit user session. Email setup
and writes require a user session, the existing management API eligibility,
and the email rollout/plan gates. They target the published contract recorded in
`contracts/provenance.json`. Authenticated workflow acceptance remains pending.
Use `email` for settings and routing and `emails` for inbox threads and drafts.

```sh
agentkit channels enable demo email --address whystle
agentkit emails list demo --status discarded --since 2026-10-10T00:00:00Z
agentkit emails get demo <thread-id>
agentkit email reply-address add demo support@example.com
agentkit email reply-address status demo
agentkit email reply-address verify demo <six-digit-code>
agentkit email settings demo --auto-send off --signature-file signature.txt --signature on
agentkit email automated-senders add demo notifications@example.com
agentkit emails drafts list demo
agentkit emails drafts get demo <draft-id>
agentkit emails drafts edit demo <draft-id> --body-file reply.txt --expected-revision <revision>
agentkit emails send demo <draft-id> --expected-revision <revision>
```

Inbox lists default to all partitions. Pass `pagination.nextCursor` as `--cursor`
with the same filters. Detail retains full stored bodies and headers, structured
discard reasons and chronological messages. Unknown historical reasons stay
unknown; messages rejected before storage are unavailable. Reads do not mark
messages read or consume verification codes. Reply-address add/status do not
reveal a challenge code.

Discard requires the reviewed detail's `--inbound-message-id`, plus its pending
`--draft-id` and `--draft-edited-at` when present. Restore requires the thread's
`--expected-revision`. Restoring creates review state and never generates or
sends a reply. `emails draft` explicitly requests a draft without auto-send.
Draft edit/send require the reviewed draft revision and reject a changed draft,
a newer inbound message or another reviewer's action. Reload after a conflict.
Send approves the existing draft. Retries retain its delivery identity.

Forward requires `--to` and a stable UUID `--submission-id`, with optional
`--note-file`. If it times out, inspect inbox detail and retry only with the same
identity. Incomplete delivery states exit nonzero and remain distinct from sent
or already-sent success. No command automatically retries a write.

Settings patch only the supplied flags. Signature files are UTF-8 plain text;
an empty file clears text, and `--signature off` disables inclusion. Other email
settings remain untouched. Automated-sender entries are exact From addresses,
apply to future messages, and place those messages into review without actions
or auto-send. They do not authenticate a sender.

`--address` selects a new inbox's local part. Repeated enable preserves the
existing address, and requesting a different one conflicts. Renaming the agent
does not rename its inbox. Disabling preserves email history.

For a source-linked install, run `npm ci && npm link`. Both run the existing
prepare/build hook. If scripts were skipped, run `npm run build` in the linked
checkout before invoking the CLI. `npm run verify:package` proves an isolated
checkout with no `dist` builds through install/link without touching a global
owner installation.
