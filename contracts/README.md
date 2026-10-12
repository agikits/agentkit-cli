# Contract maintenance

`openapi.json` is a snapshot of the product's public specification.
`provenance.json` records the product commit, source file and SHA-256 of the
snapshot with LF line endings. It is not a claim that the same commit is
deployed. `coverage.json` accounts for each REST operation and its SDK/CLI
coverage. Tests exercise every wrapper's route/method.

After reviewing an upstream change, update the snapshot/provenance, run
`npm run contracts:generate`, review the type diff, and update typed fixtures and
coverage. CI checks generation and checksum; the optional read-only live check
reports drift instead of silently updating types.

Runtime exceptions: the server can return `scopes: null` when Instagram grant
readback is unavailable, although the current public schema declares an array.
`InstagramChannelConnected` widens that field explicitly. SSE is tested separately
because the spec describes the stream as an opaque string. TypeScript's indexed
recursive JSON limitation is handled with an equivalent standalone `JsonValue`
alias during generation.

Fixtures use synthetic account metadata and validate representative requests/responses. The Widget version fixture includes a real compiler result from the product reference-widget definition. Route
coverage plus a spec fixture is not proof of live runtime parity. Authenticated
live acceptance remains a separate opt-in release gate.

The 2026-10-12 observation found all 75 published paths and every component
matching the specification rendered from product commit
`60b92034dd4ad2246b9f749937e24a492ae3c467`. All five imported source modules
were checked against that commit. The previous 35-path baseline was stale.
The only change from the client snapshot was the channel configuration
description documenting WhatsApp access on eligible plans. Requests, responses,
security declarations and TypeScript type definitions did not change.

`deploymentStatus: "schema-observed"` records the published specification, not
successful authenticated calls. `authenticatedRuntimeAcceptance: "pending"`
keeps that release gate explicit. The checksummed `deployed-openapi.json` now
matches the reviewed snapshot, and `contracts:live` checks live paths and
components against that snapshot. While a future candidate has status `pending`,
the live check compares against its separately reviewed observed baseline. It
reports drift without asserting that candidate routes are absent from production.
