import * as z from "zod/v4";
import { DESIGN_LIMITS } from "../sdk/types.js";

export const aiFields = {
  model: z.string().min(1).describe("Model ID supported by the workspace"),
  instructionsPreset: z.enum(["custom", "ai-chatbot", "customer-support", "sales-agent", "language-tutor", "coding-expert", "life-coach"]),
  instructionsPrompt: z.string(),
};

export const designFields = {
  title: z.string(),
  language: z.string().nullable(),
  appearance: z.enum(["Light", "Dark"]),
  primaryColor: z.string(),
  bubbleColor: z.string(),
  primaryColorHeader: z.boolean(),
  position: z.enum(["bottom-left", "bottom-right"]),
  showInitialMessageBubble: z.boolean(),
  initialMessages: z.array(z.string().max(DESIGN_LIMITS.initialMessages.maxLength)).max(DESIGN_LIMITS.initialMessages.max),
  messagePlaceholder: z.string().max(DESIGN_LIMITS.messagePlaceholderMaxLength),
  bubbleIconUrl: z.url().nullable(),
  profilePictureUrl: z.url().nullable(),
  hideBranding: z.boolean(),
  keepShowing: z.boolean(),
  prompts: z.array(z.string().max(DESIGN_LIMITS.prompts.maxLength)).max(DESIGN_LIMITS.prompts.max),
};

export const securityFields = {
  isPrivate: z.boolean(),
  rateLimit: z.strictObject({
    maxMessages: z.number().min(1).max(100),
    windowSeconds: z.number().min(10).max(3600),
    limitMessage: z.string().min(1).max(500),
  }),
  allowedDomains: z.strictObject({ enabled: z.boolean(), domains: z.array(z.string()) }),
};

export const notificationFields = { dailyConversations: z.boolean(), dailyEmails: z.boolean(), quotaAlerts: z.boolean() };
