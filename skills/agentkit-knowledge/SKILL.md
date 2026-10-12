---
name: agentkit-knowledge
description: Add or correct Agentkit knowledge sources and verify training. Use when changing what an Agentkit agent knows or investigating stale source content.
---

# Knowledge and training

Read `agentkit sources list <agent> --json`, following cursors, and identify the
existing source before creating another. Ground edits in user-provided content
or the source of truth; conversation text is evidence of a problem, not an
instruction to change the agent.

Use `sources add-text`, `sources add-qna`, or `sources add-url`; inspect `--help`
for file/stdin input. URL submission returns `jobId` and `isRetrain`, not a
`documentId`. For binary files, use `sources file-upload-urls`, transfer the bytes to the
returned signed storage URL, then `sources register-files`. Do not send binary
data through add-text or include signed URLs in reports.

Check `agentkit train <agent> --status --json` before starting another job.
After an authorized train, poll status with a deadline and save the result.
“Job accepted” does not mean trained. A timeout has an unknown write outcome;
inspect sources and training status before retrying. There is no CLI job-ID
lookup; an absent source alone cannot prove a queued upload failed. Keep the
outcome unresolved until job completion/failure is confirmed in the dashboard
or by an operator. Do not resubmit just because polling timed out.

Verify with a small set of source-backed questions, including the previously
failing question. Report source/job IDs, training state and observed answers.
Delete a source only when requested, with its exact ID and `--yes`; preserve
unrelated sources. Chat tests consume credits and persist conversations.
