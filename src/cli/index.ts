#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import { Command, CommanderError, InvalidArgumentError } from "commander";
import { registerEmailCommands } from "./email.js";

import { CAPABILITIES } from "../shared/capabilities.js";
import { VERSION } from "../sdk/version.js";
import type { StreamEvent, SecurityUpdate, AiUpdate } from "../sdk/types.js";
import { AgentkitClient } from "../sdk/client.js";
import { AgentkitError } from "../sdk/errors.js";
import { DESIGN_LIMITS } from "../sdk/types.js";
import type {
  ChatRequest,
  ConversationSource,
  DesignUpdate,
  Feedback,
  InstagramAutomationStatus,
  InstagramAutomationInstanceKey,
  CreateInstagramAutomationInstanceRequest,
  UpdateInstagramAutomationInstanceRequest,
  ImportContactsRequest,
  RegisterFilesRequest,
  UpdateAgentRequest,
  InstagramAutomationUpdate,
  InstagramConversationStartersUpdate,
  InstagramMenuUpdate,
  InstagramStarterPrompt,
  Pagination,
  EmailListOptions,
  EmailStatus,
} from "../sdk/types.js";
import { printEmailThread, emailReviewReason } from "../shared/email.js";
import {
  limitStarterPrompts,
  parseAutomationConfigJson,
  parseAutomationKey,
  parseStarterPromptArg,
  parseStarterPromptsJson,
  parseMenuItemsJson,
} from "../shared/instagram.js";
import {
  configPath,
  readConfig,
  resolveConfig,
  writeConfig,
  redact,
  rememberKey,
} from "../shared/config.js";
import { listProjects, loadProject, addProject, removeProject, importProjects } from "../shared/project.js";

type GlobalOpts = { url?: string; key?: string; json?: boolean; timeout?: number };
const cancellation = new AbortController();
process.once("SIGINT", () => cancellation.abort(new Error("Request cancelled; a write may have completed.")));
for (const key of [process.env.AGENTKIT_API_KEY, process.env.AGENTKIT_KEY, process.env.AGENTKIT_SESSION_TOKEN]) if (key) rememberKey(key);
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--key" && process.argv[i + 1]) rememberKey(process.argv[i + 1]!);
  if (process.argv[i]?.startsWith("--key=")) rememberKey(process.argv[i]!.slice(6));
}

const program = new Command();

program
  .name("agentkit")
  .description("SDK + CLI for the Agentkit (agentkit.ai) v2 API")
  .version(VERSION)
  .configureHelp({ showGlobalOptions: true })
  .option("--url <url>", "API base URL; overrides AGENTKIT_URL/config")
  .option("--key <key>", "API key; prefer AGENTKIT_API_KEY or stdin")
  .option("--json", "Machine-readable JSON output")
  .option("--timeout <ms>", "Total request/stream deadline in milliseconds", positiveInteger, 60000)
  .exitOverride()
  .configureOutput({ outputError: () => {} })
  .hook("preAction", (_root, command) => {
    if (program.opts<GlobalOpts>().json) command.setOptionValue("json", true);
  });

function aiValue(settings: unknown, key: string): string | undefined {
  if (!settings || typeof settings !== "object" || !("ai" in settings)) return undefined;
  const ai = settings.ai;
  if (!ai || typeof ai !== "object") return undefined;
  const value = (ai as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function globalOpts(): GlobalOpts {
  return program.opts<GlobalOpts>();
}

/** Commander argParser accepting only the given literal values. */
function oneOf<T extends string>(...values: T[]): (v: string) => T {
  return (v) => {
    if ((values as readonly string[]).includes(v)) return v as T;
    throw new InvalidArgumentError(`must be one of: ${values.join(", ")}`);
  };
}

const parseSource = oneOf<ConversationSource>("api_v2", "playground", "widget", "all");
const parseEmailStatus = oneOf<EmailStatus>("to_review", "sent", "discarded", "all");
const parseIgStatus = oneOf<InstagramAutomationStatus>("draft", "live", "off");
const parseManagementChannel = oneOf<import("../sdk/types.js").ManagementChannelId>("web", "help_page", "center_stage", "instagram", "whatsapp", "email");
const parseIgInstanceKey = oneOf<InstagramAutomationInstanceKey>("comment_to_dm", "story_leads");

function positiveInteger(v: string): number {
  if (!/^[1-9][0-9]*$/.test(v) || !Number.isSafeInteger(Number(v))) throw new InvalidArgumentError("must be a positive integer");
  return Number(v);
}
function parseLimit(v: string, max = 100): number {
  const n = positiveInteger(v);
  if (n > max) throw new InvalidArgumentError(`must be at most ${max}`);
  return n;
}
function clientOptions() { return { signal: cancellation.signal, timeoutMs: globalOpts().timeout }; }

/** Build a client from the global --url/--key, env, and config file. */
async function apiClient(requireKey = true): Promise<AgentkitClient> {
  const { url, key } = await resolveConfig(globalOpts(), { requireKey });
  return new AgentkitClient({ baseUrl: url, key: key || undefined, ...clientOptions() });
}

/** Resolve a project's agentId + an authenticated client. */
async function projectClient(
  project: string,
): Promise<{ agentId: string; client: AgentkitClient }> {
  const [entry, { url, key }] = await Promise.all([
    loadProject(project),
    resolveConfig(globalOpts()),
  ]);
  return {
    agentId: entry.agentId,
    client: new AgentkitClient({ baseUrl: url, key, ...clientOptions() }),
  };
}

async function managementProjectClient(project: string): Promise<{ agentId: string; client: AgentkitClient }> {
  const [entry, config] = await Promise.all([loadProject(project), resolveConfig(globalOpts(), { requireKey: false, allowSession: true })]);
  return { agentId: entry.agentId, client: new AgentkitClient({ baseUrl: config.url, key: config.key || undefined, sessionToken: config.sessionToken, ...clientOptions() }) };
}

async function emailReadProjectClient(project: string): Promise<{ agentId: string; client: AgentkitClient }> {
  const [entry, config] = await Promise.all([loadProject(project), resolveConfig(globalOpts(), { requireKey: false })]);
  if (!config.key) return managementProjectClient(project);
  return { agentId: entry.agentId, client: new AgentkitClient({ baseUrl: config.url, key: config.key, ...clientOptions() }) };
}

function out(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function printCursorFooter(pagination: Pagination): void {
  if (pagination.hasMore) {
    console.error(`\n(more: next cursor ${pagination.cursor})`);
  }
}

function registerCommands(program: Command): void {
program.command("capabilities [area]").description("Show offline CLI/API coverage, not live channel status")
  .option("--json", "Print JSON")
  .action((area?: string) => {
    const rows = area ? CAPABILITIES.filter(row => row.area === area) : CAPABILITIES;
    if (!rows.length) throw new Error("Unknown capability area; run agentkit capabilities to list areas.");
    out({ kind: "offline-support-catalogue", capabilities: rows });
  });
// ---- top-level commands ----

program
  .command("init")
  .description("Save credentials in user config; POSIX mode 0600")
  .option("--with-token", "Read API key from stdin")
  .option("--with-session-token", "Read a short-lived user access token from stdin")
  .action(async (opts: { withToken?: boolean; withSessionToken?: boolean }) => {
    if (opts.withSessionToken && (opts.withToken || globalOpts().key)) throw new Error("Choose one credential input.");
    if (opts.withSessionToken) {
      const sessionToken = (await readStdin()).trim();
      rememberKey(sessionToken);
      const existing = await readConfig();
      const { url } = await resolveConfig(globalOpts(), { requireKey: false, ignoreCredentials: true });
      await writeConfig({ ...existing, url, sessionToken, sessionUrl: url });
      out({ saved: true, auth: "session" });
      return;
    }
    // Reuses the global --key/--url options.
    let { key, url } = globalOpts();
    if (opts.withToken) {
      if (key) throw new Error("Use either --key or --with-token.");
      key = (await readStdin()).trim();
      if (!key) throw new Error("No token received on stdin.");
      rememberKey(key);
    }
    const existing = await readConfig();
    const next = {
      ...existing,
      ...(key ? { key, keyUrl: url || process.env.AGENTKIT_URL || existing.url || "https://agentkit.ai" } : {}),
      ...(url ? { url } : {}),
    };
    if (!next.key && !next.url) {
      throw new Error("Nothing to save. Pass --key and/or --url.");
    }
    await writeConfig(next);
    if (globalOpts().json) out({ saved: true });
    else console.log(`Saved config to ${configPath()}`);
  });

program.command("logout").description("Remove saved credentials; environment variables and server keys remain active")
  .action(async () => {
    const { url } = await readConfig();
    await writeConfig(url ? { url } : {});
    out({ loggedOut: true, serverKeyRevoked: false });
  });
program.command("projects").description("Manage user aliases")
  .option("--add <values...>", "Register alias and UUID")
  .option("--remove <alias>", "Remove a local alias")
  .option("--import <file>", "Explicitly migrate a registry without endpoint overrides")
  .action(async (opts: { add?: string[]; remove?: string; import?: string }) => {
    if ([opts.add, opts.remove, opts.import].filter(Boolean).length > 1) throw new Error("Choose one alias operation.");
    if (opts.add) {
      if (opts.add.length !== 2) throw new Error("--add requires an alias and agent UUID.");
      await addProject(opts.add[0]!, opts.add[1]!);
    }
    if (opts.remove) await removeProject(opts.remove);
    if (opts.import) await importProjects(opts.import);
    out(await listProjects());
  });

program
  .command("health")
  .description("Check the API is reachable")
  .option("--json", "Print JSON output")
  .action(async () => {
    const { url } = await resolveConfig(globalOpts(), { requireKey: false, ignoreCredentials: true });
    const client = new AgentkitClient({ baseUrl: url, ...clientOptions() });
    out(await client.health());
  });

// ---- project-scoped commands: agentkit <cmd> <project> ----

program
  .command("chat <project> <message>")
  .description("Test the project's agent in Playground")
  .option("--channel <channel>", "Conversation channel", oneOf("playground", "api_v2"), "playground")
  .option("--user <id>", "End-user identifier (api_user_id)")
  .option("--conversation <id>", "Continue an existing conversation")
  .option("--no-stream", "Wait for the full reply and print JSON")
  .option("--json", "Print JSON output (implies --no-stream semantics)")
  .action(
    async (
      project: string,
      message: string,
      opts: {
        user?: string;
        conversation?: string;
        channel: "playground" | "api_v2";
        stream?: boolean;
        json?: boolean;
      },
    ) => {
      const { agentId, client } = await projectClient(project);
      const req: ChatRequest = {
        message,
        channel: opts.channel,
        ...(opts.user ? { userId: opts.user } : {}),
        ...(opts.conversation ? { conversationId: opts.conversation } : {}),
      };

      if (opts.stream === false || opts.json) {
        out(await client.chat(agentId, req));
        return;
      }

      await printStream(client.chatStream(agentId, req));
    },
  );

program
  .command("conversations <project>")
  .description(
    "List conversations (default source=api_v2; use --source playground|widget|all for other supported chats)",
  )
  .option("--limit <n>", "Page size (1-100)", (v: string) => parseLimit(v))
  .option("--cursor <c>", "Pagination cursor")
  .option("--user <id>", "Filter by end-user id")
  .option("--source <s>", "Source filter: api_v2 | playground | widget | all", parseSource)
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      opts: {
        limit?: number;
        cursor?: string;
        user?: string;
        source?: ConversationSource;
        json?: boolean;
      },
    ) => {
      const { agentId, client } = await projectClient(project);
      const listOpts = {
        limit: opts.limit,
        cursor: opts.cursor,
        source: opts.source,
      };
      const list = opts.user
        ? await client.listUserConversations(agentId, opts.user, listOpts)
        : await client.listConversations(agentId, listOpts);
      if (opts.json) return out(list);
      for (const c of list.data) {
        console.log(`${c.id}\t${c.status}\t${c.userId ?? "-"}\t${c.title}`);
      }
      printCursorFooter(list.pagination);
    },
  );

program
  .command("conversation <project> <conversationId>")
  .description("Show a conversation with its messages")
  .option("--source <s>", "Source filter: api_v2 | playground | widget | all", parseSource)
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      conversationId: string,
      opts: { source?: ConversationSource; json?: boolean },
    ) => {
      const { agentId, client } = await projectClient(project);
      const conv = await client.getConversation(agentId, conversationId, {
        source: opts.source,
      });
      if (opts.json) return out(conv);
      console.log(`# ${conv.title} (${conv.id})`);
      for (const m of conv.messages) {
        const text = m.parts.map((p) => p.text).join("");
        console.log(`\n[${m.role} ${m.id}] ${text}`);
      }
    },
  );

