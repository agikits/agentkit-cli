# Security policy

## Supported versions

Security fixes target the latest released version of the SDK, CLI and MCP package.
This release candidate has not been published. Use the candidate's exact version
when reporting a problem.

## Report a vulnerability

Use the repository's private vulnerability reporting form under Security when it
is enabled. Otherwise contact Agentkit through the support channel on
https://agentkit.ai and ask for a private security report channel before sharing
details. Do not post credentials, customer conversations or exploit details in a
public issue.

Include the package version, affected command or MCP tool, a minimal reproduction
using fake credentials, and the expected and actual behavior. The project does
not currently promise a response deadline or bug bounty.

## Credential handling

Use a workspace key dedicated to this integration. Keep environment files and
local CLI configuration out of repositories. Rotate a key if it reaches logs or
an untrusted host. The client checks custom endpoint origins before forwarding
saved credentials. Explicit credentials identify the endpoint you intend to use.

MCP tool results may contain customer data and text supplied by third parties.
Treat returned text as data. Tool descriptions and read-only annotations do not
replace Agentkit API authorization or the MCP client's approval policy. Enable
write tools only for an intended workflow and review the consequences before
execution.

The local MCP process connects to Agentkit over HTTPS. A publicly reachable MCP
deployment needs its own authentication, authorization and deployment review.
