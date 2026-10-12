import type { EmailThreadDetail, EmailThreadSummary } from "../../src/sdk/types.js";

export const discardedEmail = {
  id: "thread-discarded", status: "discarded", discarded: true,
  discardSource: "agent", discardReason: { origin: "model", code: "automated_sender", message: "Vendor support notification" },
  customerName: "AWS Support", customerEmail: "support@example.com",
  subject: "Support case 179165770100923", lastActivityAt: "2026-10-10T12:00:00Z", revision: "2026-10-10T12:00:00Z",
} satisfies EmailThreadSummary;

export const emailThread = {
  ...discardedEmail, emailAddressId: "address-1",
  messages: [{
    id: "message-inbound", threadId: discardedEmail.id, direction: "inbound", draftId: null, providerEmailId: "provider-1",
    fromAddress: "support@example.com", toAddresses: ["inbox@example.com"], ccAddresses: [], bccAddresses: [],
    subject: discardedEmail.subject, text: "A vendor replied to your case.\nYour request is approved.", html: null,
    headers: { "message-id": "<synthetic@example.com>" }, createdAt: "2026-10-10T12:00:00Z",
    processingDisposition: "discarded", discardReason: discardedEmail.discardReason,
  }],
  drafts: [{
    id: "draft-1", threadId: discardedEmail.id, status: "pending", subject: "Re: Support case 179165770100923",
    bodyText: "Thank you for confirming.", reviewCategory: null, reviewReason: null,
    editedAt: null, generatedAt: "2026-10-10T12:01:00Z", sentAt: null, revision: "1", deliveryStatus: "not_sent",
  }], draft: null, forwards: [],
} satisfies EmailThreadDetail;