program
  .command("emails <project>")
  .description("List email threads, including discarded threads by default")
  .option("--status <status>", "Status filter: to_review | sent | discarded | all", parseEmailStatus, "all")
  .option("--since <iso>", "Threads with activity since this ISO datetime")
  .option("--limit <n>", "Page size (1-100)", (v: string) => parseLimit(v))
  .option("--cursor <c>", "Pagination cursor")
  .option("--json", "Print JSON output")
  .action(async (project: string, opts: EmailListOptions & { json?: boolean }) => {
    const { agentId, client } = await emailReadProjectClient(project);
    const list = await client.listEmails(agentId, {
      status: opts.status, since: opts.since, limit: opts.limit, cursor: opts.cursor,
    });
    if (opts.json) return out(list);
    for (const thread of list.data) {
      const from = thread.customerName ? `${thread.customerName} <${thread.customerEmail}>` : thread.customerEmail;
      const reason = thread.discarded ? emailReviewReason(thread.discardReason, thread.discardSource) : "";
      console.log([from, thread.subject, thread.status, thread.lastActivityAt, thread.id, reason].join("\t"));
    }
    if (list.pagination.hasMore) console.error(`\n(more: next cursor ${list.pagination.nextCursor})`);
  });

program
  .command("email <project> <threadId>")
  .description("Show an email thread with message headers, plain-text bodies and drafts")
  .option("--json", "Print JSON output")
  .action(async (project: string, threadId: string, opts: { json?: boolean }) => {
    const { agentId, client } = await emailReadProjectClient(project);
    const { data: thread } = await client.getEmail(agentId, threadId);
    if (opts.json) return out(thread);
    printEmailThread(thread);
  });

program
  .command("messages <project> <conversationId>")
  .description("List messages in a conversation")
  .option("--limit <n>", "Page size (1-100)", (v: string) => parseLimit(v))
  .option("--cursor <c>", "Pagination cursor")
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      conversationId: string,
      opts: { limit?: number; cursor?: string; json?: boolean },
    ) => {
      const { agentId, client } = await projectClient(project);
      const list = await client.listMessages(agentId, conversationId, {
        limit: opts.limit,
        cursor: opts.cursor,
      });
      out(list);
    },
  );

program
  .command("export <project>")
  .description(
    "Export conversations with full transcripts (maxLimit 20; --source playground|widget|all for other supported chats)",
  )
  .option("--limit <n>", "Page size (1-20)", (v: string) => parseLimit(v, 20))
  .option("--cursor <c>", "Pagination cursor")
  .option("--source <s>", "Source filter: api_v2 | playground | widget | all", parseSource)
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      opts: {
        limit?: number;
        cursor?: string;
        source?: ConversationSource;
        json?: boolean;
      },
    ) => {
      const { agentId, client } = await projectClient(project);
      const list = await client.exportConversations(agentId, {
        limit: opts.limit,
        cursor: opts.cursor,
        source: opts.source,
      });
      out(list);
    },
  );

program
  .command("feedback <project> <conversationId> <messageId> <rating>")
  .description("Set feedback on an assistant message: positive | negative | none")
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      conversationId: string,
      messageId: string,
      rating: string,
    ) => {
      const feedback = parseRating(rating);
      const { agentId, client } = await projectClient(project);
      out(await client.setFeedback(agentId, conversationId, messageId, feedback));
    },
  );

program
  .command("retry <project> <conversationId> <messageId>")
  .description("Regenerate an assistant message")
  .option("--no-stream", "Wait for the full reply and print JSON")
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      conversationId: string,
      messageId: string,
      opts: { stream?: boolean; json?: boolean },
    ) => {
      const { agentId, client } = await projectClient(project);
      if (opts.stream === false || opts.json) {
        out(await client.retry(agentId, conversationId, messageId));
        return;
      }
      await printStream(client.retryStream(agentId, conversationId, messageId));
    },
  );

// ---- management: agent lifecycle (account-scoped) ----

