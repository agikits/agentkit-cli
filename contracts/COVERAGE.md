# API coverage

Released CLI and SDK operations, reviewed against the pinned specification in `contracts/provenance.json`. A command listed here is not proof of a connected channel or live deployment.

| Method and path | SDK method | CLI |
| --- | --- | --- |
| `POST /auth/device/code` | | `auth login --browser` |
| `POST /auth/device/token` | | `auth login --browser` |
| `DELETE /auth/key` | | `auth logout` |
| `GET /me` | `whoami` | `auth status` |
| `GET /health` | `health` | `health` |
| `GET /agents` | `listAgents` | `agents list` |
| `POST /agents` | `createAgent` | `agents create` |
| `GET /agents/{agentId}` | `getAgent` | `agents info` |
| `PATCH /agents/{agentId}` | `updateAgent` | `agents update` |
| `DELETE /agents/{agentId}` | `deleteAgent` | `agents delete` |
| `POST /agents/{agentId}/chat` | `chat` | `chat` |
| `GET /agents/{agentId}/conversations` | `listConversations` | `conversations list` |
| `GET /agents/{agentId}/conversations/export` | `exportConversations` | `conversations export` |
| `GET /agents/{agentId}/conversations/{conversationId}` | `getConversation` | `conversations get` |
| `GET /agents/{agentId}/conversations/{conversationId}/messages` | `listMessages` | `conversations messages` |
| `PATCH /agents/{agentId}/conversations/{conversationId}/messages/{messageId}/feedback` | `setFeedback` | `conversations feedback` |
| `POST /agents/{agentId}/conversations/{conversationId}/retry` | `retry` | `conversations retry` |
| `POST /agents/{agentId}/conversations/{conversationId}/tool-result` | `submitToolResult` | `conversations tool-result` |
| `GET /agents/{agentId}/users/{userId}/conversations` | `listUserConversations` | `conversations list --user` |
| `GET /agents/{agentId}/sources` | `listSources` | `sources list` |
| `POST /agents/{agentId}/sources/text` | `addTextSource` | `sources add-text` |
| `POST /agents/{agentId}/sources/qna` | `addQnaSource` | `sources add-qna` |
| `POST /agents/{agentId}/sources/url` | `addUrlSource` | `sources add-url` |
| `POST /agents/{agentId}/sources/file/upload-url` | `createFileUploadUrls` | `sources file-upload-urls` |
| `POST /agents/{agentId}/sources/file` | `registerFileSources` | `sources register-files` |
| `GET /agents/{agentId}/sources/{documentId}` | `getSource` | `sources get` |
| `PATCH /agents/{agentId}/sources/{documentId}` | `updateSource` | `sources update` |
| `DELETE /agents/{agentId}/sources/{documentId}` | `deleteSource` | `sources delete` |
| `GET /agents/{agentId}/contacts` | `listContacts` | `contacts list` |
| `POST /agents/{agentId}/contacts` | `createContact` | `contacts upsert` |
| `POST /agents/{agentId}/contacts/import` | `importContacts` | `contacts import` |
| `GET /agents/{agentId}/leads` | `listLeads` | `leads` |
| `GET /agents/{agentId}/settings/ai` | `getAiSettings` | `settings ai` |
| `PATCH /agents/{agentId}/settings/ai` | `updateAiSettings` | `settings model / instructions` |
| `GET /agents/{agentId}/settings/design` | `getDesign` | `settings design` |
| `PATCH /agents/{agentId}/settings/design` | `updateDesign` | `settings design` |
| `GET /agents/{agentId}/settings/security` | `getSecurity` | `settings security` |
| `PATCH /agents/{agentId}/settings/security` | `updateSecurity` | `settings security` |
| `GET /agents/{agentId}/settings/notifications` | `getNotifications` | `settings notifications` |
| `PATCH /agents/{agentId}/settings/notifications` | `updateNotifications` | `settings notifications` |
| `GET /agents/{agentId}/settings/training` | `getTraining` | `settings training` |
| `PATCH /agents/{agentId}/settings/training` | `updateTraining` | `settings training` |
| `GET /agents/{agentId}/train` | `trainStatus` | `train --status` |
| `POST /agents/{agentId}/train` | `train` | `train` |
| `GET /agents/{agentId}/channels/instagram` | `getInstagram` | `instagram status` |
| `GET /agents/{agentId}/channels/instagram/automations/{key}` | `getInstagramAutomation` | `instagram automation` |
| `PATCH /agents/{agentId}/channels/instagram/automations/{key}` | `updateInstagramAutomation` | `instagram automation` |
| `GET /agents/{agentId}/channels/instagram/automations/{key}/instances` | `listInstagramAutomationInstances` | `instagram instances` |
| `POST /agents/{agentId}/channels/instagram/automations/{key}/instances` | `createInstagramAutomationInstance` | `instagram instance-create` |
| `GET /agents/{agentId}/channels/instagram/automations/{key}/instances/{id}` | `getInstagramAutomationInstance` | `instagram instance` |
| `PATCH /agents/{agentId}/channels/instagram/automations/{key}/instances/{id}` | `updateInstagramAutomationInstance` | `instagram instance-update` |
| `GET /agents/{agentId}/channels/instagram/conversation-starters` | `getConversationStarters` | `instagram starters` |
| `PATCH /agents/{agentId}/channels/instagram/conversation-starters` | `updateConversationStarters` | `instagram starters` |
| `GET /agents/{agentId}/channels/instagram/menu` | `getInstagramMenu` | `instagram menu` |
| `PATCH /agents/{agentId}/channels/instagram/menu` | `updateInstagramMenu` | `instagram menu` |
| `POST /agents/{agentId}/channels/instagram/permissions/refresh` | `refreshInstagramPermissions` | `instagram refresh-permissions` |
| `GET /agents/{agentId}/channels` | `listManagementChannels` | `channels list` |
| `GET /agents/{agentId}/channels/{channel}/config` | `getManagementChannel` | `channels list <channel>` |
| `PATCH /agents/{agentId}/channels/{channel}/config` | `updateManagementChannelOverride` | `channels configure` |
| `PATCH /agents/{agentId}/channels/web/presentation` | `updateWebPresentation` | `channels web-presentation` |
| `GET/PATCH /agents/{agentId}/channels/center-stage` | `getCenterStage` / `updateCenterStage` | `channels center-stage` |
| `GET/POST /agents/{agentId}/actions` | `listCustomApiActions` / `createCustomApiAction` | `actions list` / `create` |
| `GET/PATCH/DELETE /agents/{agentId}/actions/{actionId}` | `getCustomApiAction` / `updateCustomApiAction` / `deleteCustomApiAction` | `actions get` / `update` / `delete` |
| `PATCH /agents/{agentId}/actions/{actionId}/status` | `setCustomApiActionStatus` | `actions enable` / `disable` |
| `GET /agents/{agentId}/secrets` | `listAgentSecrets` | `secrets list` |
| `PUT/DELETE /agents/{agentId}/secrets/{name}` | `setAgentSecret` / `deleteAgentSecret` | `secrets set` / `delete` |

