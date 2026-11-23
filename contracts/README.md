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

The 2026-10-15 observation found the entire published specification, including all
75 paths and every component, matching the reviewed snapshot. All five imported
source modules at product commit `863df61169ffb9f22879ba02e3505d5dba823a97`
match previously reviewed source `642eac92ecc8b3ff4d6a923cf153fe996b9e18da`.
The change from the 2026-10-12 deployed baseline is the two draft edit/send
operations accepting account API keys alongside user sessions, with an optional
session-mode header. Request and response schemas did not change.

The 2026-11-22 observation, after product commit `679686ff` (PR #804) deployed,
found the published specification matching the snapshot again. Its only change is
that thread discard and restore accept account API keys alongside user sessions,
which also shortens the session-only description on the other email writes.

The 2026-11-23 observation, after product commit `76cec23a` (PR #813) deployed,
adds an optional per-file `size` to upload-URL requests, reserved against the
account upload budget, plus 429 on URL creation and 409 on repeat registration.

`deploymentStatus: "schema-observed"` records the published specification, not
successful authenticated calls. `authenticatedRuntimeAcceptance: "pending"`
keeps that release gate explicit. The checksummed `deployed-openapi.json` now
matches the reviewed snapshot, and `contracts:live` checks live paths and
components against that snapshot. While a future candidate has status `pending`,
the live check compares against its separately reviewed observed baseline. It
reports drift without asserting that candidate routes are absent from production.