program
  .command("agents")
  .description("List all agents in the account")
  .option("--cursor <c>", "Pagination cursor")
  .option("--limit <n>", "Page size (1-100)", (v: string) => parseLimit(v))
  .option("--json", "Print JSON output")
  .action(async (opts: { limit?: number; cursor?: string; json?: boolean }) => {
    const client = await apiClient();
    const list = await client.listAgents({ limit: opts.limit, cursor: opts.cursor });
    if (opts.json) return out(list);
    for (const a of list.data) {
      console.log(`${a.id}\t${aiValue(a.settings, "model") ?? "-"}\t${a.name}`);
    }
    printCursorFooter(list.pagination);
  });

program
  .command("create-agent")
  .description("Create a new agent in the account")
  .requiredOption("--name <name>", "Agent name")
  .option("--website <url>", "Website URL to associate with the agent")
  .option("--json", "Print JSON output")
  .action(async (opts: { name: string; website?: string; json?: boolean }) => {
    const client = await apiClient();
    const agent = await client.createAgent({
      name: opts.name,
      ...(opts.website ? { url: opts.website } : {}),
    });
    if (opts.json) return out(agent);
    console.log(`Created agent ${agent.id} (${agent.name})`);
    console.error(`Register an alias: agentkit projects --add <alias> ${agent.id}`);
  });

program
  .command("delete-agent <agentId>")
  .description("Delete an agent (cascades — destructive)")
  .option("--yes", "Skip the confirmation guard")
  .action(async (agentId: string, opts: { yes?: boolean }) => {
    if (!opts.yes) {
      throw new Error(
        `Refusing to delete ${agentId} without --yes. This cascades and is irreversible.`,
      );
    }
    const client = await apiClient();
    await client.deleteAgent(agentId);
    if (globalOpts().json) out({ deleted: true, agentId });
    else console.log(`Deleted agent ${agentId}`);
  });

// ---- management: per-project config ----

program.command("update-agent <project>").description("Update an agent's name or website URL")
  .option("--name <name>", "Agent name").option("--website <url>", "Website URL; use 'none' to clear it").option("--json", "Print JSON output")
  .action(async (project: string, opts: { name?: string; website?: string }) => {
    const patch: UpdateAgentRequest = {};
    if (opts.name != null) patch.name = opts.name;
    if (opts.website != null) patch.url = opts.website === "none" ? null : opts.website;
    if (!Object.keys(patch).length) throw new Error("Pass --name and/or --website.");
    const { agentId, client } = await projectClient(project);
    out(await client.updateAgent(agentId, patch));
  });

program
  .command("info <project>")
  .description("Show the agent's config (name, url, settings)")
  .option("--json", "Print JSON output")
  .action(async (project: string, opts: { json?: boolean }) => {
    const { agentId, client } = await projectClient(project);
    const agent = await client.getAgent(agentId);
    if (opts.json) return out(agent);
    console.log(`# ${agent.name} (${agent.id})`);
    console.log(`url:   ${agent.url ?? "-"}`);
    console.log(`model: ${aiValue(agent.settings, "model") ?? "-"}`);
    console.log(`preset: ${aiValue(agent.settings, "instructionsPreset") ?? "-"}`);
  });

program.command("ai-settings <project>").description("Show the agent's AI settings")
  .option("--json", "Print JSON output")
  .action(async (project: string) => {
    const { agentId, client } = await projectClient(project);
    out(await client.getAiSettings(agentId));
  });

program
  .command("set-model <project> <model>")
  .description("Set the agent's AI model (e.g. openai/gpt-5.6-luna)")
  .option("--json", "Print JSON output")
  .action(async (project: string, model: string, opts: { json?: boolean }) => {
    const { agentId, client } = await projectClient(project);
    const ai = await client.updateAiSettings(agentId, { model: model as AiUpdate["model"] });
    if (opts.json) return out(ai);
    console.log(`model set to ${ai.model}`);
  });

program
  .command("set-instructions <project> [prompt]")
  .description("Set the system instructions prompt (arg, --file, or stdin)")
  .option("--file <path>", "Read the prompt from a file")
  .option(
    "--preset <preset>",
    "Instructions preset (default 'custom' when a prompt is given)",
  )
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      prompt: string | undefined,
      opts: { file?: string; preset?: string; json?: boolean },
    ) => {
      const text = await readTextInput(
        prompt,
        opts.file,
        "No prompt provided (arg, --file, or stdin).",
      );
      const { agentId, client } = await projectClient(project);
      const ai = await client.updateAiSettings(agentId, {
        instructionsPrompt: text,
        instructionsPreset: (opts.preset ?? "custom") as AiUpdate["instructionsPreset"],
      });
      if (opts.json) return out(ai);
      console.log(
        `instructions updated (${text.length} chars, preset ${ai.instructionsPreset})`,
      );
    },
  );

program
  .command("design <project>")
  .description("Show widget design, or update it (pass any flag to change it)")
  .option("--title <title>", "Widget title")
  .option("--primary-color <hex>", "Primary color, e.g. #C41832")
  .option("--bubble-color <hex>", "Chat-bubble color")
  .option("--appearance <mode>", "Light | Dark", oneOf("Light", "Dark"))
  .option(
    "--position <pos>",
    "bottom-right | bottom-left",
    oneOf("bottom-right", "bottom-left"),
  )
  .option("--placeholder <text>", "Message input placeholder (≤100 chars)")
  .option(
    "--initial-message <text...>",
    "Greeting bubble(s); repeatable (≤5, ≤140 chars each). Replaces the list.",
  )
  .option(
    "--prompt <text...>",
    "Suggested starter prompt(s); repeatable (≤4, ≤80 chars each). Replaces the list.",
  )
  .option("--no-prompts", "Clear all suggested starter prompts")
  .option("--keep-showing", "Keep starter prompts visible after first message")
  .option(
    "--bubble-icon-url <url>",
    "Launcher chat-bubble icon image URL (use 'none' to clear)",
  )
  .option(
    "--profile-picture-url <url>",
    "In-chat avatar image URL (use 'none' to clear)",
  )
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      opts: {
        title?: string;
        primaryColor?: string;
        bubbleColor?: string;
        appearance?: DesignUpdate["appearance"];
        position?: DesignUpdate["position"];
        placeholder?: string;
        initialMessage?: string[];
        prompt?: string[];
        prompts?: boolean; // commander sets this false for --no-prompts
        keepShowing?: boolean;
        bubbleIconUrl?: string;
        profilePictureUrl?: string;
        json?: boolean;
      },
    ) => {
      // Flat patch matching the v2 updateDesignSettingsSchema (NOT nested).
      const patch: DesignUpdate = {};
      if (opts.title != null) patch.title = opts.title;
      if (opts.position != null) patch.position = opts.position;
      if (opts.primaryColor != null) patch.primaryColor = opts.primaryColor;
      if (opts.bubbleColor != null) patch.bubbleColor = opts.bubbleColor;
      if (opts.appearance != null) patch.appearance = opts.appearance;
      if (opts.placeholder != null) {
        if (opts.placeholder.length > DESIGN_LIMITS.messagePlaceholderMaxLength)
          throw new Error(
            `--placeholder must be ≤${DESIGN_LIMITS.messagePlaceholderMaxLength} characters.`,
          );
        patch.messagePlaceholder = opts.placeholder;
      }
      if (opts.initialMessage) {
        patch.initialMessages = limitList(
          opts.initialMessage,
          DESIGN_LIMITS.initialMessages,
          "--initial-message",
        );
      }
      if (opts.prompt) {
        patch.prompts = limitList(opts.prompt, DESIGN_LIMITS.prompts, "--prompt");
      } else if (opts.prompts === false) {
        patch.prompts = []; // --no-prompts → disable suggested prompts
      }
      if (opts.keepShowing) patch.keepShowing = true;
      if (opts.bubbleIconUrl != null)
        patch.bubbleIconUrl = asImageUrl(opts.bubbleIconUrl, "--bubble-icon-url");
      if (opts.profilePictureUrl != null)
        patch.profilePictureUrl = asImageUrl(
          opts.profilePictureUrl,
          "--profile-picture-url",
        );

      const { agentId, client } = await projectClient(project);
      if (!Object.keys(patch).length) {
        // Nothing to change → show current design.
        return out(await client.getDesign(agentId));
      }
      out(await client.updateDesign(agentId, patch));
    },
  );

