# Agentkit SDK, CLI and MCP

Manage Agentkit agents, knowledge sources, settings, email inboxes and API conversations from
Node.js. The package exports an ESM SDK, the `agentkit` executable and the `agentkit-mcp`
executable. Node 22+ is required. The SDK import does not load Commander; the combined package installs
Commander for the CLI.

The MIT-licensed package is published on npm as `@agikits/agentkit`. These
examples use the 0.5.0 CLI. To try it from this checkout, run
`npm ci` and invoke `node dist/cli/index.js` in place of `agentkit`.

Install the published CLI with `npm install -g @agikits/agentkit`, or run it
with `npx -p @agikits/agentkit agentkit`. See the
[CLI and MCP setup guide](https://agentkit.ai/docs/developer/cli-and-mcp).

## Connect

Run `agentkit auth login --browser` to approve access to a workspace. The CLI
prints an activation code and URL, opens the browser in an interactive terminal,
and saves the API key after you approve. For a manual key from the Agentkit
dashboard, run `agentkit auth login` and paste it at the hidden prompt. In scripts,
pipe the key from a secret manager into `agentkit auth login --with-token` or set
`AGENTKIT_API_KEY`.

```sh
agentkit auth status
agentkit agents list --json
agentkit projects --add demo <agent-uuid>
agentkit config set agent demo
agentkit sources list --json
```

`auth status` shows the workspace, credential source, scopes and where the
credential came from. Workspace keys reach every agent in the workspace within
their granted scopes. Keep keys on trusted systems, out of browser bundles and
shell history. A scope error names the permission the request requires.

Session-only commands for actions, secrets and Center Stage use a short-lived
Supabase access token. Set `AGENTKIT_SESSION_TOKEN` or pipe the token to `agentkit auth login --with-session-token`. Saved API keys
and session tokens are bound to their configured origin. The CLI lets sessions
expire on the server's schedule. Workspace keys can read the inbox and edit,
send, discard or restore reviewed email items within their scopes.
The published API specification observed November 25 includes browser login
and scoped keys. The 0.5.0 source commands require the source detail and
update routes. See [contract provenance](contracts/provenance.json) for the
reviewed product commit and deployed baseline.

The CLI sends no telemetry. Config lives in
`~/.config/agentkit/config.json`, or `AGENTKIT_CONFIG_DIR/config.json`. On POSIX,
config writes use a 0700 directory and atomically replace a 0600 file. Symlinks
and malformed files are rejected. Windows access follows the user's directory ACL.

Key precedence: `--key`, `AGENTKIT_API_KEY`, legacy `AGENTKIT_KEY`, saved config.
Endpoint precedence: `--url`, `AGENTKIT_URL`, saved config, `https://agentkit.ai`.
Endpoints must be HTTPS origins; explicit loopback HTTP is accepted for local
servers. Redirects, URL credentials, paths and query strings are rejected.
Aliases never override endpoints. No automatic `.env` or repository config loading.

`agentkit auth logout` revokes the saved API key on the server and clears saved
credentials. If revocation fails, it reports the failure and still clears the
local credentials. Use `auth logout --session` to remove only the saved session.
For a key supplied through an environment variable, revoke it in the dashboard
and unset the variable. Use `agentkit health` to check server connectivity.

## Commands

```sh
agentkit capabilities                 # offline support catalogue, not live status
agentkit agents list --json
agentkit settings design demo --json
agentkit settings instructions demo --file instructions.txt
agentkit sources add-text demo --title FAQ --file faq.txt
agentkit sources get demo <document-id> --json
agentkit sources update demo <document-id> --file corrected-faq.txt
agentkit train demo --status --json
agentkit conversations list demo --source widget --json
agentkit emails demo --status all --json
agentkit email demo <thread-id>
agentkit chat demo 'What are your opening hours?' --json
agentkit instagram status demo --json
agentkit channels list demo --json
agentkit actions list demo --json
agentkit secrets list demo --json
```

Commands with a project argument use the explicit project first, then
`AGENTKIT_AGENT_ID`, then the value saved by `agentkit config set agent <id|alias>`.
For example, `agentkit conversations get <conversation-id>` uses the default
agent. If a command also has an optional trailing argument and both forms fit,
a UUID or registered alias in the first position selects the project.

```sh
agentkit api GET /api/v2/agents --query limit=10
agentkit api PATCH /api/v2/agents/<agent-uuid> -f 'name=Help desk'
agentkit api POST /api/v2/agents --body @request.json
```

`agentkit api` accepts v2 paths beginning with `/api/v2/` and prints the JSON
response. Pass inline JSON, `@file` or `@-` for piped stdin with `--body`.
Repeat `-f key=value` for string fields in a JSON object, or use `--body` for
typed values. Repeat `--query key=value` for query parameters.

Use `--plain` for compact JSON and undecorated text, `--quiet` to hide progress
and hints, or `--no-input` to disable prompts and automatic browser opening.
Browser sign-in still prints the code and URL for manual approval.

`chat` defaults to the Playground channel for testing. Use `--channel api_v2`
for customer API conversations, including when continuing an existing API chat.
The selected channel must match the conversation being continued. Use
`conversations list/get/export --source playground` to inspect CLI tests.

Use each command's `--help` for arguments. Resource commands are canonical in help. Existing flat commands remain supported as hidden aliases.
Read [the command migration guide](MIGRATION.md) and the
[public REST/SDK/CLI coverage table](contracts/COVERAGE.md) in the repository.

Success data goes to stdout. `--json` requests JSON independently of TTY state.
Errors are a JSON envelope on stderr and exit nonzero. Human streaming text goes
to stdout, with metadata and pending tool calls on stderr. `tool-result --json`
collects the completed stream into one event array. Progress/cursor hints use
stderr. JSON-only commands such as health, projects and design always emit JSON.

Lists are paginated. Pass `pagination.cursor` back as `--cursor` while `hasMore`
is true. Page limits are 1-100; conversation export is 1-20. `source=all` includes
API v2, API Playground, widget and Instagram chats, not Center Stage or email;
`conversations get` defaults to `all`. Widget reads are supported by list/detail/export; message listing, per-user queries,
feedback, retry and continuation remain API-v2-only.

Email reads use the account API key. `emails <project>` defaults to `--status all`,
including discarded threads and their review reasons. Filter with
`--status to_review|sent|discarded|all` and `--since <iso>`; use `--limit` and
`--cursor` for paging. Email list responses use `pagination.nextCursor`.
`email <project> <thread-id>` prints message headers, plain-text bodies and draft
states; add `--json` for the complete thread. The SDK also exposes
`listEmailDrafts` and `getEmailMessage`. Discard, restore, reviewed draft edits and sends also accept an account API key. Use the grouped commands below
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
also require the last `updatedAt` value. Action creation, definition edits,
deletion and secret changes require a user session. The SDK can send action
toggles with a write-scoped key when the server supports it. Set secrets with stdin or `secrets set --env VARIABLE`; the CLI does not
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

## Connect an MCP client

Run `agentkit mcp add <client>` to register `https://agentkit.ai/api/mcp`.
Connect from the client and choose the workspace and scopes on the OAuth consent
screen. Use `--url` to select another API origin. For a local stdio server,
pass `--local` and save a workspace key with `agentkit auth login`.

```sh
agentkit mcp add                  # choose a detected client in an interactive terminal
agentkit mcp add claude-code
agentkit mcp add cursor --scope project --dry-run
agentkit mcp add codex --local --agent <uuid-1> <uuid-2> --allow-writes
agentkit mcp status --json
agentkit mcp remove cursor --scope project
```

| Client | Default user registration | Other scopes |
| --- | --- | --- |
| Claude Code | `claude mcp add --transport http --scope user` | `project` for shared `.mcp.json`, `local` for a private project registration |
| Codex | `[mcp_servers.agentkit]` in `~/.codex/config.toml` (honors `CODEX_HOME`) | |
| Cursor | `mcpServers` in `~/.cursor/mcp.json` | `project` for `.cursor/mcp.json` |
| VS Code | `code --add-mcp` for the default user profile | `project` for `servers` in `.vscode/mcp.json` |
| Claude Desktop | Settings → Connectors for hosted HTTP. `--local` writes `Claude/claude_desktop_config.json` | |
| Windsurf stable editor | `mcpServers` in `~/.codeium/windsurf/mcp_config.json` | |

Run project-scoped commands from the project root. On Windsurf, enable the
`windsurf` source in `chat.mcp.discovery.enabled` to load the editor discovery
file. Restart Claude Desktop after changing its configuration.

Pass an explicit client in scripts. Use `--name <server-name>` on add, remove
or status to select a different registration. Repeating an identical add makes
no change. Replacing a different registration requires `--force`. Add and remove
keep the previous file in a sibling `.bak` and support `--dry-run` and `--json`.

For `--local`, Agentkit stores the absolute path to `agentkit-mcp` from your PATH when available.
The client still needs Node.js to run that executable.
Otherwise the client runs `npx -y -p @agikits/agentkit agentkit-mcp`, which needs
npm on the client's PATH. The registration contains the launch command and flags.
Your workspace key and session stay in the CLI credential store or environment.

`status` checks local credentials and reads each detected client's configuration.
It reports registration separately for each scope and masks unrecognized server
arguments and URL credentials. The status check reads local files. Claude Desktop
manages hosted connectors in Settings. The stdio server needs a workspace API key.

## MCP

The same package provides a local stdio process and a stateless HTTP handler.
Both support the 2026-07-28 protocol and legacy initialization. Stateless HTTP
uses a fresh server for each request. It needs no separate persistent process or
session store. Public remote connectors still need a hosted HTTPS endpoint.

After `npm install -g @agikits/agentkit`, configure your MCP client with this entry.
`agentkit mcp` is an equivalent command for package launchers that select the
default executable.
Use `agentkit auth login` to save a workspace key first.

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

Read tools cover workspace identity, agents, knowledge, conversations, contacts,
leads, settings, channels and training status. Local stdio starts read-only.
`--allow-writes` enables agent and source changes, settings updates, action
toggles, training and chat. Training re-crawls web sources and spends training
credits. Chat persists messages and spends message credits. Agent creation
requires workspace-wide access. `--allow-delete` enables source deletion.
`--allow-export` enables full transcript export.

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
implement an authorization server.

Hosting options added in 0.4.0:

- `scopes` names the scopes the host's tokens carry, for example
  `{ read: "read", write: "write", delete: "delete", export: "export" }`. The
  default is `agentkit:read` and `agentkit:write`. A request whose token lacks
  the scope a tool needs gets 403 with an `insufficient_scope` challenge.
- `allowedOrigins` lists browser origins that may call the handler, or `"*"` for
  any. These get CORS headers and an `OPTIONS` preflight answer. The handler
  reads only the `Authorization` header and never cookies, so `"*"` does not
  expose a signed-in browser session.
- `serveMetadata: false` leaves the protected-resource metadata document to the
  host. The 401 challenge still points at its URL.
- An `http:` authorization server is accepted only for an `http:` resource on a
  loopback host.
- The `AgentkitClient` returned by `createClient` accepts `fetch`, so a host can
  dispatch API calls in-process instead of over the network.

Local [Codex and Cursor plugin files](distribution/README.md) are included.
Registry and marketplace submissions require published artifacts and real-client
checks. These files do not represent accepted listings.

## Agent skills

The four skills under `skills/` are `agentkit`,
`agentkit-knowledge`, `agentkit-conversations`, and `agentkit-channels`.
Copy the relevant skill folders into your coding agent's supported skills
location. Installation does not activate a skill automatically or authorize writes.
The package excludes internal chatlog-review instructions and local registries.

## Management workflow

The pinned management routes match the published Agentkit API specification.
An older self-hosted server needs that API revision. Existing API-key commands
continue to use their existing endpoints. This package does not deploy a server.

```sh
agentkit channels list <agent-id> --json
agentkit channels get <agent-id> web --json
agentkit channels web-presentation <agent-id> --file presentation.json
agentkit channels center-stage <agent-id> --json
```

Web presentation writes include `expectedRevision` from the preceding read.
Center Stage updates contain `settings` and `expectedRevision`.
Reload the settings after HTTP 409 and reconcile the edits before retrying.

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

## Email inbox

Use a workspace API key to read inbox threads and drafts. Draft edits and
sends also require email entitlement.
The published draft-approval schema matched the reviewed source on 2026-10-15,
as recorded in `contracts/provenance.json`. Authenticated workflow acceptance remains pending.

```sh
agentkit emails list demo --status discarded --since 2026-10-10T00:00:00Z
agentkit emails get demo <thread-id>
agentkit emails drafts list demo
agentkit emails drafts get demo <draft-id>
agentkit emails drafts edit demo <draft-id> --body-file reply.txt --expected-revision <revision>
agentkit emails send demo <draft-id> --expected-revision <revision>
```

Inbox lists default to all partitions. Pass `pagination.nextCursor` as `--cursor`
with the same filters. Detail retains full stored bodies and headers, structured
discard reasons and chronological messages. Unknown historical reasons stay
unknown; messages rejected before storage are unavailable. Reads do not mark
messages read.

Discard requires the reviewed detail's `--inbound-message-id`, plus its pending
`--draft-id` and `--draft-edited-at` when present. Restore requires the thread's
`--expected-revision`. Restoring creates review state and never generates or
sends a reply. Draft edit/send accept a workspace API key. They require the reviewed
draft revision and reject a changed draft, a newer inbound message or another reviewer's action. Reload after a conflict.
Send approves the existing draft. Retries retain its delivery identity.

For a source-linked install, run `npm ci && npm link`. Both run the existing
prepare/build hook. If scripts were skipped, run `npm run build` in the linked
checkout before invoking the CLI. `npm run verify:package` proves an isolated
checkout with no `dist` builds through install/link without touching a global
owner installation.
