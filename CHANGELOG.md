# Changelog

## 0.4.0 (unreleased)

Changes to the hosted handler exported from `@agikits/agentkit/mcp`. The CLI and the local stdio server behave as in 0.3.0.

- `createAgentkitHttpHandler` takes scope names from the host through `scopes` (`read`, `write`, and optional `delete` and `export`). The default stays `agentkit:read` and `agentkit:write`. A tool whose scope name the host leaves out is not registered.
- Add `allowedOrigins`. Listed browser origins, or any origin with `"*"`, get CORS headers and an answer to the `OPTIONS` preflight. Without it, requests carrying an `Origin` other than the resource origin still get 403.
- Accept an `http:` authorization server only when the resource itself is `http:` on a loopback host, so a local development server can be its own issuer.
- Add `serveMetadata: false` for hosts that publish the protected-resource metadata themselves.
- The 401 challenge carries `scope="<read scope> <write scope>"`, the default grant, because clients request exactly the scope the challenge names. When a presented bearer token is malformed, unknown, expired or revoked, the challenge also carries `error="invalid_token"` (RFC 6750 section 3.1); a request with no token gets none. A token without the read scope, or a `tools/call` for a tool whose scope the token lacks, gets 403 with `WWW-Authenticate: Bearer error="insufficient_scope", scope="<needed>"` before any API request is made.
- Export `MCP_TOOL_ACCESS`, the access class of every tool.
- Document that `AgentkitClient` accepts an injected `fetch`, which a host can use to dispatch API calls in-process.

## 0.3.0 (unreleased)

- Add browser approval, hidden API-key entry and stdin login under `agentkit auth login`. Add credential status and server-side key revocation. Keep `init` and `logout` as hidden aliases.
- Add `agentkit api` for JSON requests to v2 paths and report the required scope when a key lacks permission.
- Make project arguments optional when `AGENTKIT_AGENT_ID` or a default saved by `agentkit config set agent` supplies the agent.
- Add global `--plain`, `--quiet` and `--no-input` flags.

## 0.2.2

- Add `agentkit mcp add`, `remove` and `status` for local MCP clients. Registrations reuse the CLI login, support read-only or explicitly write-enabled access, and keep a backup when editing client configuration.

## 0.2.1

- MCP `conversations_get` and CLI `conversations get` search every source by default, so widget, Playground and Instagram chats no longer 404. Both accept `instagram` as a source.
- MCP `--agent` restrictions are case-insensitive, and `agents_list` returns every allowed agent instead of filtering one workspace page. `agents_list` returns id, name, url and createdAt only.
- MCP read errors no longer warn about completed writes; `settings_instructions_update` switches the preset to custom and rejects empty prompts. Tool parameters carry descriptions.
- Bare `agentkit` and empty command groups print help and exit 0. Every group has a description listing its subcommands.
- An expired saved session no longer shadows a valid API key on management commands. Add `logout --session`.
- `train` describes what it re-crawls and prints the server message when no web sources need a crawl.
- `sources file-upload-urls --size` declares file sizes so each URL reserves only what it needs (product PR agikits/agentkit#813); the pinned contract includes the new 429 and 409 responses.
- Table output strips terminal control sequences from API text. Passing both a text argument and `--file` is an error.

- Let workspace API keys discard and restore email threads (product PR agikits/agentkit#804). Discard and restore never send, generate or forward mail.
- Let workspace API keys edit and send explicitly reviewed email draft revisions. Keep setup and other email actions session-only; preserve revision conflicts and API key send audit identity.

## 0.2.0 (published 2026-11-23)

- Add eleven read-only MCP tools, optional agent restrictions and explicitly enabled writes.
- Add modern and legacy stdio support plus a stateless HTTP handler with per-request authorization and OAuth resource metadata.
- Bound MCP requests/results and SDK JSON/error bodies. Keep hosted credentials isolated per connection.
- Bind saved API keys to their origin and omit credentials from health requests.
- Prepare the MIT-licensed `@agikits/agentkit` package, both executable installs, sanitized exports and an OIDC release workflow. npm and marketplace publication are separate steps.
- Update dependencies to remove the advisories reported by the release audit.

## Earlier candidate work

- Preserve executable permissions when rebuilding a source-linked CLI.

- Add account-key email inbox reads with `emails` and `email`, including discarded threads, review reasons, status/since filters, cursor paging and plain-text message bodies. Existing setup and delivery commands remain session-only.
- Preserve source filters and pagination consumed by legacy parent commands when using resource subcommands; validate forwarded options against the subcommand's limits.
- Add executable regression tests, explicit stream failures and pending tool results.
- Derive REST types from a reviewed OpenAPI snapshot; correct URL jobs, settings and contact contracts.
- Support direct agent IDs, user aliases, stdin auth, canonical API-key environment variable and local logout.
- Make config writes atomic and private; reject alias endpoint overrides and unsafe origins.
- Add resource command groups while retaining flat commands.
- Add an offline capability catalogue and short public-facing management skills.
- Prepare private tarball/export checks and CI.

### Management compatibility

- Cover all 50 existing REST operations, including files, imports, leads and Instagram instances.
- Add 25 management operations for channels, Center Stage, interactive Widgets and Backstage. These require the matching product API revision.
- Add origin-bound user-session configuration, explicit Widget publication and Backstage decisions, and separate Widget/Backstage skills.
- Preserve settings/draft revisions and expose compiler diagnostics and incomplete decision states.
- Add custom API action CRUD, disabled-first enablement, encrypted secret metadata, and email action allowlists. Secret values are accepted only through stdin or a named environment variable.

### Email workflow parity

- Add 21 session-only email API operations for inbox visibility, discard/restore/forward, inbox provisioning, reply verification, settings, automated-sender preferences and reviewed drafts.
- Preserve full stored message bodies/headers and unknown historical discard reasons. Thread/draft mutations carry reviewed IDs or revisions and expose unresolved delivery states.
- Make resource commands canonical in help while retaining flat command aliases.
- Verify the no-dist source install and link lifecycle in an isolated npm prefix. The existing prepare hook builds both paths; no owner's global link is changed.