program
  .command("security <project>")
  .description("Read security settings, or update specified fields")
  .option("--private", "Make the agent private")
  .option("--public", "Make the agent public")
  .option("--rate-limit <n>", "Messages per window, 1-100", (v: string) => parseLimit(v))
  .option("--rate-window <seconds>", "Rate window, 10-3600 seconds", positiveInteger)
  .option("--rate-message <text>", "Message shown at the limit, 1-500 chars")
  .option(
    "--allow-domain <domain...>",
    "Allowed embedding domains (replaces the list)",
  )
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      opts: {
        private?: boolean;
        public?: boolean;
        rateLimit?: number;
        rateWindow?: number;
        rateMessage?: string;
        allowDomain?: string[];
        json?: boolean;
      },
    ) => {
      const patch: SecurityUpdate = {};
      if (opts.private && opts.public) throw new Error("Choose --private or --public.");
      if (opts.private) patch.isPrivate = true;
      if (opts.public) patch.isPrivate = false;
      if (opts.rateLimit != null || opts.rateWindow != null || opts.rateMessage != null) {
        if (opts.rateLimit == null || opts.rateWindow == null || opts.rateMessage == null || opts.rateWindow < 10 || opts.rateWindow > 3600 || !opts.rateMessage.length || opts.rateMessage.length > 500) throw new Error("Rate limits require --rate-limit, --rate-window (10-3600), and --rate-message (1-500 characters).");
        patch.rateLimit = { maxMessages: opts.rateLimit, windowSeconds: opts.rateWindow, limitMessage: opts.rateMessage };
      }
      if (opts.allowDomain) {
        // The server's domain matcher parses each entry with `new URL()`, so a
        // bare host (e.g. `example.com`) never matches — it needs a scheme.
        // Normalize bare hosts/wildcards to `https://…` so the allowlist works.
        const domains = opts.allowDomain.map((d) =>
          HTTP_URL_RE.test(d) ? d : `https://${d}`,
        );
        patch.allowedDomains = { enabled: true, domains };
      }
      if (!Object.keys(patch).length) {
        const { agentId, client } = await projectClient(project);
        return out(await client.getSecurity(agentId));
      }
      const { agentId, client } = await projectClient(project);
      out(await client.updateSecurity(agentId, patch));
    },
  );

// ---- management: knowledge sources ----

program
  .command("sources <project>")
  .description("List the agent's knowledge sources")
  .option("--limit <n>", "Page size (1-100)", (v: string) => parseLimit(v))
  .option("--cursor <c>", "Pagination cursor")
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      opts: { limit?: number; cursor?: string; json?: boolean },
    ) => {
      const { agentId, client } = await projectClient(project);
      const list = await client.listSources(agentId, {
        limit: opts.limit,
        cursor: opts.cursor,
      });
      if (opts.json) return out(list);
      for (const s of list.data) {
        console.log(`${s.id}\t${s.sourceType}\t${s.title}`);
      }
      printCursorFooter(list.pagination);
    },
  );

program
  .command("add-text <project>")
  .description("Add a text knowledge source")
  .requiredOption("--title <title>", "Source title")
  .option("--content <content>", "Text content (or --file, or stdin)")
  .option("--file <path>", "Read content from a file")
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      opts: { title: string; content?: string; file?: string; json?: boolean },
    ) => {
      const content = await readTextInput(
        opts.content,
        opts.file,
        "No content (--content, --file, or stdin).",
      );
      const { agentId, client } = await projectClient(project);
      const doc = await client.addTextSource(agentId, {
        title: opts.title,
        content,
      });
      if (opts.json) return out(doc);
      console.log(`added text source ${doc.documentId}`);
    },
  );

program
  .command("add-qna <project>")
  .description("Add a Q&A knowledge source")
  .requiredOption("--title <title>", "Source title")
  .requiredOption("--question <q...>", "One or more questions (repeatable)")
  .requiredOption("--answer <answer>", "The answer")
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      opts: { title: string; question: string[]; answer: string; json?: boolean },
    ) => {
      const { agentId, client } = await projectClient(project);
      const doc = await client.addQnaSource(agentId, {
        title: opts.title,
        questions: opts.question,
        answer: opts.answer,
      });
      if (opts.json) return out(doc);
      console.log(`added Q&A source ${doc.documentId}`);
    },
  );

program
  .command("add-url <project> <url>")
  .description("Add a single URL knowledge source")
  .option("--json", "Print JSON output")
  .action(async (project: string, url: string, opts: { json?: boolean }) => {
    const { agentId, client } = await projectClient(project);
    const doc = await client.addUrlSource(agentId, { url });
    if (opts.json) return out(doc);
    console.log(`URL source job ${doc.jobId} (retrain: ${doc.isRetrain})`);
  });

program.command("file-upload-urls <project>").description("Create signed upload URLs for knowledge files")
  .requiredOption("--file-name <names...>", "File name(s), 1-20").option("--json", "Print JSON output")
  .action(async (project: string, opts: { fileName: string[] }) => {
    if (opts.fileName.length > 20) throw new Error("--file-name accepts at most 20 files.");
    const { agentId, client } = await projectClient(project);
    out(await client.createFileUploadUrls(agentId, { files: opts.fileName.map(fileName => ({ fileName })) }));
  });

program.command("register-files <project>").description("Register previously uploaded knowledge files")
  .requiredOption("--file <path>", "JSON request with a files array; use - for stdin").option("--json", "Print JSON output")
  .action(async (project: string, opts: { file: string }) => {
    const request = await jsonInput<RegisterFilesRequest>(opts.file);
    const { agentId, client } = await projectClient(project);
    out(await client.registerFileSources(agentId, request));
  });

program
  .command("delete-source <project> <documentId>")
  .description("Delete a knowledge source")
  .option("--yes", "Skip the confirmation guard")
  .action(
    async (project: string, documentId: string, opts: { yes?: boolean }) => {
      if (!opts.yes) {
        throw new Error(`Refusing to delete ${documentId} without --yes.`);
      }
      const { agentId, client } = await projectClient(project);
      await client.deleteSource(agentId, documentId);
      if (globalOpts().json) out({ deleted: true, documentId });
      else console.log(`deleted source ${documentId}`);
    },
  );

program
  .command("train <project>")
  .description("Kick a (re)train, or show status with --status")
  .option("--status", "Show training status instead of starting a run")
  .option("--json", "Print JSON output")
  .action(
    async (project: string, opts: { status?: boolean; json?: boolean }) => {
      const { agentId, client } = await projectClient(project);
      if (opts.status) {
        const s = await client.trainStatus(agentId);
        if (opts.json) return out(s);
        const last = s.lastTrainedAt
          ? new Date(s.lastTrainedAt * 1000).toISOString()
          : "never";
        console.log(
          `${s.status} · ${s.documentCount} sources · last trained ${last}${
            s.activeJob ? ` · active job ${s.activeJob.id}` : ""
          }`,
        );
        return;
      }
      const job = await client.train(agentId);
      if (opts.json) return out(job);
      console.log(`training started${job.jobId ? ` (job ${job.jobId})` : ""}`);
    },
  );

// ---- management: contacts ----

program
  .command("contacts <project>")
  .description("List the agent's contacts")
  .option("--limit <n>", "Page size (1-100)", (v: string) => parseLimit(v))
  .option("--cursor <c>", "Pagination cursor")
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      opts: { limit?: number; cursor?: string; json?: boolean },
    ) => {
      const { agentId, client } = await projectClient(project);
      const list = await client.listContacts(agentId, {
        limit: opts.limit,
        cursor: opts.cursor,
      });
      if (opts.json) return out(list);
      for (const c of list.data) {
        console.log(
          `${c.externalId}\t${c.name ?? "-"}\t${c.email ?? "-"}\t${c.phone ?? "-"}`,
        );
      }
      printCursorFooter(list.pagination);
    },
  );

