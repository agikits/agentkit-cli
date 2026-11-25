# Release and distribution

These files prepare a release. `@agikits/agentkit` is published on npm and the
public repository is github.com/agikits/agentkit-cli; MCP Registry and marketplace
listings are separate and not yet approved.

## Public repository export

Run `npm run export:private -- /path/to/new-candidate` from the package directory.
The legacy script name remains for compatibility. It now accepts a reviewed
public candidate as well as the private source package. The export excludes local
project registries and credentials, refuses symlinks and audits every copied file.
Run `node scripts/verify-export.mjs` to verify the export guards.

The export copies checks and release workflows into `.github/workflows/`. Create
and review the public repository separately. Set package `private` to `false` and
set `repository.url` to that repository's exact `git+https://...git` URL. Keep the
lockfile identity in sync. Re-run the tests and package verification there.

## npm publication

[Trusted publishing](https://docs.npmjs.com/trusted-publishers/) requires npm
11.5.1 or newer and Node 22.14.0 or newer. This workflow uses Node 24 and npm 11 on
GitHub-hosted runners (npm 11.21 for `npm stage`). It defaults to a dry run. Configure the `npm-release`
environment with required reviewers and tag restrictions. Add a trusted publisher
for the exact repository, `release.yml` workflow and `npm-release` environment.
The publisher has `npm stage publish` permission, so every release also needs a
maintainer's 2FA approval on npmjs.com.

The package owner must authenticate for initial package setup if npm does not
allow configuring trusted publishing before the first version. Never add a
publishing token to this repository. After package setup, dispatch `publish`
against `v<package-version>`. The workflow checks identity and stages the version
(`npm stage publish`); a maintainer approves it on npmjs.com with 2FA, which
publishes it with the
`dist_tag` input (`latest` by default; choose `beta` for a version that has not
passed real-client checks). Public repositories and
packages receive OIDC provenance automatically.

## Local plugins

`codex/` and `cursor/` each contain a plugin manifest and stdio MCP configuration.
They use the installed `agentkit-mcp` executable. Install the package
with `npm install --global @agikits/agentkit`, run `agentkit auth login --with-token`
with the workspace key on stdin, then
restart the client so its PATH includes the global executable. Local configuration
is read by the MCP process. Do not put a workspace key in either plugin file.

Import the corresponding plugin directory into a client that supports local
plugins. Installation, discovery and a tool call must pass in the actual client
before marketplace submission. [Cursor's plugin reference](https://prod.cursor.com/docs/reference/plugins)
documents its manifest and public repository submission format. [OpenAI's plugin
packaging guide](https://developers.openai.com/plugins/build/plugins) documents the
Codex compatibility manifest. Public OpenAI MCP submission currently requires a
remote HTTPS endpoint or arrangements with OpenAI for local support. These local
files do not meet the hosted ChatGPT submission requirement.

## MCP Registry

`server.json` is the finalized identity candidate for `io.github.agikits/agentkit`
and `@agikits/agentkit@0.3.0`. It is **not published**. Its namespace still needs
verification by `mcp-publisher` and the repository URL must exist publicly.
`server.json.template` remains a generic template with deliberate placeholders.
Do not publish that template. [The Registry quickstart](https://modelcontextprotocol.io/registry/quickstart)
requires a verified namespace, a published package, and `mcpName` in package.json
matching the registry name. The package declares
`"mcpName": "io.github.agikits/agentkit"`. No remote endpoint is listed here.

The [official schema](https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json)
has no dedicated executable override. The candidate uses `runtimeHint: "npx"`
and a fixed `mcp` package argument. The package's default `agentkit` executable
provides this subcommand using the same MCP implementation as `agentkit-mcp`.
After 0.3.0 is published to npm, launch it with:

```sh
npx --yes @agikits/agentkit@0.3.0 mcp
```

This uses npm's inferred `agentkit` bin and selects MCP mode explicitly.
[npm documents binary inference](https://docs.npmjs.com/cli/v11/commands/npx/).
The candidate does not supply `--yes` or repeat the package spec in metadata.
The [Registry maintainer's guidance](https://github.com/modelcontextprotocol/registry/issues/650)
leaves default runtime and package inference to clients. Before publication,
exercise discovery and launch in each supported registry client. Metadata
validation does not establish publication or client approval.

The metadata passed the official JSON Schema check on 2026-10-12 using Ajv
with format validation. The candidate's name, package identity and version match
`package.json`. The namespace verification remains a publishing prerequisite.
Both compatibility manifests resolve to existing local MCP config files with
`command: "agentkit-mcp"`, no write flag and no embedded credential. These checks
do not replace loading and calling a tool in the actual applications.

Both local plugin manifests use documented compatibility formats. Cursor's
`mcpServers` path is an accepted field and resolves from the plugin root. OpenAI
continues to support `.codex-plugin/plugin.json` plus `.mcp.json`. These are not
portable Agent Plugins manifests, which require a root `$schema` declaration and
explicit `type: "stdio"`. Their existing installed binary launcher needs no
credential value and enables no write flag.

## Glama submission

[Glama's official instructions](https://glama.ai/mcp/faq) describe web submission
of a GitHub repository from Add MCP Server. The published
[Directory API schema](https://glama.ai/api/mcp/openapi.json) exposes read endpoints
and a usage-telemetry POST, with no server-submission endpoint. GitHub CLI access
alone therefore has no documented submission route. A public repository is a
prerequisite, not proof of a listing. No Glama account connection, web submission,
or indexing claim has been made. Extra account setup cannot be ruled out from the
public documentation.

For Smithery, Glama and other catalogs, reuse the verified package identity,
license, tool descriptions, installation command and security policy. Each
submission needs its own current format and real-client verification. Record the
actual published listing URLs after acceptance.