`chatStream` and `retryStream` use the same operations as their nonstreaming counterparts. Signed file upload and registration are separate commands so callers control the binary transfer.

Workspace keys support inbox reads, discard, restore and reviewed draft edits and sends.
These operations target the candidate server revision.

| Method and path | SDK method | CLI |
| --- | --- | --- |
| `GET /agents/{agentId}/emails` | `listEmails` | `emails list` |
| `GET /agents/{agentId}/emails/messages/{messageId}` | `getEmailMessage` | SDK only, account-key/session read |
| `GET /agents/{agentId}/emails/{threadId}` | `getEmail` | `emails get` |
| `POST /agents/{agentId}/emails/{threadId}/discard` | `discardEmail` | `emails discard` |
| `POST /agents/{agentId}/emails/{threadId}/restore` | `restoreEmail` | `emails restore` |
| `GET /agents/{agentId}/emails/drafts` | `listEmailDrafts` | `emails drafts list` |
| `GET /agents/{agentId}/emails/drafts/{draftId}` | `getEmailDraft` | `emails drafts get` |
| `PATCH /agents/{agentId}/emails/drafts/{draftId}` | `editEmailDraft` | `emails drafts edit` |
| `POST /agents/{agentId}/emails/drafts/{draftId}/send` | `sendEmailDraft` | `emails send` |

Email inbox thread, message and draft reads accept account API keys or explicit
user sessions. Flat `emails <project>` and `email <project> <thread-id>` provide
human output and `--json`; grouped commands remain supported.