program
  .command("add-contact <project>")
  .description("Create/upsert a contact")
  .requiredOption("--external-id <id>", "Your stable id for the contact")
  .option("--name <name>", "Display name")
  .option("--email <email>", "Email")
  .option("--phone <phone>", "Phone")
  .option("--attributes-file <path>", "Custom attributes JSON object, or - for stdin")
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      opts: {
        externalId: string;
        name?: string;
        email?: string;
        phone?: string;
        attributesFile?: string;
        json?: boolean;
      },
    ) => {
      const { agentId, client } = await projectClient(project);
      const contact = await client.createContact(agentId, {
        externalId: opts.externalId,
        ...(opts.name ? { name: opts.name } : {}),
        ...(opts.email ? { email: opts.email } : {}),
        ...(opts.phone ? { phone: opts.phone } : {}),
        ...(opts.attributesFile ? { customAttributes: await jsonInput<Record<string, unknown>>(opts.attributesFile) } : {}),
      });
      if (opts.json) return out(contact);
      console.log(`upserted contact ${contact.externalId}`);
    },
  );

program.command("import-contacts <project>").description("Import 1-1,000 contacts from a JSON request")
  .requiredOption("--file <path>", "JSON request with a rows array; use - for stdin").option("--json", "Print JSON output")
  .action(async (project: string, opts: { file: string }) => {
    const request = await jsonInput<ImportContactsRequest>(opts.file);
    const { agentId, client } = await projectClient(project);
    out(await client.importContacts(agentId, request));
  });

program.command("leads <project>").description("List captured leads")
  .option("--limit <n>", "Page size (1-100)", (v: string) => parseLimit(v)).option("--cursor <c>", "Pagination cursor")
  .option("--created-after <datetime>", "Inclusive ISO 8601 lower bound").option("--created-before <datetime>", "Inclusive ISO 8601 upper bound")
  .option("--json", "Print JSON output")
  .action(async (project: string, opts: { limit?: number; cursor?: string; createdAfter?: string; createdBefore?: string; json?: boolean }) => {
    const { agentId, client } = await projectClient(project);
    const list = await client.listLeads(agentId, opts);
    if (opts.json) return out(list);
    for (const lead of list.data) console.log(`${lead.id}\t${lead.name ?? "-"}\t${lead.email ?? "-"}\t${lead.phone ?? "-"}`);
    printCursorFooter(list.pagination);
  });

// ---- channels: Instagram automations (connect/OAuth stays dashboard-only) ----

program
  .command("instagram <project>")
  .description(
    "Show the Instagram connection, automation statuses and conversation starters",
  )
  .option("--json", "Print the full JSON payload")
  .action(async (project: string, opts: { json?: boolean }) => {
    const { agentId, client } = await projectClient(project);
    const ig = await client.getInstagram(agentId);
    if (opts.json) return out(ig);
    if (ig.connected === false) {
      console.log("not connected (connect Instagram in the dashboard)");
      return;
    }
    const handle = ig.instagram_username ? `@${ig.instagram_username}` : "-";
    console.log(
      `${handle} (${ig.instagram_user_id ?? "-"}) · ${ig.status} · ${ig.login_kind}`,
    );
    if (ig.scopes?.length) console.log(`scopes: ${ig.scopes.join(", ")}`);
    if (ig.last_error_message) console.log(`last error: ${ig.last_error_message}`);
    if (ig.last_verified_at !== undefined) {
      console.log(`last verified: ${ig.last_verified_at ?? "never"}`);
    }
    console.log("");
    for (const a of ig.automations) {
      console.log(`${a.key.padEnd(16)}${a.status}`);
    }
    const cs = ig.conversation_starters;
    const live = cs.live_prompts?.length ?? 0;
    const draft = cs.draft_prompts?.length ?? 0;
    console.log(
      `${"starters".padEnd(16)}${cs.status} · ${live} live / ${draft} draft` +
        (cs.synced_at ? ` · synced ${cs.synced_at}` : "") +
        (cs.last_sync_error ? ` · sync error: ${cs.last_sync_error}` : ""),
    );
  });

program
  .command("ig-automation <project> <key> [config]")
  .description(
    "Show an Instagram automation (respond_to_dms | comment_to_dm | story_leads | story_mentions), " +
      "or update it: --status and/or a JSON config (arg, --file <path>, or --file - for stdin)",
  )
  .option("--status <s>", "draft | live | off", parseIgStatus)
  .option("--file <path>", "Read the JSON config from a file ('-' = stdin)")
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      keyArg: string,
      configArg: string | undefined,
      opts: { status?: InstagramAutomationStatus; file?: string; json?: boolean },
    ) => {
      const key = parseAutomationKey(keyArg);
      const patch: InstagramAutomationUpdate = {};
      if (configArg != null || opts.file) {
        const text = await readTextInput(
          configArg,
          opts.file,
          "Empty config (arg, --file <path>, or --file - for stdin).",
        );
        patch.config = parseAutomationConfigJson(text) as never;
      }
      if (opts.status) patch.status = opts.status;

      const { agentId, client } = await projectClient(project);
      if (!Object.keys(patch).length) {
        return out(await client.getInstagramAutomation(agentId, key));
      }
      out(await client.updateInstagramAutomation(agentId, key, patch));
    },
  );

program.command("ig-instances <project> <key>").description("List comment_to_dm or story_leads automation instances")
  .option("--json", "Print JSON output")
  .action(async (project: string, keyArg: string) => {
    const { agentId, client } = await projectClient(project);
    out(await client.listInstagramAutomationInstances(agentId, parseIgInstanceKey(keyArg)));
  });

program.command("ig-instance-create <project> <key> [config]").description("Create a comment_to_dm or story_leads automation instance")
  .option("--status <s>", "draft | live | off", parseIgStatus).option("--file <path>", "Read the JSON config from a file; use - for stdin").option("--json", "Print JSON output")
  .action(async (project: string, keyArg: string, configArg: string | undefined, opts: { status?: InstagramAutomationStatus; file?: string }) => {
    const text = await readTextInput(configArg, opts.file, "Provide a JSON config (arg, --file, or stdin).");
    const request: CreateInstagramAutomationInstanceRequest = { config: parseAutomationConfigJson(text) as never };
    if (opts.status) request.status = opts.status;
    const { agentId, client } = await projectClient(project);
    out(await client.createInstagramAutomationInstance(agentId, parseIgInstanceKey(keyArg), request));
  });

program.command("ig-instance <project> <key> <id>").description("Show one Instagram automation instance")
  .option("--json", "Print JSON output")
  .action(async (project: string, keyArg: string, id: string) => {
    const { agentId, client } = await projectClient(project);
    out(await client.getInstagramAutomationInstance(agentId, parseIgInstanceKey(keyArg), id));
  });

program.command("ig-instance-update <project> <key> <id> [config]").description("Update one Instagram automation instance")
  .option("--status <s>", "draft | live | off", parseIgStatus).option("--file <path>", "Read the JSON config from a file; use - for stdin").option("--json", "Print JSON output")
  .action(async (project: string, keyArg: string, id: string, configArg: string | undefined, opts: { status?: InstagramAutomationStatus; file?: string }) => {
    const patch: UpdateInstagramAutomationInstanceRequest = {};
    if (configArg != null || opts.file) {
      const text = await readTextInput(configArg, opts.file, "Empty config.");
      patch.config = parseAutomationConfigJson(text) as never;
    }
    if (opts.status) patch.status = opts.status;
    if (!Object.keys(patch).length) throw new Error("Pass a config and/or --status.");
    const { agentId, client } = await projectClient(project);
    out(await client.updateInstagramAutomationInstance(agentId, parseIgInstanceKey(keyArg), id, patch));
  });

program
  .command("ig-starters <project>")
  .description(
    "Show Instagram conversation starters, or update them: --prompt \"Q => reply\" (≤4, repeatable), " +
      "--file <prompts.json> ('-' = stdin), and/or --status draft|live|off (live syncs to Meta)",
  )
  .option(
    "--prompt <text...>",
    "Starter as \"<question> => <reply>\"; repeatable (≤4). Replaces the draft list.",
  )
  .option(
    "--file <path>",
    "JSON array of { question, message, links } ('-' = stdin). Replaces the draft list.",
  )
  .option("--status <s>", "draft | live | off", parseIgStatus)
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      opts: {
        prompt?: string[];
        file?: string;
        status?: InstagramAutomationStatus;
        json?: boolean;
      },
    ) => {
      const patch: InstagramConversationStartersUpdate = {};
      let prompts: InstagramStarterPrompt[] | undefined;
      if (opts.prompt && opts.file) {
        throw new Error("Pass either --prompt or --file, not both.");
      }
      if (opts.prompt) prompts = opts.prompt.map(parseStarterPromptArg);
      if (opts.file) {
        const text = await readTextInput(undefined, opts.file, "Empty prompts file.");
        prompts = parseStarterPromptsJson(text);
      }
      if (prompts) patch.prompts = limitStarterPrompts(prompts);
      if (opts.status) patch.status = opts.status;

      const { agentId, client } = await projectClient(project);
      if (!Object.keys(patch).length) {
        return out(await client.getConversationStarters(agentId));
      }
      out(await client.updateConversationStarters(agentId, patch));
    },
  );

