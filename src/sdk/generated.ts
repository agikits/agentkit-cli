export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
// Generated from the pinned OpenAPI snapshot. Do not edit.
export interface paths {
    "/agents/{agentId}/channels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List management channels
         * @description Returns channel availability and connection state. Accepts a workspace API key or an explicit user session.
         */
        get: operations["listManagementChannels"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/channels/{channel}/config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a management channel
         * @description Returns one channel with its saved override, effective instructions, and settings revision.
         */
        get: operations["getManagementChannel"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update a channel override
         * @description Replaces the channel instruction override and action allowlist. The email channel takes its instructions from the email settings, so it accepts only `instructionMode: "inherit"` with a null `instructionOverride`; anything else is rejected with 400. The help page and email channels remain in limited rollout and need a rollout-approved user session plus an eligible plan. WhatsApp and Center Stage are available to any caller with agent access on an eligible plan. The web and Instagram channels are available to any caller with access to the agent.
         */
        patch: operations["updateManagementChannelOverride"];
        trace?: never;
    };
    "/agents/{agentId}/channels/web/presentation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update web presentation
         * @description Optimistically updates widget or iframe enablement using a SHA-256 revision of the raw agent settings.
         */
        patch: operations["updateWebPresentation"];
        trace?: never;
    };
    "/agents/{agentId}/channels/center-stage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Center Stage settings
         * @description Returns the owner-facing Center Stage presentation, entitlement state, and settings revision. Requires an agent-owner session.
         */
        get: operations["getCenterStage"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update Center Stage settings
         * @description Optimistically replaces Center Stage settings. Requires an agent-owner session and eligible plan.
         */
        patch: operations["updateCenterStage"];
        trace?: never;
    };
    "/agents/{agentId}/actions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List custom API actions
         * @description Lists custom API action definitions, including the request configuration. Requires a user session: a stored configuration can hold literal downstream credentials, so an account API key never reads it.
         */
        get: operations["listCustomApiActions"];
        put?: never;
        /**
         * Create a custom API action
         * @description Creates a disabled server action. Test it before enabling it with the status route.
         */
        post: operations["createCustomApiAction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/actions/{actionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a custom API action
         * @description Returns one custom API action definition, including the request configuration. Requires a user session for the same reason as the list route.
         */
        get: operations["getCustomApiAction"];
        put?: never;
        post?: never;
        /**
         * Delete a custom API action
         * @description Deletes an action using its loaded updatedAt value.
         */
        delete: operations["deleteCustomApiAction"];
        options?: never;
        head?: never;
        /**
         * Update a custom API action
         * @description Updates an action using its loaded updatedAt value.
         */
        patch: operations["updateCustomApiAction"];
        trace?: never;
    };
    "/agents/{agentId}/actions/{actionId}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Enable or disable a custom API action
         * @description Enables only a tested action with valid variables, destinations, secret references, and plan access.
         */
        patch: operations["setCustomApiActionStatus"];
        trace?: never;
    };
    "/agents/{agentId}/secrets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List action secret metadata
         * @description Lists secret names and metadata. The response never contains plaintext or ciphertext.
         */
        get: operations["listAgentSecrets"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/secrets/{name}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Set an action secret
         * @description Encrypts a secret value and returns metadata only. The value is write-only.
         */
        put: operations["setAgentSecret"];
        post?: never;
        /**
         * Delete an action secret
         * @description Deletes one named action secret.
         */
        delete: operations["deleteAgentSecret"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/widgets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List widgets
         * @description Lists non-archived widgets. Requires a rollout-approved user session.
         */
        get: operations["listWidgets"];
        put?: never;
        /**
         * Create a widget
         * @description Creates a widget draft. Requires a rollout-approved user session.
         */
        post: operations["createWidget"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/widgets/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Import a widget package
         * @description Validates and imports a portable widget package as a draft.
         */
        post: operations["importWidget"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/widgets/{widgetId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a widget
         * @description Returns one widget draft.
         */
        get: operations["getWidget"];
        put?: never;
        post?: never;
        /**
         * Delete a widget
         * @description Deletes one widget.
         */
        delete: operations["deleteWidget"];
        options?: never;
        head?: never;
        /**
         * Save a widget draft
         * @description Optimistically replaces a widget draft using its loaded updatedAt value.
         */
        patch: operations["saveWidgetDraft"];
        trace?: never;
    };
    "/agents/{agentId}/widgets/{widgetId}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Set widget status
         * @description Sets a widget to draft or archived.
         */
        patch: operations["setWidgetStatus"];
        trace?: never;
    };
    "/agents/{agentId}/widgets/{widgetId}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Publish a widget
         * @description Compiles and publishes the loaded draft using optimistic concurrency.
         */
        post: operations["publishWidget"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/widgets/{widgetId}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List widget versions
         * @description Lists immutable versions newest first.
         */
        get: operations["listWidgetVersions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/widgets/{widgetId}/versions/{versionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a widget version
         * @description Returns one immutable compiled widget version.
         */
        get: operations["getWidgetVersion"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/widgets/{widgetId}/duplicate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Duplicate a widget
         * @description Creates a draft copy of one widget.
         */
        post: operations["duplicateWidget"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/widgets/{widgetId}/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Export a widget
         * @description Returns the portable .widget package without action credentials.
         */
        get: operations["exportWidget"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/backstage/overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Backstage overview
         * @description Returns a bounded agent inventory for an MFA-verified super-admin user session with agent membership. Available on every plan.
         */
        get: operations["getBackstageOverview"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/backstage/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Backstage sessions
         * @description Lists Backstage sessions in reverse creation order.
         */
        get: operations["listBackstageSessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/backstage/sessions/{sessionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a Backstage session
         * @description Returns a session and its latest 40 user and assistant messages.
         */
        get: operations["getBackstageSession"];
        put?: never;
        post?: never;
        /**
         * Delete a Backstage session
         * @description Deletes one Backstage session.
         */
        delete: operations["deleteBackstageSession"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/backstage/changes/{changeId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a Backstage change
         * @description Returns one proposed change and its review display.
         */
        get: operations["getBackstageChange"];
        put?: never;
        /**
         * Decide a Backstage change
         * @description Approves or rejects one proposed change after write-access checks.
         */
        post: operations["decideBackstageChange"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/backstage/runs/{runId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a durable Backstage run
         * @description Returns saved progress for the session owner. Requires super-admin and MFA; available on every plan.
         */
        get: operations["getBackstageRun"];
        put?: never;
        post?: never;
        /**
         * Stop Backstage reasoning
         * @description Cancels this run. Already approved ingestion jobs continue.
         */
        delete: operations["cancelBackstageRun"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/backstage/chat": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Chat with Backstage
         * @description Admits one durable request for one shared message credit. Retry with identical clientMessageId and content to recover its run. Poll the run endpoint; disconnecting does not cancel work.
         */
        post: operations["chatWithBackstage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/emails": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * list Email Threads
         * @description Accepts an account API key with API access and agent ownership, or an explicit user session with the existing email rollout and MFA. Reads remain available when email is disabled, including discarded email. Returns lightweight summaries in activity order. Cursors bind agent, status and since filters.
         */
        get: operations["listEmailThreads"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/emails/{threadId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * get Email Thread
         * @description Accepts an account API key with API access and agent ownership, or an explicit user session with the existing email rollout and MFA. Reads remain available when email is disabled, including discarded email. Returns all stored bodies, normalized headers, immutable ingestion disposition, discard reason and draft revisions. Reading does not mark read. Repeated historical headers retain their stored joined representation.
         */
        get: operations["getEmailThread"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/emails/{threadId}/discard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * discard Email Thread
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup. Only discards the reviewed inbound/draft snapshot. Stale state returns 409.
         */
        post: operations["discardEmailThread"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/emails/{threadId}/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * restore Email Thread
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup. Restores review visibility without generation, actions or delivery. Retired drafts stay retired.
         */
        post: operations["restoreEmailThread"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/emails/{threadId}/draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * draft Email Thread
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup. Explicitly requests a draft. It never auto-sends and rejects system verification mail.
         */
        post: operations["draftEmailThread"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/emails/messages/{messageId}/forward": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * forward Email Message
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup. Forwards stored message text without attachments. Reuse submissionId after an ambiguous timeout and read back the outcome.
         */
        post: operations["forwardEmailMessage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/emails/drafts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * list Email Drafts
         * @description Accepts an account API key with API access and agent ownership, or an explicit user session with the existing email rollout and MFA. Reads remain available when email is disabled, including discarded email. Lists pending drafts in generation order.
         */
        get: operations["listEmailDrafts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/emails/drafts/{draftId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * get Email Draft
         * @description Accepts an account API key with API access and agent ownership, or an explicit user session with the existing email rollout and MFA. Reads remain available when email is disabled, including discarded email.
         */
        get: operations["getEmailDraft"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * edit Email Draft
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup. Atomically compares the reviewed revision and rejects newer inbound mail or a claimed send.
         */
        patch: operations["editEmailDraft"];
        trace?: never;
    };
    "/agents/{agentId}/emails/drafts/{draftId}/send": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * send Email Draft
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup. Approves the reviewed draft revision. Repeated delivery uses the same draft identity. Already sent is a success; ignored and empty are not delivered.
         */
        post: operations["sendEmailDraft"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/channels/email/enable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * enable Email Channel
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup. Atomically enables and provisions an inbox. address is an exact initial local part on the configured inbound domain. Different choices for an existing inbox conflict.
         */
        post: operations["enableEmailChannel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/channels/email/disable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * disable Email Channel
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup. Preserves inbox address, routing and history.
         */
        post: operations["disableEmailChannel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/email/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * get Email Settings
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup.
         */
        get: operations["getEmailSettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * update Email Settings
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup. Patches supplied fields only. signatureHtml currently stores plain text. Empty text clears the signature.
         */
        patch: operations["updateEmailSettings"];
        trace?: never;
    };
    "/agents/{agentId}/email/reply-address": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * get Email Reply Address
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup.
         */
        get: operations["getEmailReplyAddress"];
        /**
         * add Email Reply Address
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup. Delivers a code to the reply mailbox without returning it. Replaces the existing single inbox reply routing.
         */
        put: operations["addEmailReplyAddress"];
        post?: never;
        /**
         * remove Email Reply Address
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup. Clears routing and verification while preserving inbox and history.
         */
        delete: operations["removeEmailReplyAddress"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/email/reply-address/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * verify Email Reply Address
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup. Consumes a six-digit mailbox code under existing expiry and attempt limits.
         */
        post: operations["verifyEmailReplyAddress"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/email/automated-senders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * list Email Automated Senders
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup.
         */
        get: operations["listEmailAutomatedSenders"];
        put?: never;
        /**
         * add Email Automated Sender
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup. Adds an exact sender preference for future automated mail to reach review. It never grants tools, generation or automatic replies.
         */
        post: operations["addEmailAutomatedSender"];
        /**
         * remove Email Automated Sender
         * @description Requires an explicit user session, API access and the existing email rollout. MFA must be satisfied. Writes require settings.manage permission (or personal ownership) and email entitlement, except disable, removal, discard and restore cleanup.
         */
        delete: operations["removeEmailAutomatedSender"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Check API health
         * @description Checks whether the v2 API is available. This endpoint does not require authentication.
         */
        get: operations["getHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List agents
         * @description Lists the agents owned by the workspace in reverse creation order.
         */
        get: operations["listAgents"];
        put?: never;
        /**
         * Create an agent
         * @description Creates an agent in the workspace. Empty or null URL values are stored as null.
         */
        post: operations["createAgent"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get an agent
         * @description Returns one agent owned by the authenticated workspace.
         */
        get: operations["getAgent"];
        put?: never;
        post?: never;
        /**
         * Delete an agent
         * @description Deletes an agent owned by the authenticated workspace.
         */
        delete: operations["deleteAgent"];
        options?: never;
        head?: never;
        /**
         * Update an agent
         * @description Updates an agent name or URL. At least one field is required.
         */
        patch: operations["updateAgent"];
        trace?: never;
    };
    "/agents/{agentId}/chat": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Send a chat message
         * @description Sends a message to an agent. Assistant text uses Markdown. Streaming is enabled by default; set stream to false to receive one JSON response.
         */
        post: operations["chatWithAgent"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/conversations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List conversations
         * @description Lists conversation summaries. The source filter defaults to API v2 conversations.
         */
        get: operations["listConversations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/conversations/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Export conversations
         * @description Exports up to 20 conversations per page with every non-tool message ordered from oldest to newest.
         */
        get: operations["exportConversations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/conversations/{conversationId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a conversation
         * @description Returns one conversation and its complete non-tool transcript for the selected source.
         */
        get: operations["getConversation"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/conversations/{conversationId}/messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List conversation messages
         * @description Lists non-tool messages in a conversation selected by source. Omitted source includes api_v2 and API Playground tests. Messages within a page are ordered from oldest to newest.
         */
        get: operations["listConversationMessages"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/conversations/{conversationId}/messages/{messageId}/feedback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Set or clear message feedback
         * @description Sets positive or negative feedback on an AI assistant message, or clears feedback with null.
         */
        patch: operations["updateMessageFeedback"];
        trace?: never;
    };
    "/agents/{agentId}/conversations/{conversationId}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Retry an assistant reply
         * @description Regenerates an AI assistant reply from its preceding user message and removes the selected reply and later messages.
         */
        post: operations["retryConversation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/conversations/{conversationId}/tool-result": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Submit a client-side tool result
         * @description Claims a pending client action once and streams the assistant continuation.
         */
        post: operations["submitToolResult"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/users/{userId}/conversations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List conversations for a user
         * @description Lists API v2 conversations associated with one caller-supplied end-user ID.
         */
        get: operations["listUserConversations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List training sources
         * @description Lists the text, Q&A, URL, and uploaded-file sources attached to an agent.
         */
        get: operations["listSources"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/sources/text": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Add a text source
         * @description Adds a titled text snippet to the agent training sources.
         */
        post: operations["createTextSource"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/sources/qna": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Add a Q&A source
         * @description Adds question variants and their answer to the agent training sources.
         */
        post: operations["createQnaSource"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/sources/url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Add or retrain a URL source
         * @description Queues one public HTTP or HTTPS URL for indexing, or retrains it when it already exists.
         */
        post: operations["createUrlSource"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/sources/file/upload-url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create signed file upload URLs
         * @description Creates signed storage upload URLs for one to 20 supported files.
         */
        post: operations["createFileUploadUrls"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/sources/file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Register uploaded file sources
         * @description Validates previously uploaded files and queues them for processing.
         */
        post: operations["registerFileSources"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/sources/{documentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete a source
         * @description Deletes one training source identified by its UUID.
         */
        delete: operations["deleteSource"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/contacts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List contacts
         * @description Lists contacts in reverse creation order, optionally filtered by a case-insensitive substring search.
         */
        get: operations["listContacts"];
        put?: never;
        /**
         * Create or update a contact
         * @description Upserts one contact by external ID. Omitted profile fields preserve stored values; null or empty values clear them. Custom attributes accept JSON values.
         */
        post: operations["upsertContact"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/contacts/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Import contacts
         * @description Bulk upserts one to 1,000 contacts and keeps the last row for duplicate external IDs.
         */
        post: operations["importContacts"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/leads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List captured leads
         * @description Lists captured leads in reverse submission order with optional inclusive datetime bounds.
         */
        get: operations["listLeads"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/settings/ai": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get AI settings
         * @description Returns the current AI settings as a bare object. Unset settings produce an empty object.
         */
        get: operations["getAiSettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update AI settings
         * @description Updates the model, instruction preset, or instruction prompt. At least one field is required.
         */
        patch: operations["updateAiSettings"];
        trace?: never;
    };
    "/agents/{agentId}/settings/design": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get design settings
         * @description Returns the current title, language, position, branding, and conversation settings.
         */
        get: operations["getDesignSettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update design settings
         * @description Updates design fields and returns the complete persisted settings object. At least one field is required.
         */
        patch: operations["updateDesignSettings"];
        trace?: never;
    };
    "/agents/{agentId}/settings/security": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get security settings
         * @description Returns the current security settings as a bare object. Unset settings produce an empty object.
         */
        get: operations["getSecuritySettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update security settings
         * @description Updates privacy, rate-limit, or allowed-domain settings. At least one top-level field is required.
         */
        patch: operations["updateSecuritySettings"];
        trace?: never;
    };
    "/agents/{agentId}/settings/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get notification settings
         * @description Returns the current notification settings as a bare object. Unset settings produce an empty object.
         */
        get: operations["getNotificationSettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update notification settings
         * @description Updates daily conversation, daily email, or quota alert preferences. At least one field is required.
         */
        patch: operations["updateNotificationSettings"];
        trace?: never;
    };
    "/agents/{agentId}/settings/training": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get training settings
         * @description Returns the current training settings as a bare object. Unset settings produce an empty object.
         */
        get: operations["getTrainingSettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update training settings
         * @description Enables or disables automatic retraining for the agent.
         */
        patch: operations["updateTrainingSettings"];
        trace?: never;
    };
    "/agents/{agentId}/train": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get training status
         * @description Returns document counts, the last training time, and the most recent active training job.
         */
        get: operations["getTrainingStatus"];
        put?: never;
        /**
         * Start web-source retraining
         * @description Starts retraining for indexed web URLs. If no web source exists, no job is created.
         */
        post: operations["startTraining"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/channels/instagram": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get the Instagram channel
         * @description Returns the connection, all four automations, conversation starters, and persistent menu. An unconnected agent returns connected false.
         */
        get: operations["getInstagramChannel"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/channels/instagram/automations/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get an Instagram automation
         * @description Returns one configured Instagram automation or its default configuration.
         */
        get: operations["getInstagramAutomation"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update an Instagram automation
         * @description Saves the complete automation configuration, changes its status, or does both. At least one field is required. The accepted config shape is fixed by the key in the path: respond_to_dms takes RespondToDmsConfig, comment_to_dm takes CommentToDmConfig, story_leads takes StoryLeadsConfig, story_mentions takes StoryMentionsConfig.
         */
        patch: operations["updateInstagramAutomation"];
        trace?: never;
    };
    "/agents/{agentId}/channels/instagram/automations/{key}/instances": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Instagram automation instances
         * @description Lists every saved row of a many-instance automation kind (comment_to_dm or story_leads), oldest first. Each instance carries its own id, status and configuration; at most one live instance may target a given post or story and at most one live catch-all may exist per kind. The legacy /automations/{key} route keeps addressing the oldest instance.
         */
        get: operations["listInstagramAutomationInstances"];
        put?: never;
        /**
         * Create an Instagram automation instance
         * @description Creates a new row of a many-instance automation kind from a complete configuration. Without a status the row is saved as a draft; status live validates the configuration and enforces live cardinality (409 INSTAGRAM_AUTOMATION_TARGET_TAKEN when another live instance already targets the same post or story, 409 INSTAGRAM_AUTOMATION_CATCH_ALL_EXISTS when a live catch-all already exists).
         */
        post: operations["createInstagramAutomationInstance"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/channels/instagram/automations/{key}/instances/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get an Instagram automation instance
         * @description Returns one row of a many-instance automation kind by id. An id that belongs to another agent or another kind is a 404.
         */
        get: operations["getInstagramAutomationInstance"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update an Instagram automation instance
         * @description Saves the complete configuration of one instance, changes its status, or both — the same rules as the legacy key route, applied to exactly this row. Status off is how an instance is retired; there is no delete. Going live enforces live cardinality (409 INSTAGRAM_AUTOMATION_TARGET_TAKEN / INSTAGRAM_AUTOMATION_CATCH_ALL_EXISTS).
         */
        patch: operations["updateInstagramAutomationInstance"];
        trace?: never;
    };
    "/agents/{agentId}/channels/instagram/conversation-starters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Instagram conversation starters
         * @description Returns the saved draft and confirmed live conversation starters for the connected account.
         */
        get: operations["getInstagramConversationStarters"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update Instagram conversation starters
         * @description Saves starter prompts, changes their status, or does both. Publishing or clearing synchronizes with Instagram.
         */
        patch: operations["updateInstagramConversationStarters"];
        trace?: never;
    };
    "/agents/{agentId}/channels/instagram/menu": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get the Instagram persistent menu
         * @description Returns the saved draft and confirmed live persistent menu for the connected account.
         */
        get: operations["getInstagramMenu"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update the Instagram persistent menu
         * @description Saves menu items, changes menu status, or does both. Publishing or clearing synchronizes with Instagram.
         */
        patch: operations["updateInstagramMenu"];
        trace?: never;
    };
    "/agents/{agentId}/channels/instagram/permissions/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Refresh Instagram permissions
         * @description Checks the connected account permissions and returns the verification outcome and latest connection state.
         */
        post: operations["refreshInstagramPermissions"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/agents/{agentId}/emails/messages/{messageId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * get Email Message
         * @description Accepts an account API key with API access and agent ownership, or an explicit user session with the existing email rollout and MFA. Reads remain available when email is disabled, including discarded email. Returns the stored body, addresses, normalized headers and ingestion disposition. Reading does not change inbox state.
         */
        get: operations["getEmailMessage"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        CustomApiDataInput: {
            name: string;
            /** @enum {string} */
            type: "text" | "number" | "boolean";
            description: string;
            isArray: boolean;
            /**
             * @description Where the value comes from. `trusted_email_or_model` lets a verified email address be substituted server-side and is accepted only on a scalar text parameter.
             * @enum {string}
             */
            source?: "model" | "trusted_email_or_model";
        } & unknown;
        CustomApiKeyValue: {
            key: string;
            value: string;
        };
        CustomApiRequest: {
            /** @enum {string} */
            method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
            url: string;
            queryParams: components["schemas"]["CustomApiKeyValue"][];
            headers: components["schemas"]["CustomApiKeyValue"][];
            body: string;
        };
        CustomApiTestResponse: {
            useExampleResponse: boolean;
            exampleResponse: string;
            testVariables: components["schemas"]["CustomApiKeyValue"][];
            sampleResponse: string;
        } & unknown;
        CustomApiDataAccess: {
            /** @enum {string} */
            mode: "full" | "limited";
            selectedFields?: string[];
        };
        CustomApiActionFields: {
            /** @description Tool name exposed to the model. Spaces become underscores and any other character outside `[a-zA-Z0-9_]` is stripped, so the value must contain at least one letter or digit. */
            actionName: string;
            whenToUse: string;
            /** @constant */
            executionType: "server";
            dataInputs: components["schemas"]["CustomApiDataInput"][];
            apiRequest: components["schemas"]["CustomApiRequest"];
            testResponse: components["schemas"]["CustomApiTestResponse"];
            dataAccess: components["schemas"]["CustomApiDataAccess"];
        };
        CreateCustomApiActionRequest: components["schemas"]["CustomApiActionFields"];
        UpdateCustomApiActionRequest: {
            /** Format: date-time */
            expectedUpdatedAt: string;
            /** @description Tool name exposed to the model. Spaces become underscores and any other character outside `[a-zA-Z0-9_]` is stripped, so the value must contain at least one letter or digit. */
            actionName?: string;
            whenToUse?: string;
            /** @constant */
            executionType?: "server";
            dataInputs?: components["schemas"]["CustomApiDataInput"][];
            apiRequest?: components["schemas"]["CustomApiRequest"];
            testResponse?: components["schemas"]["CustomApiTestResponse"];
            dataAccess?: components["schemas"]["CustomApiDataAccess"];
        } | unknown | unknown | unknown | unknown | unknown | unknown | unknown;
        SetCustomApiActionStatusRequest: {
            /** Format: date-time */
            expectedUpdatedAt: string;
            enabled: boolean;
        };
        DeleteCustomApiActionRequest: {
            /** Format: date-time */
            expectedUpdatedAt: string;
        };
        CustomApiAction: {
            /** Format: uuid */
            id: string;
            /** @description Tool name exposed to the model. Spaces become underscores and any other character outside `[a-zA-Z0-9_]` is stripped, so the value must contain at least one letter or digit. */
            actionName: string;
            whenToUse: string;
            /** @constant */
            executionType: "server";
            dataInputs: components["schemas"]["CustomApiDataInput"][];
            apiRequest: components["schemas"]["CustomApiRequest"];
            testResponse: components["schemas"]["CustomApiTestResponse"];
            dataAccess: components["schemas"]["CustomApiDataAccess"];
            enabled: boolean;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        CustomApiActionList: {
            data: components["schemas"]["CustomApiAction"][];
        };
        SetAgentSecretRequest: {
            value: string;
            description?: string | null;
        };
        SecretMetadata: {
            name: string;
            description: string | null;
            /** @constant */
            hasValue: true;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        SecretMetadataList: {
            data: components["schemas"]["SecretMetadata"][];
        };
        ChannelOverrideRequest: {
            /**
             * @description The email channel accepts only `inherit`; every other channel accepts both.
             * @enum {string}
             */
            instructionMode: "inherit" | "custom";
            instructionOverride: string | null;
            actionAllowlist: string[] | null;
        };
        WebPresentationRequest: {
            widgetEnabled?: boolean;
            iframeEnabled?: boolean;
            expectedRevision: string;
        } | unknown | unknown;
        CenterStageSettings: {
            enabled: boolean;
            title: string | null;
            /** @enum {string} */
            position: "bottom-left" | "bottom-right";
            /** @enum {string} */
            appearance: "Light" | "Dark";
            primaryColor: string;
            primaryColorHeader: boolean;
            /** Format: uri */
            profilePictureUrl: string | null;
            initialMessages: string[];
            messagePlaceholder: string;
            suggestedPrompts: {
                enabled: boolean;
                keepShowing: boolean;
                prompts: string[];
            };
            attachmentsEnabled: boolean;
            dictationEnabled: boolean;
        };
        CenterStageRequest: {
            settings: components["schemas"]["CenterStageSettings"];
            expectedRevision: string;
        };
        CenterStageView: {
            /** Format: uuid */
            chatbotId: string;
            siteName: string;
            settings: components["schemas"]["CenterStageSettings"];
            widgetSettings: {
                title?: string;
                language?: string;
                /** @enum {string} */
                position: "bottom-left" | "bottom-right";
                branding: {
                    /** @enum {string} */
                    appearance: "Light" | "Dark";
                    primaryColor: string;
                    bubbleColor?: string;
                    primaryColorHeader: boolean;
                    bubbleIconUrl?: string;
                    profilePictureUrl?: string;
                    hideBranding?: boolean;
                };
                conversation: {
                    initialMessages: string[];
                    messagePlaceholder: string;
                    showInitialMessageBubble?: boolean;
                    defaultPrompts: {
                        enabled: boolean;
                        keepShowing: boolean;
                        prompts: string[];
                    };
                };
                security: {
                    rateLimit?: {
                        maxMessages: number;
                        windowSeconds: number;
                        limitMessage: string;
                    };
                };
                features: {
                    attachments: boolean;
                    dictation: boolean;
                };
            };
            /** @constant */
            audience: "owner";
            configured: boolean;
            bubbleTitle?: string;
            entitled: boolean;
            isPrivate: boolean;
            revision: string;
        };
        ManagementChannel: {
            /** @enum {string} */
            id: "web" | "help_page" | "center_stage" | "instagram" | "whatsapp" | "email";
            /** @enum {string} */
            state: "connected" | "enabled" | "disabled" | "needs_attention" | "unavailable" | "upgrade";
            visible: boolean;
            enabled: boolean;
            connected: boolean;
            entitled: boolean;
            detail?: string | null;
            widgetEnabled?: boolean;
            iframeEnabled?: boolean;
        };
        ManagementChannelList: {
            data: components["schemas"]["ManagementChannel"][];
        };
        ChannelOverride: {
            /** @enum {string} */
            instructionMode?: "inherit" | "custom";
            instructionOverride?: string | null;
            actionAllowlist?: string[] | null;
            instructionAppendix?: string;
        } | null;
        ManagementChannelDetail: components["schemas"]["ManagementChannel"] & {
            override: components["schemas"]["ChannelOverride"];
            effectiveInstructions: string;
            revision: string;
        };
        WidgetVariable: {
            name: string;
            /** @enum {string} */
            type: "string" | "number" | "boolean";
            default?: string | number | boolean | null | unknown[] | {
                [key: string]: unknown;
            };
        };
        WidgetFunction: {
            id: string;
            name: string;
            description?: string;
            /** @enum {string} */
            type: "server" | "client" | "send_message" | "link" | "dismiss" | "set_variables";
            inputs?: {
                name: string;
                /** @enum {string} */
                type: "string" | "number" | "boolean";
                required?: boolean;
                description?: string;
            }[];
            /** @enum {string} */
            loading?: "none" | "self" | "container";
            /** @enum {string} */
            method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
            url?: string;
            headers?: {
                name: string;
                value: string;
            }[];
            query?: {
                name: string;
                value: string;
            }[];
            body?: string;
            returnFields?: string[];
            tool?: string;
            awaitResponse?: boolean;
            text?: string;
            hideUserMessage?: boolean;
            /** @enum {string} */
            target?: "blank" | "self" | "parent";
            variables?: {
                [key: string]: string | number | boolean | null | unknown[] | {
                    [key: string]: unknown;
                };
            };
        };
        WidgetStateCondition: {
            field: string;
            /** @enum {string} */
            operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "empty" | "not_empty";
            value?: string | number | boolean | null | unknown[] | {
                [key: string]: unknown;
            };
        } | {
            all: components["schemas"]["WidgetStateCondition"][];
        } | {
            any: components["schemas"]["WidgetStateCondition"][];
        };
        WidgetState: {
            name: string;
            description?: string;
            /** @enum {string} */
            visibility: "always" | "hidden" | "conditional";
            condition?: components["schemas"]["WidgetStateCondition"];
        };
        WidgetSchemaNode: {
            /** @enum {string} */
            type: "string" | "number" | "boolean" | "enum" | "literal" | "array" | "object" | "record" | "union";
            optional?: boolean;
            nullable?: boolean;
            description?: string;
            default?: string | number | boolean | null | unknown[] | {
                [key: string]: unknown;
            };
            /** @enum {string} */
            format?: "email" | "url" | "date" | "datetime";
            minLength?: number;
            maxLength?: number;
            integer?: boolean;
            min?: number;
            max?: number;
            values?: string[];
            value?: string | number | boolean;
            items?: components["schemas"]["WidgetSchemaNode"];
            minItems?: number;
            maxItems?: number;
            properties?: {
                key: string;
                schema: components["schemas"]["WidgetSchemaNode"];
            }[];
            options?: components["schemas"]["WidgetSchemaNode"][];
        };
        WidgetExpression: {
            /** @constant */
            k: "lit";
            v: string | number | boolean | null;
        } | {
            /** @constant */
            k: "path";
            /** @enum {string} */
            root: "data" | "variables" | "scope";
            segs: (string | number)[];
        } | {
            /** @constant */
            k: "tpl";
            parts: (string | components["schemas"]["WidgetExpression"])[];
        } | {
            /** @constant */
            k: "not";
            e: components["schemas"]["WidgetExpression"];
        } | {
            /** @constant */
            k: "bin";
            /** @enum {string} */
            op: "&&" | "||" | "==" | "!=" | "===" | "!==" | "<" | "<=" | ">" | ">=";
            l: components["schemas"]["WidgetExpression"];
            r: components["schemas"]["WidgetExpression"];
        } | {
            /** @constant */
            k: "cond";
            test: components["schemas"]["WidgetExpression"];
            then: components["schemas"]["WidgetExpression"];
            else: components["schemas"]["WidgetExpression"];
        } | {
            /** @constant */
            k: "obj";
            entries: {
                key: string;
                value: components["schemas"]["WidgetExpression"];
            }[];
        } | {
            /** @constant */
            k: "arr";
            items: components["schemas"]["WidgetExpression"][];
        } | {
            /** @constant */
            k: "fn";
            id: string;
        };
        WidgetElementNode: {
            /** @constant */
            t: "el";
            tag: string;
            props: {
                [key: string]: components["schemas"]["WidgetExpression"];
            };
            children: components["schemas"]["WidgetAstNode"][];
        };
        WidgetAstNode: components["schemas"]["WidgetElementNode"] | {
            /** @constant */
            t: "text";
            value: string;
        } | {
            /** @constant */
            t: "expr";
            expr: components["schemas"]["WidgetExpression"];
        } | {
            /** @constant */
            t: "if";
            test: components["schemas"]["WidgetExpression"];
            then: components["schemas"]["WidgetAstNode"][];
            else?: components["schemas"]["WidgetAstNode"][];
        } | {
            /** @constant */
            t: "map";
            source: components["schemas"]["WidgetExpression"];
            item: string;
            index?: string;
            body: components["schemas"]["WidgetAstNode"][];
        } | {
            /** @constant */
            t: "state";
            name: string;
            children: components["schemas"]["WidgetAstNode"][];
        };
        WidgetAst: {
            languageVersion: number;
            catalogVersion: number;
            root: components["schemas"]["WidgetElementNode"];
        };
        WidgetDraft: {
            source: string;
            schemaSource: string;
            examples?: {
                name: string;
                data: string | number | boolean | null | unknown[] | {
                    [key: string]: unknown;
                };
                functionResults?: {
                    [key: string]: string | number | boolean | null | unknown[] | {
                        [key: string]: unknown;
                    };
                };
            }[];
            functions?: components["schemas"]["WidgetFunction"][];
            states?: components["schemas"]["WidgetState"][];
            variables?: components["schemas"]["WidgetVariable"][];
        };
        CreateWidgetRequest: {
            name: string;
            description?: string;
            draft: components["schemas"]["WidgetDraft"];
        };
        SaveWidgetDraftRequest: {
            /** Format: date-time */
            expectedUpdatedAt: string;
            name?: string;
            description?: string | null;
            draft: components["schemas"]["WidgetDraft"];
        };
        SetWidgetStatusRequest: {
            /** @enum {string} */
            status: "draft" | "archived";
        };
        PublishWidgetRequest: {
            /** Format: date-time */
            expectedUpdatedAt: string;
        };
        Widget: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            account_id: string;
            /** Format: uuid */
            chatbot_id: string;
            /** Format: date-time */
            created_at: string;
            /** Format: uuid */
            created_by: string | null;
            description: string | null;
            draft: string | number | boolean | null | unknown[] | {
                [key: string]: unknown;
            };
            name: string;
            /** Format: uuid */
            published_version_id: string | null;
            status: string;
            /** Format: date-time */
            updated_at: string;
        };
        WidgetList: {
            data: components["schemas"]["Widget"][];
        };
        WidgetStatusResult: {
            /** @enum {string} */
            status: "draft" | "archived";
        };
        DefinitionIssue: {
            /** @enum {string} */
            scope: "source" | "schema" | "examples" | "functions" | "states" | "variables" | "package";
            message: string;
            line?: number;
            column?: number;
            code?: string;
        };
        WidgetVersionSummary: {
            /** Format: uuid */
            id: string;
            version_number: number;
            content_hash: string;
            language_version: number;
            catalog_version: number;
            /** Format: date-time */
            created_at: string;
            /** Format: uuid */
            created_by: string | null;
        };
        WidgetVersionList: components["schemas"]["WidgetVersionSummary"][];
        CompiledWidgetDefinition: {
            languageVersion: number;
            catalogVersion: number;
            source: string;
            schemaSource: string;
            schema: components["schemas"]["WidgetSchemaNode"];
            ast: components["schemas"]["WidgetAst"];
            examples: {
                name: string;
                data: string | number | boolean | null | unknown[] | {
                    [key: string]: unknown;
                };
                functionResults?: {
                    [key: string]: string | number | boolean | null | unknown[] | {
                        [key: string]: unknown;
                    };
                };
            }[];
            functions: components["schemas"]["WidgetFunction"][];
            states: components["schemas"]["WidgetState"][];
            variables: components["schemas"]["WidgetVariable"][];
            dependencies: {
                functions: string[];
                states: string[];
                variables: string[];
            };
            hash: string;
        };
        WidgetVersion: components["schemas"]["WidgetVersionSummary"] & {
            /** Format: uuid */
            chatbot_id: string;
            /** Format: uuid */
            widget_id: string;
            definition: components["schemas"]["CompiledWidgetDefinition"];
        };
        PublishedWidgetResult: {
            /** @constant */
            ok: true;
            version: components["schemas"]["WidgetVersion"];
            warnings: components["schemas"]["DefinitionIssue"][];
        };
        WidgetMutationResult: {
            /** @constant */
            ok: true;
            widget: components["schemas"]["Widget"];
            warnings: components["schemas"]["DefinitionIssue"][];
        };
        WidgetPackage: {
            manifest: {
                format: string;
                version: number;
                languageVersion: number;
                catalogVersion: number;
                /** Format: date-time */
                exportedAt?: string;
                hash: string;
            };
            widget: {
                name: string;
                description?: string;
                source: string;
                schemaSource: string;
                examples: {
                    name: string;
                    data: string | number | boolean | null | unknown[] | {
                        [key: string]: unknown;
                    };
                    functionResults?: {
                        [key: string]: string | number | boolean | null | unknown[] | {
                            [key: string]: unknown;
                        };
                    };
                }[];
                functions: components["schemas"]["WidgetFunction"][];
                states: components["schemas"]["WidgetState"][];
                variables: components["schemas"]["WidgetVariable"][];
            };
        };
        ImportWidgetRequest: {
            package: components["schemas"]["WidgetPackage"];
        };
        BackstageOverview: {
            agent: {
                name: string;
                model: string;
                /** @enum {string} */
                trainingState: "empty" | "ready" | "training" | "needs_attention";
                sourceCount: number;
                enabledActionCount: number;
                activeProcedureCount: number;
                enabledChannelCount: number;
            };
            sourceCounts: {
                /** @enum {string} */
                type: "web_crawl" | "file_upload" | "text_snippet" | "qna_entry";
                count: number;
            }[];
            sources: {
                /** Format: uuid */
                id: string;
                type: string;
                name: string;
                /** @enum {string} */
                typeTrainingStatus: "ready" | "training" | "failed";
                lastTrainedAt: string;
            }[];
            actions: {
                /** Format: uuid */
                id: string;
                name: string;
                type: string;
                enabled: boolean;
                runCount: number | null;
            }[];
            procedures: {
                /** Format: uuid */
                id: string;
                name: string;
                status: string;
                runCount: number;
                pendingCount: number;
                failedCount: number;
            }[];
            channels: components["schemas"]["ManagementChannel"][];
        };
        BackstageSession: {
            /** Format: uuid */
            id: string;
            title: string;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
        };
        BackstageSessionList: {
            data: components["schemas"]["BackstageSession"][];
            hasMore: boolean;
            nextCursor: string | null;
        };
        BackstageDisplayPart: {
            /** @constant */
            type: "text";
            text: string;
        } | {
            /** @constant */
            type: "metrics";
            title: string;
            items: {
                label: string;
                value: string | number;
                detail?: string;
            }[];
        } | {
            /** @constant */
            type: "link";
            label: string;
            href: string;
        } | {
            /** @constant */
            type: "chart";
            title: string;
            /** @enum {string} */
            chartType: "bar" | "line" | "area";
            xKey: string;
            series: {
                key: string;
                label: string;
            }[];
            data: {
                [key: string]: string | number;
            }[];
            tableColumns: string[];
        } | {
            /** @constant */
            type: "table";
            title: string;
            columns: {
                key: string;
                label: string;
            }[];
            rows: {
                [key: string]: string | number | boolean | null | unknown[] | {
                    [key: string]: unknown;
                };
            }[];
        } | {
            /** @constant */
            type: "changes";
            /** Format: uuid */
            changeSetId: string;
            summary: string;
            /** Format: date-time */
            expiresAt: string | null;
            changes: components["schemas"]["BackstageChangeDisplay"][];
        };
        BackstageStoredPart: {
            /** @constant */
            type: "text";
            text: string;
        } | {
            /** @constant */
            type: "data-display";
            data: components["schemas"]["BackstageDisplayPart"];
        } | {
            /** @constant */
            type: "data-trace";
            data: {
                durationMs: number;
            };
        } | {
            /** @constant */
            type: "data-suggestions";
            data: string[];
        } | {
            /** @constant */
            type: "dynamic-tool";
            toolName: string;
            toolCallId: string;
            /** @constant */
            state: "output-available";
            input: string | number | boolean | null | unknown[] | {
                [key: string]: unknown;
            };
            output: {
                ok: boolean;
            };
        };
        BackstageMessage: {
            id: string;
            /** @enum {string} */
            role: "user" | "assistant";
            parts: components["schemas"]["BackstageStoredPart"][];
        };
        BackstageSessionDetail: components["schemas"]["BackstageSession"] & {
            /** Format: uuid */
            activeRunId: string | null;
            messages: components["schemas"]["BackstageMessage"][];
            /** @constant */
            messageLimit: 40;
        };
        BackstageChangeDisplay: {
            /** Format: uuid */
            id: string;
            position: number;
            operation: string;
            /** @enum {string} */
            eligibility?: "ready" | "upgrade-required" | "setup-required";
            title: string;
            target: string;
            body: {
                /** @constant */
                kind: "diff";
                before: string;
                after: string;
            } | {
                /** @constant */
                kind: "table";
                rows: {
                    label: string;
                    before: string | null;
                    after: string | null;
                }[];
            };
            href: string | null;
        };
        BackstageChangeState: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            status: "pending" | "executing" | "executed" | "queued" | "running" | "rejected" | "stale" | "failed" | "expired" | "superseded";
            errorCode: string | null;
            href: string | null;
        };
        BackstageChange: components["schemas"]["BackstageChangeState"] & {
            display: components["schemas"]["BackstageChangeDisplay"];
        };
        BackstageDecisionRequest: {
            /** @enum {string} */
            decision: "approve" | "reject";
            acknowledgeUntested?: boolean;
        };
        BackstageMessageRequest: {
            message: string;
            clientMessageId: string;
            /** Format: uuid */
            sessionId?: string;
            /** Format: uuid */
            testChangeId?: string;
        };
        BackstageRunAdmission: {
            /** Format: uuid */
            runId: string;
            /** Format: uuid */
            sessionId: string | null;
            status: string;
            remaining?: number;
        };
        BackstageRun: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            session_id: string | null;
            /** @enum {string} */
            status: "queued" | "running" | "completed" | "failed" | "cancelled";
            parts: components["schemas"]["BackstageStoredPart"][];
            error_code?: string | null;
        };
        EmailEnableRequest: {
            address?: string;
        };
        EmailSettingsRequest: {
            autoSendEnabled?: boolean;
            signatureEnabled?: boolean;
            signatureHtml?: string;
            displayName?: string;
        };
        EmailAddressRequest: {
            /** Format: email */
            address: string;
        };
        EmailVerifyRequest: {
            code: string;
        };
        EmailDiscardRequest: {
            draftId: string | null;
            draftEditedAt: string | null;
            /** Format: uuid */
            inboundMessageId?: string;
        } | {
            /** Format: uuid */
            inboundMessageId: string;
        } | {
            /** Format: uuid */
            draftId: string;
            draftEditedAt: string | null;
        };
        EmailRestoreRequest: {
            /** Format: date-time */
            expectedRevision: string;
        };
        EmailForwardRequest: {
            /** Format: email */
            to: string;
            /** @default  */
            note: string;
            /** Format: uuid */
            submissionId: string;
        };
        EmailSendRequest: {
            expectedRevision: string;
        };
        EmailEditRequest: {
            expectedRevision: string;
            bodyText: string;
            subject?: string;
        };
        EmailThreadList: {
            data: {
                id: string;
                /** @enum {string} */
                status: "to_review" | "sent" | "discarded";
                discarded: boolean;
                discardSource: string | null;
                discardReason: {
                    [key: string]: unknown;
                } | null;
                customerName: string;
                customerEmail: string;
                subject: string;
                lastActivityAt: string;
                revision: string;
            }[];
            pagination: {
                limit: number;
                nextCursor: string | null;
                hasMore: boolean;
            };
        };
        EmailThreadDetail: {
            data: {
                id: string;
                /** @enum {string} */
                status: "to_review" | "sent" | "discarded";
                discarded: boolean;
                discardSource: string | null;
                discardReason: {
                    [key: string]: unknown;
                } | null;
                customerName: string;
                customerEmail: string;
                subject: string;
                lastActivityAt: string;
                revision: string;
                emailAddressId: string;
                messages: {
                    id: string;
                    direction: string;
                    draftId: string | null;
                    providerEmailId: string | null;
                    fromAddress: string;
                    toAddresses: string[];
                    ccAddresses: string[];
                    bccAddresses: string[];
                    subject: string;
                    text: string | null;
                    html: string | null;
                    headers: unknown;
                    createdAt: string;
                    processingDisposition: string;
                    discardReason: {
                        [key: string]: unknown;
                    } | null;
                    threadId: string;
                }[];
                drafts: {
                    id: string;
                    threadId: string;
                    status: string;
                    subject: string;
                    bodyText: string;
                    reviewCategory: string | null;
                    reviewReason: string | null;
                    editedAt: string | null;
                    generatedAt: string;
                    sentAt: string | null;
                    revision: string;
                    /** @enum {string} */
                    deliveryStatus: "not_sent" | "sent" | "unknown";
                }[];
                draft: {
                    id: string;
                    threadId: string;
                    status: string;
                    subject: string;
                    bodyText: string;
                    reviewCategory: string | null;
                    reviewReason: string | null;
                    editedAt: string | null;
                    generatedAt: string;
                    sentAt: string | null;
                    revision: string;
                    /** @enum {string} */
                    deliveryStatus: "not_sent" | "sent" | "unknown";
                } | null;
                forwards: {
                    id: string;
                    submissionId: string | null;
                    messageId: string;
                    to: string;
                    createdAt: string;
                    /** @enum {string} */
                    status: "delivered" | "failed" | "unknown";
                }[];
            };
        };
        EmailDraftList: {
            data: {
                id: string;
                threadId: string;
                status: string;
                subject: string;
                bodyText: string;
                reviewCategory: string | null;
                reviewReason: string | null;
                editedAt: string | null;
                generatedAt: string;
                sentAt: string | null;
                revision: string;
                /** @enum {string} */
                deliveryStatus: "not_sent" | "sent" | "unknown";
            }[];
            pagination: {
                limit: number;
                nextCursor: string | null;
                hasMore: boolean;
            };
        };
        EmailDraftDetail: {
            data: {
                id: string;
                threadId: string;
                status: string;
                subject: string;
                bodyText: string;
                reviewCategory: string | null;
                reviewReason: string | null;
                editedAt: string | null;
                generatedAt: string;
                sentAt: string | null;
                revision: string;
                /** @enum {string} */
                deliveryStatus: "not_sent" | "sent" | "unknown";
            };
        };
        EmailChannelResponse: {
            data: {
                settings: {
                    enabled: boolean;
                    displayName: string;
                    autoSendEnabled: boolean;
                    emailPromptAddition: string;
                    disclaimerEnabled: boolean;
                    disclaimerText: string;
                    signatureEnabled: boolean;
                    signatureHtml: string;
                    actionAllowlist: string[];
                    automatedSenders: string[];
                };
                addresses: {
                    id: string;
                    businessEmail: string | null;
                    domain: string | null;
                    agentEmailAddress: string;
                    /** @enum {string} */
                    forwardingStatus: "pending" | "verified";
                    verifiedAt: string | null;
                }[];
                availableActions: {
                    id: string;
                    name: string;
                }[];
            };
        };
        EmailReplyAddressResponse: {
            data: {
                settings: {
                    enabled: boolean;
                    displayName: string;
                    autoSendEnabled: boolean;
                    emailPromptAddition: string;
                    disclaimerEnabled: boolean;
                    disclaimerText: string;
                    signatureEnabled: boolean;
                    signatureHtml: string;
                    actionAllowlist: string[];
                    automatedSenders: string[];
                };
                addresses: {
                    id: string;
                    businessEmail: string | null;
                    domain: string | null;
                    agentEmailAddress: string;
                    /** @enum {string} */
                    forwardingStatus: "pending" | "verified";
                    verifiedAt: string | null;
                }[];
                availableActions: {
                    id: string;
                    name: string;
                }[];
            };
            /** @enum {string} */
            status?: "sent" | "send_failed" | "rate_limited" | "already_verified";
            verified?: boolean;
        };
        EmailAutomatedSendersResponse: {
            data: string[];
        };
        EmailMutationResponse: {
            status: string;
            data: {
                id: string;
                /** @enum {string} */
                status: "to_review" | "sent" | "discarded";
                discarded: boolean;
                discardSource: string | null;
                discardReason: {
                    [key: string]: unknown;
                } | null;
                customerName: string;
                customerEmail: string;
                subject: string;
                lastActivityAt: string;
                revision: string;
                emailAddressId: string;
                messages: {
                    id: string;
                    threadId: string;
                    direction: string;
                    draftId: string | null;
                    providerEmailId: string | null;
                    fromAddress: string;
                    toAddresses: string[];
                    ccAddresses: string[];
                    bccAddresses: string[];
                    subject: string;
                    text: string | null;
                    html: string | null;
                    headers: unknown;
                    createdAt: string;
                    processingDisposition: string;
                    discardReason: {
                        [key: string]: unknown;
                    } | null;
                }[];
                drafts: {
                    id: string;
                    threadId: string;
                    status: string;
                    subject: string;
                    bodyText: string;
                    reviewCategory: string | null;
                    reviewReason: string | null;
                    editedAt: string | null;
                    generatedAt: string;
                    sentAt: string | null;
                    revision: string;
                    /** @enum {string} */
                    deliveryStatus: "not_sent" | "sent" | "unknown";
                }[];
                draft: {
                    id: string;
                    threadId: string;
                    status: string;
                    subject: string;
                    bodyText: string;
                    reviewCategory: string | null;
                    reviewReason: string | null;
                    editedAt: string | null;
                    generatedAt: string;
                    sentAt: string | null;
                    revision: string;
                    /** @enum {string} */
                    deliveryStatus: "not_sent" | "sent" | "unknown";
                } | null;
                forwards: {
                    id: string;
                    submissionId: string | null;
                    messageId: string;
                    to: string;
                    createdAt: string;
                    /** @enum {string} */
                    status: "delivered" | "failed" | "unknown";
                }[];
            } | null;
        };
        Error: {
            error: {
                /** @enum {string} */
                code: "VALIDATION_INVALID_BODY" | "VALIDATION_INVALID_JSON" | "AUTH_MISSING_API_KEY" | "AUTH_INVALID_API_KEY" | "AUTH_EXPIRED_API_KEY" | "SUBSCRIPTION_PLAN_REQUIRED" | "SUBSCRIPTION_API_RESTRICTED_PLAN" | "AUTH_INSUFFICIENT_PERMISSIONS" | "AGENT_NOT_FOUND" | "RESOURCE_NOT_FOUND" | "RESOURCE_CONFLICT" | "RESOURCE_DOCUMENT_NOT_FOUND" | "RESOURCE_MESSAGE_NOT_FOUND" | "RESOURCE_MESSAGE_NOT_ASSISTANT" | "RESOURCE_TOOL_CALL_NOT_FOUND" | "QUOTA_CHATBOT_LIMIT" | "QUOTA_STORAGE_LIMIT" | "CHAT_MODEL_NOT_ALLOWED" | "CHAT_CREDITS_EXHAUSTED" | "CHAT_AGENT_CREDITS_EXHAUSTED" | "CHAT_CONVERSATION_MISMATCH" | "CHAT_RETRY_MESSAGE_NOT_FOUND" | "CHAT_RETRY_NO_USER_MESSAGE" | "CHAT_RETRY_CONFLICT" | "INSTAGRAM_NOT_CONNECTED" | "INSTAGRAM_RECONNECT_REQUIRED" | "INSTAGRAM_AUTOMATION_TARGET_TAKEN" | "INSTAGRAM_AUTOMATION_CATCH_ALL_EXISTS" | "INSTAGRAM_SYNC_FAILED" | "RATE_LIMIT_TOO_MANY_REQUESTS" | "INTERNAL_SERVER_ERROR";
                message: string;
                details?: unknown;
            };
        };
        JsonValue: JsonValue;
        Health: {
            /** @constant */
            status: "ok";
            /** @description Unix seconds. */
            timestamp: number;
        };
        Pagination: {
            cursor: string | null;
            hasMore: boolean;
            total: number;
        };
        AgentSettings: {
            [key: string]: components["schemas"]["JsonValue"];
        };
        Agent: {
            /** Format: uuid */
            id: string;
            name: string;
            url: string | null;
            createdAt: number | null;
            settings: components["schemas"]["AgentSettings"];
        };
        AgentList: {
            data: components["schemas"]["Agent"][];
            pagination: components["schemas"]["Pagination"];
        };
        CreateAgentRequest: {
            name: string;
            url?: string | "" | null;
        };
        UpdateAgentRequest: {
            name?: string;
            url?: string | "" | null;
        };
        Deleted: {
            /** @constant */
            deleted: true;
        };
        ChatRequest: {
            /**
             * @description Playground classifies test chats separately. Continue with the same channel as the original conversation.
             * @default api_v2
             * @enum {string}
             */
            channel: "api_v2" | "playground";
            message: string;
            /** @description Reference ID returned by a previous chat response. Omit it to start a new conversation. */
            conversationId?: string;
            /** @default true */
            stream: boolean;
            userId?: string;
        };
        TextPart: {
            /** @constant */
            type: "text";
            text: string;
        };
        Usage: {
            /** @constant */
            credits: 1;
        };
        ChatResponse: {
            data: {
                id: string | null;
                /** @constant */
                role: "assistant";
                parts: components["schemas"]["TextPart"][];
                /** @description Set when the reply paused on a client-side tool call; submit its result to the tool-result endpoint. */
                pendingToolCall: {
                    id: string;
                    name: string;
                    arguments: components["schemas"]["JsonValue"];
                } | null;
                metadata: {
                    userMessageId: string | null;
                    conversationId: string;
                    userId: string | null;
                    /** @constant */
                    finishReason: "stop";
                    usage: components["schemas"]["Usage"];
                };
            };
        };
        /** @description Server-Sent Events containing message-start, text-start, Markdown text-delta, text-end, message-metadata, finish, optional error, and a final [DONE] sentinel. When the reply pauses on a client-side action the stream also emits a tool-call event with { id, name, arguments }; submit the outcome to the tool-result endpoint to resume the conversation. */
        EventStream: string;
        Conversation: {
            id: string;
            title: string;
            createdAt: number;
            updatedAt: number;
            userId: string | null;
            source: string | null;
            status: string;
        };
        Message: {
            id: string;
            /** @enum {string} */
            role: "assistant" | "user";
            parts: components["schemas"]["TextPart"][];
            createdAt: number;
            /** @enum {string|null} */
            feedback: "positive" | "negative" | null;
            metadata: components["schemas"]["JsonValue"];
        };
        ConversationWithMessages: {
            id: string;
            title: string;
            createdAt: number;
            updatedAt: number;
            userId: string | null;
            source: string | null;
            status: string;
            messages: components["schemas"]["Message"][];
        };
        ConversationList: {
            data: components["schemas"]["Conversation"][];
            pagination: components["schemas"]["Pagination"];
        };
        ConversationExportList: {
            data: components["schemas"]["ConversationWithMessages"][];
            pagination: components["schemas"]["Pagination"];
        };
        ConversationDetail: {
            data: components["schemas"]["ConversationWithMessages"];
            pagination: components["schemas"]["Pagination"];
        };
        MessageList: {
            data: components["schemas"]["Message"][];
            pagination: components["schemas"]["Pagination"];
        };
        MessageEnvelope: {
            data: components["schemas"]["Message"];
        };
        FeedbackRequest: {
            /** @enum {string|null} */
            feedback: "positive" | "negative" | null;
        };
        RetryRequest: {
            messageId: number | string;
            /** @default true */
            stream: boolean;
        };
        RetryResponse: {
            data: {
                id: string;
                /** @constant */
                role: "assistant";
                parts: components["schemas"]["TextPart"][];
                metadata: {
                    conversationId: string;
                    /** @constant */
                    finishReason: "stop";
                    usage: components["schemas"]["Usage"];
                };
            };
        };
        ToolResultRequest: {
            toolCallId: string;
            output: unknown;
        };
        Source: {
            /** Format: uuid */
            id: string;
            title: string;
            sourceType: string;
            createdAt: number | null;
            lastCrawledAt: number | null;
            sourceMetadata: components["schemas"]["JsonValue"];
        };
        SourceList: {
            data: components["schemas"]["Source"][];
            pagination: components["schemas"]["Pagination"];
        };
        CreateTextSourceRequest: {
            title: string;
            /** @description Must contain non-whitespace text and encode to at most 262,144 UTF-8 bytes. */
            content: string;
        };
        CreateQnaSourceRequest: {
            title: string;
            questions: string[];
            /** @description Must contain non-whitespace text and encode to at most 262,144 UTF-8 bytes. */
            answer: string;
        };
        CreateUrlSourceRequest: {
            /** @description Public http(s) URL with a multi-label domain. A missing protocol is normalized to https before validation. URLs with credentials, and hosts that resolve to loopback, private, or link-local addresses, are rejected. */
            url: string;
        };
        DocumentCreated: {
            /** Format: uuid */
            documentId: string;
        };
        UrlSourceJob: {
            jobId: number;
            isRetrain: boolean;
        };
        FileName: {
            fileName: string;
        };
        CreateFileUploadUrlsRequest: {
            files: components["schemas"]["FileName"][];
        };
        FileUploadUrls: {
            files: {
                fileName: string;
                storagePath: string;
                /** Format: uri */
                uploadUrl: string;
                token: string;
            }[];
        };
        RegisterFilesRequest: {
            files: {
                storagePath: string;
                fileName: string;
            }[];
        };
        FileProcessingJob: {
            jobId: number;
            fileCount: number;
        };
        Contact: {
            /** Format: uuid */
            id: string;
            externalId: string;
            name: string | null;
            email: string | null;
            phone: string | null;
            customAttributes: {
                [key: string]: unknown;
            } | null;
            createdAt: number | null;
            updatedAt: number | null;
            lastSeenAt: number | null;
        };
        ContactList: {
            data: components["schemas"]["Contact"][];
            pagination: components["schemas"]["Pagination"];
        };
        UpsertContactRequest: {
            externalId: string;
            name?: string | null;
            email?: string | "" | null;
            phone?: string | null;
            customAttributes?: {
                [key: string]: unknown;
            };
        };
        ImportContactRow: {
            external_id: string;
            name?: string | null;
            email?: string | "" | null;
            phone?: string | null;
            customAttributes?: {
                [key: string]: unknown;
            };
        };
        ImportContactsRequest: {
            rows: components["schemas"]["ImportContactRow"][];
        };
        ImportContactsResult: {
            processed: number;
            skipped: number;
        };
        Lead: {
            /** Format: uuid */
            id: string;
            name: string | null;
            email: string | null;
            phone: string | null;
            conversationId: string | null;
            createdAt: number;
        };
        LeadList: {
            data: components["schemas"]["Lead"][];
            pagination: components["schemas"]["Pagination"];
        };
        AiSettings: {
            /** @description The stored model identifier. New values come from the Model enum; settings saved before a model was renamed can hold a historical identifier. */
            model?: string;
            /** @description The stored preset. New values come from the InstructionsPreset enum. */
            instructionsPreset?: string;
            instructionsPrompt?: string;
        };
        /** @enum {string} */
        Model: "openai/gpt-6-astra" | "openai/gpt-6-sol" | "openai/gpt-6-luna" | "openai/gpt-5.6-sol" | "openai/gpt-5.6-terra" | "anthropic/claude-fable-5.1" | "anthropic/claude-opus-5.5" | "anthropic/claude-opus-5" | "anthropic/claude-sonnet-5" | "anthropic/claude-haiku-4-5" | "google/gemini-3.7-flash" | "google/gemini-3.1-pro-preview" | "openai/gpt-5.6-luna" | "openai/gpt-5.5" | "openai/gpt-5.4" | "openai/gpt-5.4-mini" | "openai/gpt-5.4-nano" | "anthropic/claude-opus-4.7" | "anthropic/claude-opus-4-6" | "anthropic/claude-sonnet-4-6" | "google/gemini-3-flash-preview" | "google/gemini-3.6-flash";
        /** @enum {string} */
        InstructionsPreset: "custom" | "ai-chatbot" | "customer-support" | "sales-agent" | "language-tutor" | "coding-expert" | "life-coach";
        UpdateAiSettingsRequest: {
            model?: components["schemas"]["Model"];
            instructionsPreset?: components["schemas"]["InstructionsPreset"];
            instructionsPrompt?: string;
        };
        BrandingSettings: {
            /** @enum {string} */
            appearance?: "Light" | "Dark";
            primaryColor?: string;
            bubbleColor?: string;
            primaryColorHeader?: boolean;
            bubbleIconUrl?: string;
            profilePictureUrl?: string;
            hideBranding?: boolean;
        } & {
            [key: string]: unknown;
        };
        ConversationDesignSettings: {
            initialMessages?: string[];
            messagePlaceholder?: string;
            showInitialMessageBubble?: boolean;
            defaultPrompts?: {
                enabled: boolean;
                keepShowing: boolean;
                prompts: string[];
            };
        } & {
            [key: string]: unknown;
        };
        DesignSettings: {
            title?: string;
            /** @description Stored widget locale, normalized to one of en, de, es, fr, it, nl, pl, pt, zh-tw. Null when unset or when the stored value is not a supported locale. */
            language?: string | null;
            /** @enum {string} */
            position?: "bottom-left" | "bottom-right";
            branding?: components["schemas"]["BrandingSettings"];
            conversation?: components["schemas"]["ConversationDesignSettings"];
        };
        UpdateDesignSettingsRequest: {
            title?: string;
            /** @description Widget locale. Canonical values: en, de, es, fr, it, nl, pl, pt, zh-tw. Region and script subtags are normalized (en-US to en; zh-TW, zh-HK, zh-MO, and zh-Hant to zh-tw), underscores are treated as hyphens, and matching is case-insensitive. Any other language — including zh-Hans — is rejected. Null clears the setting. */
            language?: string | null;
            /** @enum {string} */
            appearance?: "Light" | "Dark";
            primaryColor?: string;
            bubbleColor?: string;
            primaryColorHeader?: boolean;
            /** @enum {string} */
            position?: "bottom-left" | "bottom-right";
            showInitialMessageBubble?: boolean;
            initialMessages?: string[] | string;
            messagePlaceholder?: string;
            /** Format: uri */
            bubbleIconUrl?: string | null;
            /** Format: uri */
            profilePictureUrl?: string | null;
            hideBranding?: boolean;
            keepShowing?: boolean;
            prompts?: string[];
        };
        RateLimitSettings: {
            maxMessages: number;
            windowSeconds: number;
            limitMessage: string;
        };
        AllowedDomains: {
            enabled: boolean;
            domains: string[];
        } & unknown;
        SecuritySettings: {
            isPrivate?: boolean;
            rateLimit?: components["schemas"]["RateLimitSettings"];
            allowedDomains?: components["schemas"]["AllowedDomains"];
        };
        UpdateSecuritySettingsRequest: {
            isPrivate?: boolean;
            rateLimit?: components["schemas"]["RateLimitSettings"];
            allowedDomains?: components["schemas"]["AllowedDomains"];
        };
        NotificationSettings: {
            dailyConversations?: boolean;
            dailyEmails?: boolean;
            quotaAlerts?: boolean;
        };
        UpdateNotificationSettingsRequest: {
            dailyConversations?: boolean;
            dailyEmails?: boolean;
            quotaAlerts?: boolean;
        };
        TrainingSettings: {
            autoRetrainEnabled?: boolean;
        };
        UpdateTrainingSettingsRequest: {
            autoRetrainEnabled: boolean;
        };
        TrainingStatus: {
            /** @enum {string} */
            status: "training" | "trained" | "idle";
            documentCount: number;
            lastTrainedAt: number | null;
            activeJob: components["schemas"]["ActiveTrainingJob"] | null;
        };
        ActiveTrainingJob: {
            id: number;
            status: string;
            tasksCount: number;
            tasksCompletedCount: number;
            createdAt: number | null;
        };
        TrainingJob: {
            jobId: number | null;
            count: number;
            message: string;
        };
        /** @enum {string} */
        InstagramLoginKind: "instagram_login" | "facebook_login" | "facebook_business_login";
        InstagramLink: {
            label: string;
            url: string;
        };
        InstagramIntent: {
            name: string;
            description: string;
        };
        RespondToDmsConfig: {
            /** @enum {string} */
            mode: "all" | "keywords";
            keywords: string;
            message: string;
            links: components["schemas"]["InstagramLink"][];
            /** @default false */
            intentsEnabled: boolean;
            /** @default [] */
            intents: components["schemas"]["InstagramIntent"][];
            /** @default false */
            fallbackEnabled: boolean;
            /** @default  */
            fallbackMessage: string;
            /** @default false */
            followUpEnabled: boolean;
            followUpMessage?: string;
            /** @default false */
            requireFollow: boolean;
            notFollowerReply?: string;
            /** @default false */
            askEmailEnabled: boolean;
            askEmailPrompt?: string;
            askEmailRetryMessage?: string;
            askEmailConfirmMessage?: string;
        };
        CommentToDmConfig: {
            /** @enum {string} */
            postScope: "specific" | "any" | "next";
            mediaId: string;
            /** @enum {string} */
            filter: "specific" | "any";
            keywords: string;
            publicReplyEnabled: boolean;
            publicReplies: {
                value: string;
            }[];
            openingMessage: string;
            buttonLabel?: string;
            linkMessage: string;
            links: components["schemas"]["InstagramLink"][];
            /** @default false */
            requireFollow: boolean;
            notFollowerReply?: string;
            /** @default false */
            noClickFollowUpEnabled: boolean;
            noClickFollowUpMessage?: string;
        };
        StoryLeadsConfig: {
            /** @enum {string} */
            storyScope: "any" | "specific";
            storyId: string;
            /** @enum {string} */
            filter: "specific" | "any";
            keywords: string;
            reactions: string[];
            message: string;
            links: components["schemas"]["InstagramLink"][];
            followUpEnabled: boolean;
            followUpMessage?: string;
            /** @default false */
            requireFollow: boolean;
            notFollowerReply?: string;
            /** @default false */
            reactToReplyEnabled: boolean;
            /** @default false */
            askEmailEnabled: boolean;
            askEmailPrompt?: string;
            askEmailRetryMessage?: string;
            askEmailConfirmMessage?: string;
        };
        StoryMentionsConfig: {
            message: string;
            links: components["schemas"]["InstagramLink"][];
        };
        InstagramAutomationConfig: components["schemas"]["RespondToDmsConfig"] | components["schemas"]["CommentToDmConfig"] | components["schemas"]["StoryLeadsConfig"] | components["schemas"]["StoryMentionsConfig"];
        InstagramAutomationInstanceConfig: components["schemas"]["CommentToDmConfig"] | components["schemas"]["StoryLeadsConfig"];
        InstagramAutomation: {
            /** @enum {string} */
            key: "respond_to_dms" | "comment_to_dm" | "story_leads" | "story_mentions";
            /** @enum {string} */
            status: "draft" | "live" | "off";
            config: components["schemas"]["InstagramAutomationConfig"];
        };
        InstagramAutomationInstance: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            key: "comment_to_dm" | "story_leads";
            /** @enum {string} */
            status: "draft" | "live" | "off";
            config: components["schemas"]["InstagramAutomationInstanceConfig"];
        };
        CreateInstagramAutomationInstanceRequest: {
            /** @description The complete configuration for the kind in the path: comment_to_dm takes CommentToDmConfig, story_leads takes StoryLeadsConfig. */
            config: components["schemas"]["InstagramAutomationInstanceConfig"];
            /** @enum {string} */
            status?: "draft" | "live" | "off";
        };
        UpdateInstagramAutomationRequest: {
            /** @description Each key accepts exactly one config shape: respond_to_dms takes RespondToDmsConfig, comment_to_dm takes CommentToDmConfig, story_leads takes StoryLeadsConfig, and story_mentions takes StoryMentionsConfig. A config for the wrong key is rejected with VALIDATION_INVALID_BODY. */
            config?: components["schemas"]["InstagramAutomationConfig"];
            /** @enum {string} */
            status?: "draft" | "live" | "off";
        };
        UpdateInstagramAutomationInstanceRequest: {
            /** @description The complete configuration for the kind in the path: comment_to_dm takes CommentToDmConfig, story_leads takes StoryLeadsConfig. A config for the wrong key is rejected with VALIDATION_INVALID_BODY. */
            config?: components["schemas"]["InstagramAutomationInstanceConfig"];
            /** @enum {string} */
            status?: "draft" | "live" | "off";
        };
        InstagramConversationStarter: {
            question: string;
            message: string;
            links: components["schemas"]["InstagramLink"][];
        };
        InstagramConversationStarterList: components["schemas"]["InstagramConversationStarter"][];
        InstagramConversationStarters: {
            /** @enum {string} */
            status: "draft" | "live" | "off";
            draft_prompts: components["schemas"]["InstagramConversationStarterList"];
            live_prompts: components["schemas"]["InstagramConversationStarterList"] | null;
            /** Format: date-time */
            synced_at: string | null;
            last_sync_error: string | null;
        };
        UpdateInstagramConversationStartersRequest: {
            prompts?: components["schemas"]["InstagramConversationStarterList"];
            /** @enum {string} */
            status?: "draft" | "live" | "off";
        };
        InstagramMenuItem: {
            id: string;
            title: string;
            action: {
                /** @constant */
                kind: "web_url";
                url: string;
            } | {
                /** @constant */
                kind: "postback";
                reply: string;
            };
        };
        /** @description At most five items. Each id must be unique across the array after trimming; duplicates return 400 VALIDATION_INVALID_BODY. */
        InstagramMenuItems: components["schemas"]["InstagramMenuItem"][];
        InstagramMenu: {
            /** @enum {string} */
            status: "draft" | "live" | "off" | "sync_error";
            draft_items: components["schemas"]["InstagramMenuItems"];
            live_items: components["schemas"]["InstagramMenuItems"] | null;
            /** Format: date-time */
            synced_at: string | null;
            last_sync_error: string | null;
        };
        UpdateInstagramMenuRequest: {
            items?: components["schemas"]["InstagramMenuItems"];
            /** @enum {string} */
            status?: "draft" | "live" | "off";
        } & unknown;
        InstagramPermissionRefresh: {
            /** @enum {string} */
            outcome: "verified" | "reconnect_required" | "repair_submitted_unverified" | "retryable_error";
            /** @enum {string} */
            code?: "token_invalid" | "missing_scopes" | "missing_page_mapping" | "missing_ig_mapping" | "grant_readback_unavailable" | "subscription_readback_unavailable" | "subscription_readback_mismatch" | "rate_limited" | "meta_5xx" | "network" | "parse";
            missingScopes?: string[];
            /** Format: date-time */
            lastVerifiedAt: string | null;
            loginKind: components["schemas"]["InstagramLoginKind"];
        };
        InstagramChannel: {
            /** @constant */
            connected: false;
        } | {
            /** @constant */
            connected: true;
            /** Format: uuid */
            id: string;
            instagram_username: string | null;
            instagram_user_id: string;
            facebook_page_name: string | null;
            /** Format: uri */
            profile_picture_url: string | null;
            login_kind: components["schemas"]["InstagramLoginKind"];
            status: string;
            scopes: string[];
            last_error_message: string | null;
            /** Format: date-time */
            last_verified_at: string | null;
            automations: components["schemas"]["InstagramAutomation"][];
            conversation_starters: components["schemas"]["InstagramConversationStarters"];
            menu: components["schemas"]["InstagramMenu"];
        };
        EmailMessageDetail: {
            data: {
                id: string;
                threadId: string;
                direction: string;
                draftId: string | null;
                providerEmailId: string | null;
                fromAddress: string;
                toAddresses: string[];
                ccAddresses: string[];
                bccAddresses: string[];
                subject: string;
                text: string | null;
                html: string | null;
                headers: unknown;
                createdAt: string;
                processingDisposition: string;
                discardReason: {
                    [key: string]: unknown;
                } | null;
            };
        };
    };
    responses: {
        /** @description The request body, path value, or query value is invalid. */
        BadRequest: {
            headers: {
                "x-request-id": components["headers"]["RequestId"];
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The bearer API key is missing or invalid. */
        Unauthorized: {
            headers: {
                "x-request-id": components["headers"]["RequestId"];
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The workspace plan does not permit the request or a quota was reached. */
        Forbidden: {
            headers: {
                "x-request-id": components["headers"]["RequestId"];
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The requested agent or resource was not found. */
        NotFound: {
            headers: {
                "x-request-id": components["headers"]["RequestId"];
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The server could not complete the request. */
        InternalServerError: {
            headers: {
                "x-request-id": components["headers"]["RequestId"];
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The request conflicts with the current conversation or Instagram connection state. */
        Conflict: {
            headers: {
                "x-request-id": components["headers"]["RequestId"];
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The request is well-formed but its content cannot be processed. */
        UnprocessableEntity: {
            headers: {
                "x-request-id": components["headers"]["RequestId"];
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The Backstage request was rate-limited or the concurrency limit was reached. */
        TooManyRequests: {
            headers: {
                "x-request-id": components["headers"]["RequestId"];
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Instagram rejected or failed to confirm the change. */
        BadGateway: {
            headers: {
                "x-request-id": components["headers"]["RequestId"];
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
    };
    parameters: {
        /** @description Set to session when Authorization contains a Supabase user access JWT. Required when selecting session authentication; omit when using a workspace API key. */
        OptionalSessionAuthMode: "session";
        /** @description Selects explicit user-session authentication. */
        SessionAuthMode: "session";
        /** @description Widget UUID. */
        WidgetId: string;
        /** @description Custom API action UUID. */
        ActionId: string;
        /** @description Action secret name. */
        SecretName: string;
        /** @description Immutable widget version UUID. */
        WidgetVersionId: string;
        /** @description Management channel identifier. */
        ChannelId: "web" | "help_page" | "center_stage" | "instagram" | "whatsapp" | "email";
        /** @description Backstage session UUID. */
        BackstageSessionId: string;
        /** @description Backstage proposed-change UUID. */
        BackstageChangeId: string;
        /** @description Maximum number of records to return. */
        Limit: number;
        /** @description Opaque base64url cursor returned by the preceding page. Replay it unchanged. */
        Cursor: string;
        /** @description Agent UUID. */
        AgentId: string;
        /** @description Public conversation reference ID. */
        ConversationId: string;
        /** @description Positive numeric message ID serialized as a string. */
        MessageId: string;
        /** @description Caller-supplied stable end-user ID. */
        UserId: string;
        /** @description Training source document UUID. */
        DocumentId: string;
        /** @description A many-instance Instagram automation kind: comment_to_dm or story_leads. The singleton kinds have no instances. */
        AutomationInstanceKey: "comment_to_dm" | "story_leads";
        /** @description Instagram automation instance id. */
        AutomationInstanceId: string;
        /** @description Instagram automation key. */
        AutomationKey: "respond_to_dms" | "comment_to_dm" | "story_leads" | "story_mentions";
        /** @description Conversation source. Omitted source includes api_v2 and API Playground tests. all includes api_v2, widget, instagram and API Playground tests; native browser previews are excluded. */
        ConversationMessageSource: "api_v2" | "widget" | "instagram" | "playground" | "all";
        /** @description Conversation source. all includes api_v2, widget, instagram and API Playground tests. playground selects API Playground tests; native browser previews are excluded. */
        ConversationSource: "api_v2" | "widget" | "instagram" | "playground" | "all";
    };
    requestBodies: never;
    headers: {
        /** @description Unique request identifier. Include this value when contacting support. */
        RequestId: string;
    };
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    listManagementChannels: {
        parameters: {
            query?: never;
            header?: {
                /** @description Set to session when Authorization contains a Supabase user access JWT. Required when selecting session authentication; omit when using a workspace API key. */
                "X-Agentkit-Auth"?: components["parameters"]["OptionalSessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Channel inventory. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ManagementChannelList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getManagementChannel: {
        parameters: {
            query?: never;
            header?: {
                /** @description Set to session when Authorization contains a Supabase user access JWT. Required when selecting session authentication; omit when using a workspace API key. */
                "X-Agentkit-Auth"?: components["parameters"]["OptionalSessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Management channel identifier. */
                channel: components["parameters"]["ChannelId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Channel details. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ManagementChannelDetail"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    updateManagementChannelOverride: {
        parameters: {
            query?: never;
            header?: {
                /** @description Set to session when Authorization contains a Supabase user access JWT. Required when selecting session authentication; omit when using a workspace API key. */
                "X-Agentkit-Auth"?: components["parameters"]["OptionalSessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Management channel identifier. */
                channel: components["parameters"]["ChannelId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChannelOverrideRequest"];
            };
        };
        responses: {
            /** @description Updated channel details. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ManagementChannelDetail"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    updateWebPresentation: {
        parameters: {
            query?: never;
            header?: {
                /** @description Set to session when Authorization contains a Supabase user access JWT. Required when selecting session authentication; omit when using a workspace API key. */
                "X-Agentkit-Auth"?: components["parameters"]["OptionalSessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WebPresentationRequest"];
            };
        };
        responses: {
            /** @description Updated web channel details. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ManagementChannelDetail"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getCenterStage: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Center Stage settings. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CenterStageView"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    updateCenterStage: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CenterStageRequest"];
            };
        };
        responses: {
            /** @description Updated Center Stage settings. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CenterStageView"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    listCustomApiActions: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Custom API actions. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomApiActionList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    createCustomApiAction: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCustomApiActionRequest"];
            };
        };
        responses: {
            /** @description Created disabled action. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomApiAction"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getCustomApiAction: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Custom API action UUID. */
                actionId: components["parameters"]["ActionId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Custom API action. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomApiAction"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    deleteCustomApiAction: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Custom API action UUID. */
                actionId: components["parameters"]["ActionId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeleteCustomApiActionRequest"];
            };
        };
        responses: {
            /** @description Deletion confirmation. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Deleted"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    updateCustomApiAction: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Custom API action UUID. */
                actionId: components["parameters"]["ActionId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateCustomApiActionRequest"];
            };
        };
        responses: {
            /** @description Updated action. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomApiAction"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    setCustomApiActionStatus: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Custom API action UUID. */
                actionId: components["parameters"]["ActionId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetCustomApiActionStatusRequest"];
            };
        };
        responses: {
            /** @description Updated action. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomApiAction"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    listAgentSecrets: {
        parameters: {
            query?: never;
            header?: {
                /** @description Set to session when Authorization contains a Supabase user access JWT. Required when selecting session authentication; omit when using a workspace API key. */
                "X-Agentkit-Auth"?: components["parameters"]["OptionalSessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Secret metadata. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecretMetadataList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    setAgentSecret: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Action secret name. */
                name: components["parameters"]["SecretName"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetAgentSecretRequest"];
            };
        };
        responses: {
            /** @description Secret metadata. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecretMetadata"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    deleteAgentSecret: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Action secret name. */
                name: components["parameters"]["SecretName"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deletion confirmation. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Deleted"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    listWidgets: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Widgets. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WidgetList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    createWidget: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateWidgetRequest"];
            };
        };
        responses: {
            /** @description Created widget. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Widget"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    importWidget: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ImportWidgetRequest"];
            };
        };
        responses: {
            /** @description Imported widget and compile warnings. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WidgetMutationResult"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getWidget: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Widget UUID. */
                widgetId: components["parameters"]["WidgetId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Widget. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Widget"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    deleteWidget: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Widget UUID. */
                widgetId: components["parameters"]["WidgetId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deletion confirmation. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Deleted"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    saveWidgetDraft: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Widget UUID. */
                widgetId: components["parameters"]["WidgetId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SaveWidgetDraftRequest"];
            };
        };
        responses: {
            /** @description Saved widget. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Widget"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    setWidgetStatus: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Widget UUID. */
                widgetId: components["parameters"]["WidgetId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetWidgetStatusRequest"];
            };
        };
        responses: {
            /** @description New status. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WidgetStatusResult"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    publishWidget: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Widget UUID. */
                widgetId: components["parameters"]["WidgetId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublishWidgetRequest"];
            };
        };
        responses: {
            /** @description Published immutable version and warnings. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublishedWidgetResult"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            422: components["responses"]["UnprocessableEntity"];
        };
    };
    listWidgetVersions: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Widget UUID. */
                widgetId: components["parameters"]["WidgetId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Widget versions. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WidgetVersionList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getWidgetVersion: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Widget UUID. */
                widgetId: components["parameters"]["WidgetId"];
                /** @description Immutable widget version UUID. */
                versionId: components["parameters"]["WidgetVersionId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Widget version. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WidgetVersion"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    duplicateWidget: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Widget UUID. */
                widgetId: components["parameters"]["WidgetId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Duplicated widget. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Widget"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    exportWidget: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Widget UUID. */
                widgetId: components["parameters"]["WidgetId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Portable widget package. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WidgetPackage"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getBackstageOverview: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Agent inventory. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BackstageOverview"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    listBackstageSessions: {
        parameters: {
            query?: {
                /** @description Maximum number of records to return. */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque base64url cursor returned by the preceding page. Replay it unchanged. */
                cursor?: components["parameters"]["Cursor"];
            };
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Session page. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BackstageSessionList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getBackstageSession: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Backstage session UUID. */
                sessionId: components["parameters"]["BackstageSessionId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Session detail. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BackstageSessionDetail"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    deleteBackstageSession: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Backstage session UUID. */
                sessionId: components["parameters"]["BackstageSessionId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deletion confirmation. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Deleted"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getBackstageChange: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Backstage proposed-change UUID. */
                changeId: components["parameters"]["BackstageChangeId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Change state. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BackstageChange"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    decideBackstageChange: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Backstage proposed-change UUID. */
                changeId: components["parameters"]["BackstageChangeId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BackstageDecisionRequest"];
            };
        };
        responses: {
            /** @description Resulting change state. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BackstageChangeState"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getBackstageRun: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                runId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Saved run progress. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BackstageRun"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    cancelBackstageRun: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                runId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Saved run state. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BackstageRun"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    chatWithBackstage: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BackstageMessageRequest"];
            };
        };
        responses: {
            /** @description Durable run admission. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BackstageRunAdmission"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    listEmailThreads: {
        parameters: {
            query?: {
                status?: "all" | "to_review" | "sent" | "discarded";
                since?: string;
                /** @description Maximum number of records to return. */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque base64url cursor returned by the preceding page. Replay it unchanged. */
                cursor?: components["parameters"]["Cursor"];
            };
            header?: {
                /** @description Set to session when Authorization contains a Supabase user access JWT. Required when selecting session authentication; omit when using a workspace API key. */
                "X-Agentkit-Auth"?: components["parameters"]["OptionalSessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailThreadList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getEmailThread: {
        parameters: {
            query?: never;
            header?: {
                /** @description Set to session when Authorization contains a Supabase user access JWT. Required when selecting session authentication; omit when using a workspace API key. */
                "X-Agentkit-Auth"?: components["parameters"]["OptionalSessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                threadId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailThreadDetail"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    discardEmailThread: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                threadId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailDiscardRequest"];
            };
        };
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailMutationResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    restoreEmailThread: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                threadId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailRestoreRequest"];
            };
        };
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailMutationResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    draftEmailThread: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                threadId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailMutationResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    forwardEmailMessage: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                messageId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailForwardRequest"];
            };
        };
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailMutationResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    listEmailDrafts: {
        parameters: {
            query?: {
                since?: string;
                /** @description Maximum number of records to return. */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque base64url cursor returned by the preceding page. Replay it unchanged. */
                cursor?: components["parameters"]["Cursor"];
            };
            header?: {
                /** @description Set to session when Authorization contains a Supabase user access JWT. Required when selecting session authentication; omit when using a workspace API key. */
                "X-Agentkit-Auth"?: components["parameters"]["OptionalSessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailDraftList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getEmailDraft: {
        parameters: {
            query?: never;
            header?: {
                /** @description Set to session when Authorization contains a Supabase user access JWT. Required when selecting session authentication; omit when using a workspace API key. */
                "X-Agentkit-Auth"?: components["parameters"]["OptionalSessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                draftId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailDraftDetail"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    editEmailDraft: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                draftId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailEditRequest"];
            };
        };
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailDraftDetail"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    sendEmailDraft: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                draftId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailSendRequest"];
            };
        };
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailMutationResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    enableEmailChannel: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailEnableRequest"];
            };
        };
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailChannelResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    disableEmailChannel: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailChannelResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getEmailSettings: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailChannelResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    updateEmailSettings: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailSettingsRequest"];
            };
        };
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailChannelResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getEmailReplyAddress: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailChannelResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    addEmailReplyAddress: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailAddressRequest"];
            };
        };
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailReplyAddressResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    removeEmailReplyAddress: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailChannelResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    verifyEmailReplyAddress: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailVerifyRequest"];
            };
        };
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailReplyAddressResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    listEmailAutomatedSenders: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailAutomatedSendersResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    addEmailAutomatedSender: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailAddressRequest"];
            };
        };
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailAutomatedSendersResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    removeEmailAutomatedSender: {
        parameters: {
            query?: never;
            header: {
                /** @description Selects explicit user-session authentication. */
                "X-Agentkit-Auth": components["parameters"]["SessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailAddressRequest"];
            };
        };
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailAutomatedSendersResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The API is available. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
        };
    };
    listAgents: {
        parameters: {
            query?: {
                /** @description Maximum number of records to return. */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque base64url cursor returned by the preceding page. Replay it unchanged. */
                cursor?: components["parameters"]["Cursor"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of agents. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AgentList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
    createAgent: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateAgentRequest"];
            };
        };
        responses: {
            /** @description The created agent. */
            201: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Agent"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
    getAgent: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The requested agent. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Agent"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    deleteAgent: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Confirmation that the agent was deleted. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Deleted"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateAgent: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateAgentRequest"];
            };
        };
        responses: {
            /** @description The updated agent. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Agent"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    chatWithAgent: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChatRequest"];
            };
        };
        responses: {
            /** @description A Server-Sent Events stream when stream is true, or one JSON assistant message when stream is false. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": components["schemas"]["EventStream"];
                    "application/json": components["schemas"]["ChatResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    listConversations: {
        parameters: {
            query?: {
                /** @description Maximum number of records to return. */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque base64url cursor returned by the preceding page. Replay it unchanged. */
                cursor?: components["parameters"]["Cursor"];
                /** @description Conversation source. all includes api_v2, widget, instagram and API Playground tests. playground selects API Playground tests; native browser previews are excluded. */
                source?: components["parameters"]["ConversationSource"];
            };
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of conversation summaries. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConversationList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    exportConversations: {
        parameters: {
            query?: {
                /** @description Maximum conversations to return. */
                limit?: number;
                /** @description Opaque base64url cursor returned by the preceding page. Replay it unchanged. */
                cursor?: components["parameters"]["Cursor"];
                /** @description Conversation source. all includes api_v2, widget, instagram and API Playground tests. playground selects API Playground tests; native browser previews are excluded. */
                source?: components["parameters"]["ConversationSource"];
            };
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of conversations with complete transcripts. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConversationExportList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    getConversation: {
        parameters: {
            query?: {
                /** @description Conversation source. all includes api_v2, widget, instagram and API Playground tests. playground selects API Playground tests; native browser previews are excluded. */
                source?: components["parameters"]["ConversationSource"];
            };
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Public conversation reference ID. */
                conversationId: components["parameters"]["ConversationId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The conversation and its transcript. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConversationDetail"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    listConversationMessages: {
        parameters: {
            query?: {
                /** @description Conversation source. Omitted source includes api_v2 and API Playground tests. all includes api_v2, widget, instagram and API Playground tests; native browser previews are excluded. */
                source?: components["parameters"]["ConversationMessageSource"];
                /** @description Maximum number of records to return. */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque base64url cursor returned by the preceding page. Replay it unchanged. */
                cursor?: components["parameters"]["Cursor"];
            };
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Public conversation reference ID. */
                conversationId: components["parameters"]["ConversationId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of conversation messages. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateMessageFeedback: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Public conversation reference ID. */
                conversationId: components["parameters"]["ConversationId"];
                /** @description Positive numeric message ID serialized as a string. */
                messageId: components["parameters"]["MessageId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FeedbackRequest"];
            };
        };
        responses: {
            /** @description The assistant message with its updated feedback. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageEnvelope"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            422: components["responses"]["UnprocessableEntity"];
        };
    };
    retryConversation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Public conversation reference ID. */
                conversationId: components["parameters"]["ConversationId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RetryRequest"];
            };
        };
        responses: {
            /** @description A Server-Sent Events stream when stream is true, or one regenerated assistant message when stream is false. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": components["schemas"]["EventStream"];
                    "application/json": components["schemas"]["RetryResponse"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            500: components["responses"]["InternalServerError"];
        };
    };
    submitToolResult: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Public conversation reference ID. */
                conversationId: components["parameters"]["ConversationId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ToolResultRequest"];
            };
        };
        responses: {
            /** @description Assistant continuation after the tool result, always as Server-Sent Events. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": components["schemas"]["EventStream"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    listUserConversations: {
        parameters: {
            query?: {
                /** @description Maximum number of records to return. */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque base64url cursor returned by the preceding page. Replay it unchanged. */
                cursor?: components["parameters"]["Cursor"];
                /** @description Only api_v2 is accepted because user IDs are written by API v2 chat. */
                source?: "api_v2";
            };
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Caller-supplied stable end-user ID. */
                userId: components["parameters"]["UserId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of conversations for the end user. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConversationList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    listSources: {
        parameters: {
            query?: {
                /** @description Maximum number of records to return. */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque base64url cursor returned by the preceding page. Replay it unchanged. */
                cursor?: components["parameters"]["Cursor"];
                /** @description Restricts results to one stored source type. */
                sourceType?: "web_crawl" | "file_upload" | "text_snippet" | "qna_entry";
            };
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of training sources. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    createTextSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTextSourceRequest"];
            };
        };
        responses: {
            /** @description The text source was created. */
            201: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocumentCreated"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    createQnaSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateQnaSourceRequest"];
            };
        };
        responses: {
            /** @description The Q&A source was created. */
            201: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocumentCreated"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    createUrlSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateUrlSourceRequest"];
            };
        };
        responses: {
            /** @description The URL processing job was queued. */
            202: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UrlSourceJob"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            500: components["responses"]["InternalServerError"];
        };
    };
    createFileUploadUrls: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateFileUploadUrlsRequest"];
            };
        };
        responses: {
            /** @description Signed upload details for each file. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FileUploadUrls"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            500: components["responses"]["InternalServerError"];
        };
    };
    registerFileSources: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterFilesRequest"];
            };
        };
        responses: {
            /** @description The file processing job was queued. */
            202: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FileProcessingJob"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            500: components["responses"]["InternalServerError"];
        };
    };
    deleteSource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Training source document UUID. */
                documentId: components["parameters"]["DocumentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Confirmation that the source was deleted. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Deleted"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    listContacts: {
        parameters: {
            query?: {
                /** @description Maximum number of records to return. */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque base64url cursor returned by the preceding page. Replay it unchanged. */
                cursor?: components["parameters"]["Cursor"];
                /** @description Case-insensitive substring search across external ID, email, name, and phone. */
                search?: string;
            };
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of contacts. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContactList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    upsertContact: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpsertContactRequest"];
            };
        };
        responses: {
            /** @description The inserted or updated contact. */
            201: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Contact"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    importContacts: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ImportContactsRequest"];
            };
        };
        responses: {
            /** @description Counts of processed and deduplicated rows. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportContactsResult"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    listLeads: {
        parameters: {
            query?: {
                /** @description Maximum number of records to return. */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque base64url cursor returned by the preceding page. Replay it unchanged. */
                cursor?: components["parameters"]["Cursor"];
                /** @description Inclusive lower bound as an ISO 8601 datetime. */
                createdAfter?: string;
                /** @description Inclusive upper bound as an ISO 8601 datetime. */
                createdBefore?: string;
            };
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of captured leads. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LeadList"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    getAiSettings: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The current AI settings. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AiSettings"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateAiSettings: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateAiSettingsRequest"];
            };
        };
        responses: {
            /** @description The updated AI settings. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AiSettings"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    getDesignSettings: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The current design settings. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DesignSettings"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateDesignSettings: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateDesignSettingsRequest"];
            };
        };
        responses: {
            /** @description The complete updated agent settings. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AgentSettings"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    getSecuritySettings: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The current security settings. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecuritySettings"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateSecuritySettings: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateSecuritySettingsRequest"];
            };
        };
        responses: {
            /** @description The updated security settings. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SecuritySettings"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    getNotificationSettings: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The current notification settings. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationSettings"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateNotificationSettings: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateNotificationSettingsRequest"];
            };
        };
        responses: {
            /** @description The updated notification settings. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationSettings"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    getTrainingSettings: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The current training settings. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingSettings"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateTrainingSettings: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateTrainingSettingsRequest"];
            };
        };
        responses: {
            /** @description The updated training settings. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingSettings"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    getTrainingStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The current training status. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingStatus"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    startTraining: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No web sources were available to retrain. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingJob"];
                };
            };
            /** @description Retraining was queued. */
            202: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingJob"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    getInstagramChannel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The Instagram channel summary. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstagramChannel"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    getInstagramAutomation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Instagram automation key. */
                key: components["parameters"]["AutomationKey"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The automation status and configuration. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstagramAutomation"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateInstagramAutomation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description Instagram automation key. */
                key: components["parameters"]["AutomationKey"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateInstagramAutomationRequest"];
            };
        };
        responses: {
            /** @description The saved automation status and configuration. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstagramAutomation"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    listInstagramAutomationInstances: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description A many-instance Instagram automation kind: comment_to_dm or story_leads. The singleton kinds have no instances. */
                key: components["parameters"]["AutomationInstanceKey"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The automation instances, oldest first. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstagramAutomationInstance"][];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    createInstagramAutomationInstance: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description A many-instance Instagram automation kind: comment_to_dm or story_leads. The singleton kinds have no instances. */
                key: components["parameters"]["AutomationInstanceKey"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateInstagramAutomationInstanceRequest"];
            };
        };
        responses: {
            /** @description The created automation instance. */
            201: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstagramAutomationInstance"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getInstagramAutomationInstance: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description A many-instance Instagram automation kind: comment_to_dm or story_leads. The singleton kinds have no instances. */
                key: components["parameters"]["AutomationInstanceKey"];
                /** @description Instagram automation instance id. */
                id: components["parameters"]["AutomationInstanceId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The automation instance. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstagramAutomationInstance"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateInstagramAutomationInstance: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                /** @description A many-instance Instagram automation kind: comment_to_dm or story_leads. The singleton kinds have no instances. */
                key: components["parameters"]["AutomationInstanceKey"];
                /** @description Instagram automation instance id. */
                id: components["parameters"]["AutomationInstanceId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateInstagramAutomationInstanceRequest"];
            };
        };
        responses: {
            /** @description The saved automation instance. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstagramAutomationInstance"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getInstagramConversationStarters: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The conversation starter state. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstagramConversationStarters"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateInstagramConversationStarters: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateInstagramConversationStartersRequest"];
            };
        };
        responses: {
            /** @description The stored and confirmed conversation starter state. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstagramConversationStarters"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            502: components["responses"]["BadGateway"];
        };
    };
    getInstagramMenu: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The persistent menu state. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstagramMenu"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateInstagramMenu: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateInstagramMenuRequest"];
            };
        };
        responses: {
            /** @description The stored and confirmed persistent menu state. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstagramMenu"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            502: components["responses"]["BadGateway"];
        };
    };
    refreshInstagramPermissions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The permission verification outcome. */
            200: {
                headers: {
                    "x-request-id": components["headers"]["RequestId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstagramPermissionRefresh"];
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    getEmailMessage: {
        parameters: {
            query?: never;
            header?: {
                /** @description Set to session when Authorization contains a Supabase user access JWT. Required when selecting session authentication; omit when using a workspace API key. */
                "X-Agentkit-Auth"?: components["parameters"]["OptionalSessionAuthMode"];
            };
            path: {
                /** @description Agent UUID. */
                agentId: components["parameters"]["AgentId"];
                messageId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Email operation result. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmailMessageDetail"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
}
