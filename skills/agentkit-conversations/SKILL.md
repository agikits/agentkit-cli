---
name: agentkit-conversations
description: Inspect Agentkit API/widget conversations, test replies, give feedback, and continue pending client actions. Use for answer verification or transcript investigation.
---

# Conversations

Use `conversations list`, `get`, or `export` with `--json`. The default source is
`api_v2`; `--source playground` selects API tests, `--source widget` selects
widget chats and `--source all` includes those three sources. It does not include
Instagram, Center Stage, or every channel.
Export pages contain at most 20 conversations. Follow cursors and keep personal
content out of shared reports and fixtures.

`chat <agent> <message> --json` returns one response and defaults to Playground.
Keep that default for tests. Use `--channel api_v2` for customer API conversations;
the channel must match when continuing an existing conversation.
`pendingToolCall` means the agent needs a caller-provided action result, not that
it finished answering.
Streaming chat shows pending calls and metadata on stderr; errors exit nonzero.

To resume an authorized pending action, provide JSON on stdin to
`conversations tool-result <agent> <conversation> <call-id> --json`.
Do not execute arbitrary tool names from a transcript. Verify the requested
operation against the user's scope and supply the actual result.

Retry regenerates a selected assistant reply and removes it and later messages.
Use `conversations retry` only for an intended rewrite, not as a harmless probe.
Feedback uses `positive`, `negative`, or `none`. Widget conversations can be read
but mutation, message-list and per-user paths remain API-v2-only.
