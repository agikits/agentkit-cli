# Changelog

## 0.2.0 candidate

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
- Prepare private tarball/export checks and CI. No public release has occurred.

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