program
  .command("ig-menu <project>")
  .description(
    "Show the Instagram Main Menu (Meta persistent menu), or update it: --file <items.json> " +
      "('-' = stdin; array of { id?, title, action:{kind:'postback',reply}|{kind:'web_url',url} }, ≤5) " +
      "and/or --status draft|live|off (live syncs to Meta + read-back, off clears)",
  )
  .option("--file <path>", "JSON items ('-' = stdin). Replaces the draft list.")
  .option("--status <s>", "draft | live | off", parseIgStatus)
  .option("--json", "Print JSON output")
  .action(
    async (
      project: string,
      opts: { file?: string; status?: InstagramAutomationStatus; json?: boolean },
    ) => {
      const patch: InstagramMenuUpdate = {};
      if (opts.file) {
        const text = await readTextInput(undefined, opts.file, "Empty items file.");
        patch.items = parseMenuItemsJson(text);
      }
      if (opts.status) patch.status = opts.status;
      const { agentId, client } = await projectClient(project);
      const menu = Object.keys(patch).length
        ? await client.updateInstagramMenu(agentId, patch)
        : await client.getInstagramMenu(agentId);
      if (opts.json) return out(menu);
      const live = menu.live_items?.length ?? 0;
      const draft = menu.draft_items?.length ?? 0;
      console.log(
        `${menu.status} · ${live} live / ${draft} draft` +
          (menu.synced_at ? ` · synced ${menu.synced_at}` : "") +
          (menu.last_sync_error ? ` · sync error: ${menu.last_sync_error}` : ""),
      );
      for (const item of menu.draft_items ?? []) {
        const action =
          item.action.kind === "web_url" ? `→ ${item.action.url}` : `↩ ${item.action.reply}`;
        console.log(`  ${item.title.padEnd(30)} ${action}`);
      }
    },
  );

program
  .command("ig-refresh-permissions <project>")
  .description(
    "Re-verify the Instagram connection: token validity, live granted permissions, webhook " +
      "subscription repair + read-back. Prints the outcome (verified | reconnect_required | " +
      "repair_submitted_unverified | retryable_error)",
  )
  .option("--json", "Print JSON output")
  .action(async (project: string, opts: { json?: boolean }) => {
    const { agentId, client } = await projectClient(project);
    const result = await client.refreshInstagramPermissions(agentId);
    if (opts.json) return out(result);
    const detail = [
      result.code,
      result.missingScopes?.length ? `missing: ${result.missingScopes.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    console.log(`${result.outcome}${detail ? ` (${detail})` : ""} · ${result.loginKind}`);
    console.log(`last verified: ${result.lastVerifiedAt ?? "never"}`);
  });

program.command("channels <project> [channel]").description("List management channels or show one channel")
  .option("--json", "Print JSON output")
  .action(async (project: string, channel?: string) => {
    const { agentId, client } = await managementProjectClient(project);
    if (channel) return out(await client.getManagementChannel(agentId, parseManagementChannel(channel)));
    out(await client.listManagementChannels(agentId));
  });

program.command("channel-configure <project> <channel>").description("Replace a channel instruction override and action allowlist")
  .requiredOption("--file <path>", "JSON request; use - for stdin").option("--json", "Print JSON output")
  .action(async (project: string, channel: string, opts: { file: string }) => {
    const request = await jsonInput<import("../sdk/types.js").ChannelOverrideRequest>(opts.file);
    const { agentId, client } = await managementProjectClient(project);
    out(await client.updateManagementChannelOverride(agentId, parseManagementChannel(channel), request));
  });

program.command("web-presentation <project>").description("Update web widget or iframe presentation with a settings revision")
  .requiredOption("--file <path>", "JSON request; use - for stdin").option("--json", "Print JSON output")
  .action(async (project: string, opts: { file: string }) => {
    const { agentId, client } = await managementProjectClient(project);
    out(await client.updateWebPresentation(agentId, await jsonInput(opts.file)));
  });

program.command("channel <project> <channel>").description("Read one channel's effective configuration").option("--json", "Print JSON output")
  .action(async (project: string, channel: string) => { const { agentId, client } = await managementProjectClient(project); out(await client.getManagementChannel(agentId, parseManagementChannel(channel))); });

program.command("center-stage <project>").description("Show or replace Center Stage settings")
  .option("--file <path>", "JSON update request; use - for stdin").option("--json", "Print JSON output")
  .action(async (project: string, opts: { file?: string }) => {
    const { agentId, client } = await managementProjectClient(project);
    out(opts.file ? await client.updateCenterStage(agentId, await jsonInput(opts.file)) : await client.getCenterStage(agentId));
  });

program.command("action-list <project>").description("List custom API actions").option("--json", "Print JSON output")
  .action(async (project: string) => { const { agentId, client } = await managementProjectClient(project); out(await client.listCustomApiActions(agentId)); });
program.command("action-get <project> <actionId>").description("Show one custom API action").option("--json", "Print JSON output")
  .action(async (project: string, actionId: string) => { const { agentId, client } = await managementProjectClient(project); out(await client.getCustomApiAction(agentId, actionId)); });
program.command("action-create <project>").description("Create a disabled custom API action; test it before enabling")
  .option("--file <path>", "JSON request; use - or omit for stdin").option("--json", "Print JSON output")
  .action(async (project: string, opts: { file?: string }) => { const request = await jsonInput<import("../sdk/types.js").CreateCustomApiActionRequest>(opts.file); const { agentId, client } = await managementProjectClient(project); out(await client.createCustomApiAction(agentId, request)); });
program.command("action-update <project> <actionId>").description("Update a custom API action with optimistic concurrency")
  .option("--file <path>", "JSON patch; use - or omit for stdin").requiredOption("--expected-updated-at <datetime>", "Loaded action updatedAt value").option("--json", "Print JSON output")
  .action(async (project: string, actionId: string, opts: { file?: string; expectedUpdatedAt: string }) => { const patch = await jsonInput<Omit<import("../sdk/types.js").UpdateCustomApiActionRequest, "expectedUpdatedAt">>(opts.file); const { agentId, client } = await managementProjectClient(project); out(await client.updateCustomApiAction(agentId, actionId, { ...patch, expectedUpdatedAt: opts.expectedUpdatedAt })); });
program.command("action-enable <project> <actionId>").description("Enable a tested custom API action")
  .requiredOption("--expected-updated-at <datetime>", "Loaded action updatedAt value").option("--json", "Print JSON output")
  .action(async (project: string, actionId: string, opts: { expectedUpdatedAt: string }) => { const { agentId, client } = await managementProjectClient(project); out(await client.setCustomApiActionStatus(agentId, actionId, { enabled: true, expectedUpdatedAt: opts.expectedUpdatedAt })); });
program.command("action-disable <project> <actionId>").description("Disable a custom API action")
  .requiredOption("--expected-updated-at <datetime>", "Loaded action updatedAt value").option("--json", "Print JSON output")
  .action(async (project: string, actionId: string, opts: { expectedUpdatedAt: string }) => { const { agentId, client } = await managementProjectClient(project); out(await client.setCustomApiActionStatus(agentId, actionId, { enabled: false, expectedUpdatedAt: opts.expectedUpdatedAt })); });
program.command("action-delete <project> <actionId>").description("Delete a custom API action")
  .requiredOption("--expected-updated-at <datetime>", "Loaded action updatedAt value").option("--yes", "Confirm deletion").option("--json", "Print JSON output")
  .action(async (project: string, actionId: string, opts: { expectedUpdatedAt: string; yes?: boolean }) => { if (!opts.yes) throw new Error("Refusing to delete the action without --yes."); const { agentId, client } = await managementProjectClient(project); out(await client.deleteCustomApiAction(agentId, actionId, { expectedUpdatedAt: opts.expectedUpdatedAt })); });

program.command("secret-list <project>").description("List action secret metadata").option("--json", "Print JSON output")
  .action(async (project: string) => { const { agentId, client } = await managementProjectClient(project); out(await client.listAgentSecrets(agentId)); });
program.command("secret-set <project> <name>").description("Set an encrypted action secret from stdin or an environment variable")
  .option("--env <name>", "Read the secret from this environment variable").option("--description <text>", "Non-secret description").option("--json", "Print JSON output")
  .action(async (project: string, name: string, opts: { env?: string; description?: string }) => { const value = opts.env ? process.env[opts.env] ?? "" : (await readStdin()).trim(); if (!value) throw new Error(opts.env ? `Environment variable ${opts.env} is empty or missing.` : "Provide the secret on stdin or with --env."); rememberKey(value); const { agentId, client } = await managementProjectClient(project); out(await client.setAgentSecret(agentId, name, { value, ...(opts.description ? { description: opts.description } : {}) })); });
program.command("secret-delete <project> <name>").description("Delete an action secret")
  .option("--yes", "Confirm deletion").option("--json", "Print JSON output")
  .action(async (project: string, name: string, opts: { yes?: boolean }) => { if (!opts.yes) throw new Error("Refusing to delete the secret without --yes."); const { agentId, client } = await managementProjectClient(project); out(await client.deleteAgentSecret(agentId, name)); });

program.command("widgets <project>").description("List widgets").option("--json", "Print JSON output")
  .action(async (project: string) => { const { agentId, client } = await managementProjectClient(project); out(await client.listWidgets(agentId)); });
program.command("widget <project> <widgetId>").description("Show one widget").option("--json", "Print JSON output")
  .action(async (project: string, widgetId: string) => { const { agentId, client } = await managementProjectClient(project); out(await client.getWidget(agentId, widgetId)); });
program.command("widget-create <project>").description("Create a widget draft").requiredOption("--file <path>", "JSON request; use - for stdin").option("--json", "Print JSON output")
  .action(async (project: string, opts: { file: string }) => { const { agentId, client } = await managementProjectClient(project); out(await client.createWidget(agentId, await jsonInput(opts.file))); });
program.command("widget-save <project> <widgetId>").description("Save a widget draft with optimistic concurrency").requiredOption("--file <path>", "JSON request; use - for stdin").option("--json", "Print JSON output")
  .action(async (project: string, widgetId: string, opts: { file: string }) => { const { agentId, client } = await managementProjectClient(project); out(await client.saveWidgetDraft(agentId, widgetId, await jsonInput(opts.file))); });
program.command("widget-status <project> <widgetId> <status>").description("Set widget status to draft or archived").option("--json", "Print JSON output")
  .action(async (project: string, widgetId: string, status: string) => { if (status !== "draft" && status !== "archived") throw new Error("Status must be draft or archived."); const { agentId, client } = await managementProjectClient(project); out(await client.setWidgetStatus(agentId, widgetId, { status })); });
program.command("widget-publish <project> <widgetId>").description("Publish a widget draft").requiredOption("--expected-updated-at <datetime>", "Loaded widget updatedAt value").option("--yes", "Confirm publication").option("--json", "Print JSON output")
  .action(async (project: string, widgetId: string, opts: { expectedUpdatedAt: string; yes?: boolean }) => { if (!opts.yes) throw new Error("Refusing to publish without --yes."); const { agentId, client } = await managementProjectClient(project); out(await client.publishWidget(agentId, widgetId, { expectedUpdatedAt: opts.expectedUpdatedAt })); });
program.command("widget-delete <project> <widgetId>").description("Delete a widget").option("--yes", "Confirm deletion").option("--json", "Print JSON output")
  .action(async (project: string, widgetId: string, opts: { yes?: boolean }) => { if (!opts.yes) throw new Error("Refusing to delete the widget without --yes."); const { agentId, client } = await managementProjectClient(project); out(await client.deleteWidget(agentId, widgetId)); });
program.command("widget-duplicate <project> <widgetId>").description("Duplicate a widget as a draft").option("--json", "Print JSON output")
  .action(async (project: string, widgetId: string) => { const { agentId, client } = await managementProjectClient(project); out(await client.duplicateWidget(agentId, widgetId)); });
program.command("widget-export <project> <widgetId>").description("Export a portable widget package without action credentials").option("--json", "Print JSON output")
  .action(async (project: string, widgetId: string) => { const { agentId, client } = await managementProjectClient(project); out(await client.exportWidget(agentId, widgetId)); });
program.command("widget-import <project>").description("Import a portable widget package as a draft").requiredOption("--file <path>", "JSON request; use - for stdin").option("--json", "Print JSON output")
  .action(async (project: string, opts: { file: string }) => { const { agentId, client } = await managementProjectClient(project); out(await client.importWidget(agentId, await jsonInput(opts.file))); });
program.command("widget-versions <project> <widgetId> [versionId]").description("List widget versions or show one immutable version").option("--json", "Print JSON output")
  .action(async (project: string, widgetId: string, versionId?: string) => { const { agentId, client } = await managementProjectClient(project); out(versionId ? await client.getWidgetVersion(agentId, widgetId, versionId) : await client.listWidgetVersions(agentId, widgetId)); });

program.command("backstage-overview <project>").description("Show the bounded Backstage agent inventory").option("--json", "Print JSON output")
  .action(async (project: string) => { const { agentId, client } = await managementProjectClient(project); out(await client.getBackstageOverview(agentId)); });
program.command("backstage-sessions <project>").description("List Backstage sessions").option("--limit <n>", "Page size (1-100)", (v: string) => parseLimit(v)).option("--cursor <c>", "Pagination cursor").option("--json", "Print JSON output")
  .action(async (project: string, opts: { limit?: number; cursor?: string }) => { const { agentId, client } = await managementProjectClient(project); out(await client.listBackstageSessions(agentId, opts)); });
program.command("backstage-session <project> <sessionId>").description("Show a Backstage session and its latest 40 messages").option("--json", "Print JSON output")
  .action(async (project: string, sessionId: string) => { const { agentId, client } = await managementProjectClient(project); out(await client.getBackstageSession(agentId, sessionId)); });
program.command("backstage-delete-session <project> <sessionId>").description("Delete a Backstage session").option("--yes", "Confirm deletion").option("--json", "Print JSON output")
  .action(async (project: string, sessionId: string, opts: { yes?: boolean }) => { if (!opts.yes) throw new Error("Refusing to delete the session without --yes."); const { agentId, client } = await managementProjectClient(project); out(await client.deleteBackstageSession(agentId, sessionId)); });
program.command("backstage-change <project> <changeId>").description("Show one proposed Backstage change").option("--json", "Print JSON output")
  .action(async (project: string, changeId: string) => { const { agentId, client } = await managementProjectClient(project); out(await client.getBackstageChange(agentId, changeId)); });
program.command("backstage-decide <project> <changeId> <decision>").description("Approve or reject one proposed Backstage change").option("--yes", "Confirm approval").option("--json", "Print JSON output")
  .action(async (project: string, changeId: string, decision: string, opts: { yes?: boolean }) => { if (decision !== "approve" && decision !== "reject") throw new Error("Decision must be approve or reject."); if (decision === "approve" && !opts.yes) throw new Error("Refusing to approve the change without --yes."); const { agentId, client } = await managementProjectClient(project); const result = await client.decideBackstageChange(agentId, changeId, decision); out(result); if (result.status !== (decision === "approve" ? "executed" : "rejected")) throw new AgentkitError({ code: "BACKSTAGE_DECISION_NOT_APPLIED", message: `Change is ${result.status}; the requested decision did not complete. Inspect its state before retrying.`, status: 200, details: result }); });
program.command("backstage-chat <project> <message>").description("Send a Backstage message and print structured stream events")
  .requiredOption("--client-message-id <id>", "Stable id for this client message").option("--session-id <id>", "Continue an existing session").option("--json", "Print JSON events")
  .action(async (project: string, message: string, opts: { clientMessageId: string; sessionId?: string }) => { const { agentId, client } = await managementProjectClient(project); for await (const event of client.chatBackstage(agentId, { message, clientMessageId: opts.clientMessageId, ...(opts.sessionId ? { sessionId: opts.sessionId } : {}) })) console.log(JSON.stringify(event)); });

program.command("tool-result <project> <conversationId> <toolCallId>")
  .description("Submit caller-provided JSON output and stream the continuation")
  .option("--file <path>", "JSON file, or - for stdin")
  .option("--json", "Collect resulting SSE events into a JSON array")
  .action(async (project: string, conversationId: string, toolCallId: string, opts: { file?: string; json?: boolean }) => {
    const text = await readTextInput(undefined, opts.file, "Provide JSON tool output on stdin or --file.");
    let output: unknown;
    try { output = JSON.parse(text); } catch { throw new Error("Tool output must be valid JSON."); }
    const { agentId, client } = await projectClient(project);
    await printStream(client.submitToolResult(agentId, conversationId, { toolCallId, output }), opts.json);
  });
program.command("notifications <project>").description("Read or patch notification settings")
  .option("--file <path>", "JSON patch file, or - for stdin")
  .option("--json", "Print JSON")
  .action(async (project: string, opts: { file?: string }) => {
    const { agentId, client } = await projectClient(project);
    out(opts.file ? await client.updateNotifications(agentId, await jsonInput(opts.file)) : await client.getNotifications(agentId));
  });
program.command("autotrain <project>").description("Read or patch automatic retraining settings")
  .option("--file <path>", "JSON patch file, or - for stdin")
  .option("--json", "Print JSON")
  .action(async (project: string, opts: { file?: string }) => {
    const { agentId, client } = await projectClient(project);
    out(opts.file ? await client.updateTraining(agentId, await jsonInput(opts.file)) : await client.getTraining(agentId));
  });
}

async function jsonInput<T>(file?: string): Promise<T> {
  const text = await readTextInput(undefined, file, "Provide a JSON object.");
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as T;
  } catch { throw new Error("Expected a JSON object."); }
}
async function printStream(stream: AsyncIterable<StreamEvent>, json = false): Promise<void> {
  const events: StreamEvent[] = [];
  for await (const event of stream) {
    if (json) { events.push(event); continue; }
    if (event.type === "text-delta" && typeof event.delta === "string") process.stdout.write(event.delta);
    else if (event.type === "tool-call") console.error(JSON.stringify({ pendingToolCall: event }));
    else if (event.type === "message-metadata") console.error(JSON.stringify(event));
  }
  if (json) out(events);
  else process.stdout.write("\n");
}

// ---- helpers ----

const HTTP_URL_RE = /^https?:\/\//;

/** An image-URL flag value: an http(s) URL, or the literal "none" to clear. */
function asImageUrl(v: string, flag: string): string | null {
  if (v.toLowerCase() === "none") return null;
  if (!HTTP_URL_RE.test(v)) {
    throw new Error(`${flag} must be an http(s) URL or "none".`);
  }
  return v;
}

/** Validate a repeatable flag's values against count/length limits. */
function limitList(
  items: string[],
  { max, maxLength }: { max: number; maxLength: number },
  flag: string,
): string[] {
  if (items.length > max) {
    throw new Error(`At most ${max} ${flag} values allowed.`);
  }
  const tooLong = items.find((item) => item.length > maxLength);
  if (tooLong) {
    throw new Error(
      `Each ${flag} must be ≤${maxLength} characters (got ${tooLong.length}).`,
    );
  }
  return items;
}

/** Resolve text content with precedence: arg/flag > --file > piped stdin. */
async function readTextInput(
  text: string | undefined,
  file: string | undefined,
  errorMessage: string,
): Promise<string> {
  if (file === "-") text = await readStdin();
  else if (file) text = await readFile(file, "utf8");
  if (text == null) text = await readStdin();
  text = text.trim();
  if (!text) throw new Error(errorMessage);
  return text;
}

/** Read all of stdin (for piped prompts/content). Empty string if it's a TTY. */
async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function parseRating(rating: string): Feedback {
  const r = rating.toLowerCase();
  if (r === "positive" || r === "good") return "positive";
  if (r === "negative" || r === "bad") return "negative";
  if (r === "none" || r === "null" || r === "clear") return null;
  throw new Error(`invalid rating '${rating}'. Use: positive | negative | none`);
}

registerCommands(program);
const copies = new Command().configureHelp({ showGlobalOptions: true }).exitOverride().configureOutput({ outputError: () => {} });
registerCommands(copies);
const groups: Record<string, Record<string, string>> = {
  agents: { list: "agents", create: "create-agent", update: "update-agent", delete: "delete-agent", info: "info" },
  sources: { list: "sources", "add-text": "add-text", "add-qna": "add-qna", "add-url": "add-url", "file-upload-urls": "file-upload-urls", "register-files": "register-files", delete: "delete-source" },
  conversations: { list: "conversations", get: "conversation", messages: "messages", export: "export", feedback: "feedback", retry: "retry", "tool-result": "tool-result" },
  contacts: { list: "contacts", upsert: "add-contact", import: "import-contacts" },
  settings: { ai: "ai-settings", model: "set-model", instructions: "set-instructions", design: "design", security: "security", notifications: "notifications", training: "autotrain" },
  instagram: { status: "instagram", automation: "ig-automation", instances: "ig-instances", "instance-create": "ig-instance-create", instance: "ig-instance", "instance-update": "ig-instance-update", starters: "ig-starters", menu: "ig-menu", "refresh-permissions": "ig-refresh-permissions" },
  channels: { list: "channels", get: "channel", configure: "channel-configure", "web-presentation": "web-presentation", "center-stage": "center-stage" },
  actions: { list: "action-list", get: "action-get", create: "action-create", update: "action-update", enable: "action-enable", disable: "action-disable", delete: "action-delete" },
  secrets: { list: "secret-list", set: "secret-set", delete: "secret-delete" },
  widgets: { list: "widgets", get: "widget", create: "widget-create", save: "widget-save", status: "widget-status", publish: "widget-publish", delete: "widget-delete", duplicate: "widget-duplicate", export: "widget-export", import: "widget-import", versions: "widget-versions" },
  backstage: { overview: "backstage-overview", chat: "backstage-chat", sessions: "backstage-sessions", session: "backstage-session", "delete-session": "backstage-delete-session", change: "backstage-change", decide: "backstage-decide" },
};
for (const [name, commands] of Object.entries(groups)) {
  const group = program.commands.find(c => c.name() === name) ?? program.command(name);
  // Legacy commands also act as groups, so Commander can consume shared
  // options on the parent. Forward explicit values and apply the child's
  // parser (export, for example, has a stricter page limit than list).
  group.hook("preAction", (parent, child) => {
    if (parent === child) return;
    for (const option of child.options) {
      const key = option.attributeName();
      if (parent.getOptionValueSource(key) !== "cli" || child.getOptionValueSource(key) === "cli") continue;
      const value = parent.getOptionValue(key);
      child.setOptionValueWithSource(key, option.parseArg ? option.parseArg(String(value), undefined) : value, "cli");
    }
  });
  for (const [verb, legacy] of Object.entries(commands)) {
    const command = copies.commands.find(c => c.name() === legacy)!;
    command.configureHelp({ showGlobalOptions: false });
    group.addCommand(command.name(verb));
  }
}
// Resource commands are canonical; flat spellings retain their handlers and flags.
const legacyNames = new Set(Object.values(groups).flatMap(commands => Object.values(commands)));
program.configureHelp({
  visibleCommands: command => command.commands.filter(child => !legacyNames.has(child.name()) || child.commands.length > 0),
});
program.command("mcp").description("Run MCP over stdio, read-only by default")
  .option("--allow-writes", "Expose text knowledge, instruction updates and unrestricted agent creation")
  .option("--agent <uuid...>", "Restrict this connection to specified agent UUIDs")
  .action(async (options: { allowWrites?: boolean; agent?: string[] }) => {
    if (globalOpts().key) throw new Error("MCP keys must come from saved config or AGENTKIT_API_KEY, not command arguments.");
    const { runStdio } = await import("../mcp/run-stdio.js");
    await runStdio({ ...options, url: globalOpts().url });
  });
registerEmailCommands(program, managementProjectClient, emailReadProjectClient, out);
program.parseAsync().catch((error: unknown) => {
  if (error instanceof CommanderError && error.exitCode === 0) return;
  const code = error instanceof AgentkitError ? error.code : cancellation.signal.aborted ? "REQUEST_CANCELLED" : "CLI_ERROR";
  const message = error instanceof Error ? error.message : "Command failed.";
  console.error(redact(JSON.stringify({ error: { code, message,
    ...(error instanceof AgentkitError ? { status: error.status, details: error.details, requestId: error.requestId } : {}),
  } })));
  process.exitCode = cancellation.signal.aborted ? 130 : 1;
});
