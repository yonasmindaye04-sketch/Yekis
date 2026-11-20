// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { notifyStaffOfEvent } from "../../lib/staffAlerts.js";
import { randomBytes, randomInt } from "node:crypto";
import { broadcastToConversation, broadcastToStaff, sendToUser } from "../../lib/socket.js";
import { notificationQueue } from "../../queue/queues.js";
import { supportSla } from "../sla/sla.service.js";

// === MAIN FUNCTIONS ===
export class ConversationNotFoundError extends Error {}
export class ConversationAccessError extends Error {}
export class InvalidMessageError extends Error {}

const STAFF_SELECT = { id: true, email: true, staffRole: true, role: true };
const USER_CARD_SELECT = {
  id: true,
  email: true,
  role: true,
  displayName: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
};

export async function createGuestConversation(params: {
  email?: string;
  body: string;
}) {
  // F-01: the address a signed-out visitor types is CONTACT INFORMATION, not an
  // account key. The previous code used it to upsert a User, so naming an
  // existing member's email minted a guest token whose `sub` was that member's
  // real id — full account takeover with no credentials. Never look up or
  // upsert a User by this value again; it is stored on the conversation and
  // read by staff only.
  const contactEmail = params.email?.trim().toLowerCase() || null;
  if (contactEmail && !contactEmail.includes("@")) {
    throw new InvalidMessageError("Enter a valid email address.");
  }
  const body = params.body.trim();
  if (body.length < 1 || body.length > 5000)
    throw new InvalidMessageError(
      "Message must be between 1 and 5,000 characters.",
    );

  // A synthetic, non-routable identity per conversation. `guest.invalid` is
  // reserved by RFC 2606 and can never be a real deliverable mailbox, so it can
  // never collide with — or be mistaken for — a member's address. Flagged
  // isGuestContact so requireAuth refuses it as an identity.
  const user = await prisma.user.create({
    data: {
      email: `guest+${randomBytes(16).toString("hex")}@guest.invalid`,
      phone: `+2519${String(randomInt(10000000, 99999999))}`,
      passwordHash: "guest-support-contact",
      passwordSetAt: null,
      role: "CLIENT",
      isGuestContact: true,
      kyc: { create: { tier: "TIER_1", status: "PENDING" } },
      wallet: { create: { balanceMinor: 0 } },
      consents: { create: [{ purpose: "support_contact", granted: true }] },
    },
  });

  // Auto-assign to a staff member with fewest open conversations
  const assignedStaff = await pickAvailableStaff();

  const participantsToCreate: { userId: string }[] = [{ userId: user.id }];
  if (assignedStaff) {
    participantsToCreate.push({ userId: assignedStaff.id });
  }

const conversation = await prisma.conversation.create({
    data: {
      creatorId: user.id,
      subject: "Website support request",
      contactEmail,
      assignedStaffId: assignedStaff?.id ?? null,
      participants: { create: participantsToCreate },
      messages: { create: { senderId: user.id, body } },
    },
    include: { assignedStaff: { select: STAFF_SELECT } },
  });

broadcastToStaff("chat:new_conversation", {
    conversationId: conversation.id,
    subject: conversation.subject,
    status: conversation.status,
    requesterEmail: contactEmail,
    assignedStaffId: conversation.assignedStaffId,
    preview: body,
    createdAt: conversation.createdAt,
  });

  // Notify all staff of new support inquiry
  void notifyStaffOfEvent({
    eventType: "SUPPORT_REQUEST_CREATED",
    message: `New support request from ${contactEmail ?? "an anonymous visitor"}: "${body.slice(0, 100)}"`,
    metadata: { conversationId: conversation.id, email: contactEmail },
  }).catch((err) => {
    // Non-blocking notification error
  });

  return {
    id: conversation.id,
    // Returned so the caller can mint a single-conversation guest token; not
    // part of the client-facing response shape.
    creatorUserId: user.id,
    subject: conversation.subject,
    status: conversation.status,
    assignedStaff: conversation.assignedStaff
      ? {
          id: conversation.assignedStaff.id,
          name: staffDisplayName(conversation.assignedStaff.email),
        }
      : null,
  };
}

/** Pick the staff member (SUPPORT, ADMIN, SUPER_ADMIN, OPERATIONS_ADMIN, COMPLIANCE_OFFICER) with fewest open assigned conversations */
async function pickAvailableStaff() {
  const staffUsers = await prisma.user.findMany({
    where: {
      staffRole: {
        in: [
          "SUPPORT",
          "ADMIN",
          "SUPER_ADMIN",
          "OPERATIONS_ADMIN",
          "COMPLIANCE_OFFICER",
          "COMPLIANCE_ADMIN",
        ],
      },
    },
    select: {
      id: true,
      email: true,
      staffRole: true,
      _count: {
        select: { conversationsAssigned: { where: { status: "OPEN" } } },
      },
    },
    orderBy: [
      { conversationsAssigned: { _count: "asc" } },
      { createdAt: "asc" },
    ],
    take: 1,
  });
  return staffUsers[0] ?? null;
}

/** Produce a friendly display name from an email, e.g. "support@yekis.et" → "Support" */
function staffDisplayName(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

async function getConversationAccess(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        where: { userId },
        select: { id: true, userId: true, lastReadAt: true },
      },
      assignedStaff: { select: STAFF_SELECT },
    },
  });
  if (!conversation) throw new ConversationNotFoundError();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { staffRole: true },
  });
  const isStaff = Boolean(user?.staffRole);

  // Staff can access support conversations (ADMIN, SUPER_ADMIN, SUPPORT, OPERATIONS_ADMIN can access all support tickets)
  if (isStaff) {
    const isFullStaff =
      user?.staffRole === "ADMIN" ||
      user?.staffRole === "SUPER_ADMIN" ||
      user?.staffRole === "SUPPORT" ||
      user?.staffRole === "OPERATIONS_ADMIN";
    const isAssigned = conversation.assignedStaffId === userId;
    const isParticipant = conversation.participants.length > 0;
    if (!isFullStaff && !isAssigned && !isParticipant) throw new ConversationAccessError();
  } else {
    if (!conversation.participants.length) throw new ConversationAccessError();
  }

  return { conversation, isStaff };
}

export async function createConversation(params: {
  userId: string;
  subject: string;
}) {
  const subject = params.subject.trim();
  if (subject.length < 3 || subject.length > 160)
    throw new InvalidMessageError(
      "Subject must be between 3 and 160 characters.",
    );

  const assignedStaff = await pickAvailableStaff();

  const conversation = await prisma.conversation.create({
    data: {
      creatorId: params.userId,
      subject,
      assignedStaffId: assignedStaff?.id ?? null,
      participants: {
        create: [
          { userId: params.userId },
          ...(assignedStaff ? [{ userId: assignedStaff.id }] : []),
        ],
      },
    },
    include: { assignedStaff: { select: STAFF_SELECT } },
  });

  broadcastToStaff("chat:new_conversation", {
    conversationId: conversation.id,
    subject: conversation.subject,
    status: conversation.status,
    requesterId: params.userId,
    assignedStaffId: conversation.assignedStaffId,
    createdAt: conversation.createdAt,
  });

  void notifyStaffOfEvent({
    eventType: "SUPPORT_REQUEST_CREATED",
    message: `New support request: "${subject}"`,
    metadata: { conversationId: conversation.id, userId: params.userId },
  }).catch(() => undefined);

  await recordAuditEvent({
    userId: params.userId,
    eventType: "SUPPORT_CONVERSATION_CREATED",
    entityType: "Conversation",
    entityId: conversation.id,
  });
  return {
    ...conversation,
    assignedStaff: conversation.assignedStaff
      ? {
          id: conversation.assignedStaff.id,
          name: staffDisplayName(conversation.assignedStaff.email),
        }
      : null,
  };
}

export async function createDirectConversation(params: {
  userId: string;
  recipientId: string;
  subject: string;
}) {
  const query = params.recipientId.trim();

  // Normalize Ethiopian phone number format if applicable
  const normalizedPhone = query.startsWith("0")
    ? `+251${query.slice(1)}`
    : query.startsWith("251")
    ? `+${query}`
    : query;

  // Find recipient by id, email (case-insensitive), phone, or ucid
  const recipient = await prisma.user.findFirst({
    where: {
      OR: [
        { id: query },
        { email: { equals: query, mode: "insensitive" } },
        { phone: query },
        { phone: normalizedPhone },
        { ucid: query },
      ],
      isGuestContact: false,
    },
    select: USER_CARD_SELECT,
  });

  if (!recipient) {
    throw new InvalidMessageError("Recipient user not found.");
  }

  if (params.userId === recipient.id) {
    throw new InvalidMessageError("Cannot start conversation with yourself.");
  }

  const subject = params.subject.trim();
  if (subject.length < 2 || subject.length > 160) {
    throw new InvalidMessageError("Subject must be between 2 and 160 characters.");
  }

  // Check if an existing direct thread exists between these 2 users
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: params.userId } } },
        { participants: { some: { userId: recipient.id } } },
        { assignedStaffId: null },
      ],
    },
    include: {
      participants: {
        include: {
          user: {
            select: USER_CARD_SELECT,
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
    },
  });

  if (existing) {
    const otherParticipant =
      existing.participants.find((p: { userId: string; user: typeof recipient }) => p.userId !== params.userId)?.user ?? null;
    return {
      id: existing.id,
      subject: existing.subject,
      status: existing.status,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
      latestMessage: existing.messages[0] ?? null,
      otherParticipant,
      isSupport: false,
      unread: false,
      assignedStaff: null,
    };
  }

  const conversation = await prisma.conversation.create({
    data: {
      creatorId: params.userId,
      subject,
      participants: {
        create: [{ userId: params.userId }, { userId: recipient.id }],
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: USER_CARD_SELECT,
          },
        },
      },
    },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "DIRECT_CONVERSATION_CREATED",
    entityType: "Conversation",
    entityId: conversation.id,
    metadata: {
      recipientId: recipient.id,
      subject,
    },
  });

  sendToUser(recipient.id, "chat:new_conversation", {
    conversationId: conversation.id,
    subject: conversation.subject,
    status: conversation.status,
    requesterId: params.userId,
    createdAt: conversation.createdAt,
  });

  const otherParticipant =
    conversation.participants.find((p: { userId: string; user: typeof recipient }) => p.userId !== params.userId)?.user ?? null;

  return {
    id: conversation.id,
    subject: conversation.subject,
    status: conversation.status,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    latestMessage: null,
    otherParticipant,
    isSupport: false,
    unread: false,
    assignedStaff: null,
  };
}

export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: {
        include: {
          user: {
            select: USER_CARD_SELECT,
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
      assignedStaff: { select: STAFF_SELECT },
    },
    orderBy: { updatedAt: "desc" },
  });

  return conversations.map((conversation) => {
    const myParticipant = conversation.participants.find((p: { userId: string }) => p.userId === userId);
    const lastReadAt = myParticipant?.lastReadAt;
    const latestMessage = conversation.messages[0] ?? null;
    const otherParticipant =
      conversation.participants.find((p: { userId: string; user: any }) => p.userId !== userId)?.user ?? null;

    return {
      id: conversation.id,
      subject: conversation.subject,
      status: conversation.status,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      latestMessage,
      otherParticipant,
      isSupport: Boolean(conversation.assignedStaffId),
      unread: Boolean(
        latestMessage &&
        latestMessage.senderId !== userId &&
        (!lastReadAt || latestMessage.createdAt > lastReadAt),
      ),
      assignedStaff: conversation.assignedStaff
        ? {
            id: conversation.assignedStaff.id,
            name: staffDisplayName(conversation.assignedStaff.email),
          }
        : null,
    };
  });
}

/**
 * Resolves a chat attachment storage key to the conversation that owns it, and
 * checks whether the given user may read it.
 *
 * Attachment URLs are handed to browsers, proxies and access logs, so the route
 * must not serve a file on the strength of the key alone — the key is opaque and
 * unguessable, but a leaked URL would otherwise grant permanent access.
 *
 * The URL stored on the message is the canonical, reversible encoding of the
 * key (`/api/v1/chat/attachments/<encodeURIComponent(key)>`), so ownership can be
 * resolved by an indexed point lookup rather than a scan.
 *
 * @returns the conversationId when access is allowed, otherwise null.
 */
export async function authorizeAttachmentAccess(params: {
  storageKey: string;
  userId: string;
}): Promise<string | null> {
  const url = `/api/v1/chat/attachments/${encodeURIComponent(params.storageKey)}`;

  const message = await prisma.chatMessage.findFirst({
    where: { attachmentUrl: url },
    select: { conversationId: true },
  });
  if (!message) return null;

  try {
    await getConversationAccess(message.conversationId, params.userId);
    return message.conversationId;
  } catch {
    // ConversationNotFound / ConversationAccessError both mean "no".
    return null;
  }
}

export async function listMessages(params: {
  conversationId: string;
  userId: string;
}) {
  const { isStaff } = await getConversationAccess(params.conversationId, params.userId);
  return prisma.chatMessage.findMany({
    where: { conversationId: params.conversationId, ...(isStaff ? {} : { origin: "INTERNAL" }) },
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          role: true,
          staffRole: true,
          displayName: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendMessage(params: {
  conversationId: string;
  userId: string;
  body: string;
  attachmentUrl?: string;
  internal?: boolean;
}) {
  const body = params.body.trim();
  if (body.length < 1 || body.length > 5000)
    throw new InvalidMessageError(
      "Message must be between 1 and 5,000 characters.",
    );
  const { conversation, isStaff } = await getConversationAccess(
    params.conversationId,
    params.userId,
  );
  const origin = params.internal && isStaff ? "STAFF_INTERNAL" : "INTERNAL";

  const createdMessageId = await prisma.$transaction(async (tx) => {
    if (
      conversation.assignedStaffId &&
      !conversation.participants.some(
        (p: { userId: string }) => p.userId === conversation.assignedStaffId,
      )
    ) {
      await tx.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: conversation.assignedStaffId,
          },
        },
        create: { conversationId: conversation.id, userId: conversation.assignedStaffId },
        update: {},
      });
    }
    if (
      isStaff &&
      !conversation.participants.some(
        (p: { userId: string }) => p.userId === params.userId,
      )
    ) {
      await tx.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: params.userId,
          },
        },
        create: { conversationId: conversation.id, userId: params.userId },
        update: {},
      });
    }
    const created = await tx.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: params.userId,
        body,
        ...(params.attachmentUrl
          ? { attachmentUrl: params.attachmentUrl }
          : {}),
        origin,
      },
    });
    await tx.conversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
        // The first staff reply stops the first-response SLA clock. It is
        // written once and never rewritten, so a later message cannot
        // "un-breach" a ticket that was already missed.
        ...(isStaff && !conversation.firstRespondedAt
          ? { firstRespondedAt: new Date() }
          : {}),
      },
    });
    return created.id;
  });

  const createdMessage = await prisma.chatMessage.findUniqueOrThrow({
    where: { id: createdMessageId },
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          role: true,
          staffRole: true,
          displayName: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Real-time broadcast to conversation channel (for open active chat window)
  broadcastToConversation(conversation.id, "chat:message", createdMessage);

  // Notify staff desk when a non-staff user messages on a support conversation
  if (!isStaff) {
    broadcastToStaff("chat:new_message", {
      ...createdMessage,
      conversationId: conversation.id,
    });
  }

  // Real-time push notification to other participants' private user socket channels
  const allParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId: conversation.id },
    include: { user: { select: { staffRole: true } } },
  });
  for (const p of allParticipants) {
    if (p.userId !== params.userId && (origin !== "STAFF_INTERNAL" || p.user.staffRole)) {
      sendToUser(p.userId, "chat:new_message", {
        ...createdMessage,
        conversationId: conversation.id,
      });
      
      const senderName = createdMessage.sender.firstName || createdMessage.sender.displayName || "Someone";
      const snippet = createdMessage.body.length > 50 ? createdMessage.body.slice(0, 50) + "..." : createdMessage.body;
      void notificationQueue.add("new-message", {
        userId: p.userId,
        type: "new-message",
        message: `New message from ${senderName}: "${snippet}"`,
        metadata: { conversationId: conversation.id, messageId: createdMessage.id },
      });
    }
  }

  return createdMessage;
}

// === MINI-ME AI CO-PILOT FUNCTIONS ===

export async function generateSmartReplies(params: {
  conversationId: string;
  userId: string;
  tone?: "PROFESSIONAL" | "FRIENDLY" | "NEGOTIATION" | "CONCISE";
  customPrompt?: string;
  currentDraft?: string;
}) {
  const { conversation, isStaff } = await getConversationAccess(params.conversationId, params.userId);
  const tone = params.tone || "PROFESSIONAL";
  const customPrompt = (params.customPrompt || "").trim();
  const currentDraft = (params.currentDraft || "").trim();

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { role: true, staffRole: true },
  });
  const userRole = user?.role || "CLIENT";
  const isSupport = conversation.assignedStaffId !== null;

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: params.conversationId },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { sender: { select: { id: true, role: true, displayName: true } } },
  });

  const participantIds = Array.from(
    new Set([conversation.creatorId, params.userId, ...messages.map((m) => m.senderId)].filter(Boolean)),
  );

  const relatedContracts = await prisma.contract.findMany({
    where: {
      OR: [
        { clientId: { in: participantIds } },
        { freelancerId: { in: participantIds } },
      ],
    },
    include: {
      job: { select: { id: true, title: true, status: true } },
      milestones: {
        // `Milestone` has no sequence column in the schema; the creation
        // order is the milestone order.
        orderBy: { createdAt: "asc" },
      },
    },
    take: 3,
  });

  const relatedGigs = await prisma.gig.findMany({
    where: {
      freelancerId: { in: participantIds },
      // `GigStatus` is DRAFT | ACTIVE | PAUSED | REJECTED | ARCHIVED. A gig
      // that is live on the marketplace is ACTIVE.
      status: "ACTIVE",
    },
    take: 3,
  });

  const activeContract = relatedContracts[0] || null;
  const activeMilestone =
    activeContract?.milestones.find(
      (m) => m.escrowState === "SUBMITTED_FOR_REVIEW" || m.escrowState === "ESCROW_HELD",
    ) ||
    activeContract?.milestones[0] ||
    null;
  const activeGig = relatedGigs[0] || null;

  const milestoneETB = activeMilestone
    ? `${(Number(activeMilestone.amountMinor) / 100).toLocaleString()} ETB`
    : null;

  const styleTransform = (baseText: string): string => {
    if (tone === "CONCISE") {
      return (baseText.split(".")[0] ?? "").trim() + ".";
    }
    if (tone === "FRIENDLY") {
      return `Hi there! ${baseText} Let me know if that works for you!`;
    }
    if (tone === "NEGOTIATION") {
      return `${baseText} Let's lock these terms in Yekis Escrow so both sides are protected.`;
    }
    return baseText;
  };

  const latest = messages[0];
  const text = (latest?.body || "").toLowerCase();

  let rawItems: Array<{
    id: string;
    label: string;
    text: string;
    rationale: string;
    category: "APPROVAL" | "NEGOTIATION" | "DELIVERY" | "CLARIFICATION" | "FOLLOW_UP";
  }> = [];

  if (customPrompt) {
    rawItems = [
      {
        id: "custom-1",
        label: "Custom Option 1",
        text: styleTransform(
          `${currentDraft ? `${currentDraft} — ` : ""}Regarding "${customPrompt}": let's align this with ${activeMilestone ? `milestone "${activeMilestone.title}" (${milestoneETB})` : "our Yekis escrow agreement"}.`,
        ),
        rationale: `Generated from your custom prompt ("${customPrompt}") in ${tone.toLowerCase()} tone.`,
        category: "NEGOTIATION",
      },
      {
        id: "custom-2",
        label: "Structured Proposal",
        text: styleTransform(
          `Here is what I propose for ${customPrompt}: we can document the acceptance criteria on ${activeContract?.job?.title || "the contract"} and proceed once confirmed.`,
        ),
        rationale: "Pairs your custom instruction with contract milestone verification.",
        category: "CLARIFICATION",
      },
      {
        id: "custom-3",
        label: "Actionable Next Step",
        text: styleTransform(
          `Could we confirm "${customPrompt}" today so we keep our delivery timeline on track?`,
        ),
        rationale: "Direct follow-up anchored to project schedule.",
        category: "FOLLOW_UP",
      },
    ];
  } else if (isSupport) {
    rawItems = isStaff
      ? [
          {
            id: "sup-staff-1",
            label: "Investigating Issue",
            text: styleTransform("I am reviewing your escrow ledger and transaction logs now. Please allow me a moment."),
            rationale: "Reassures user while checking ledger records.",
            category: "CLARIFICATION",
          },
          {
            id: "sup-staff-2",
            label: "Request Reference",
            text: styleTransform("Could you share the Telebirr/CBE Birr transaction reference or contract ID so I can verify?"),
            rationale: "Collects payment rail reference.",
            category: "FOLLOW_UP",
          },
          {
            id: "sup-staff-3",
            label: "Confirm Resolution",
            text: styleTransform("This ticket has been verified and resolved on your account. Let me know if you need anything else."),
            rationale: "Closes loop clearly.",
            category: "APPROVAL",
          },
        ]
      : [
          {
            id: "sup-user-1",
            label: "Escrow / Top-Up Check",
            text: styleTransform("Could you check the status of my recent escrow milestone or wallet top-up receipt?"),
            rationale: "Standard escrow support inquiry.",
            category: "CLARIFICATION",
          },
          {
            id: "sup-user-2",
            label: "Share Reference ID",
            text: styleTransform("Here is my contract and payment reference number for verification."),
            rationale: "Provides actionable audit details.",
            category: "DELIVERY",
          },
          {
            id: "sup-user-3",
            label: "Next Steps",
            text: styleTransform("Thank you! Could you clarify what steps I should take next?"),
            rationale: "Polite follow-up.",
            category: "FOLLOW_UP",
          },
        ];
  } else if (
    text.includes("deliver") ||
    text.includes("submit") ||
    text.includes("review") ||
    text.includes("done") ||
    activeMilestone?.escrowState === "SUBMITTED_FOR_REVIEW"
  ) {
    rawItems =
      userRole === "CLIENT"
        ? [
            {
              id: "del-c-1",
              label: "Approve & Release",
              text: styleTransform(
                `I have reviewed the submission for ${activeMilestone ? `"${activeMilestone.title}"` : "this milestone"} and will release the ${milestoneETB || "escrow"} payout now.`,
              ),
              rationale: "Confirms QA sign-off and immediate milestone release.",
              category: "APPROVAL",
            },
            {
              id: "del-c-2",
              label: "Confirm QA Check",
              text: styleTransform(
                `Deliverable received for ${activeContract?.job?.title || "the project"}. I am running final QA tests today and will update you shortly.`,
              ),
              rationale: "Sets clear expectation for review window.",
              category: "CLARIFICATION",
            },
            {
              id: "del-c-3",
              label: "Request Minor Revision",
              text: styleTransform(
                `Thank you for the upload! Could we make one small adjustment before we close ${activeMilestone ? `"${activeMilestone.title}"` : "the milestone"}?`,
              ),
              rationale: "Constructive revision request tied to active milestone.",
              category: "NEGOTIATION",
            },
          ]
        : [
            {
              id: "del-f-1",
              label: "Ready for Escrow Release",
              text: styleTransform(
                `All deliverables for ${activeMilestone ? `"${activeMilestone.title}" (${milestoneETB})` : "this phase"} are uploaded and verified. Please review and release the milestone when ready.`,
              ),
              rationale: "Prompts client to inspect and release funded escrow.",
              category: "DELIVERY",
            },
            {
              id: "del-f-2",
              label: "Offer Walkthrough",
              text: styleTransform(
                `I have attached the build artifacts and test logs. Happy to walk you through any part of the implementation!`,
              ),
              rationale: "Speeds up client acceptance.",
              category: "FOLLOW_UP",
            },
            {
              id: "del-f-3",
              label: "Plan Next Milestone",
              text: styleTransform(
                `Once you approve this deliverable, I am ready to kick off the next milestone right away.`,
              ),
              rationale: "Maintains momentum toward next contract phase.",
              category: "NEGOTIATION",
            },
          ];
  } else {
    rawItems =
      userRole === "CLIENT"
        ? [
            {
              id: "gen-c-1",
              label: "Align on Milestone",
              text: styleTransform(
                `The scope for ${activeContract?.job?.title || conversation.subject} looks solid. Let's proceed with ${activeMilestone ? `"${activeMilestone.title}" (${milestoneETB})` : "funding the escrow milestone"}.`,
              ),
              rationale: "Moves conversation toward escrow execution.",
              category: "APPROVAL",
            },
            {
              id: "gen-c-2",
              label: "Split Into 2 Phases",
              text: styleTransform(
                `Can we structure this into two clear escrow milestones with defined QA acceptance criteria?`,
              ),
              rationale: "Reduces delivery risk using staged milestones.",
              category: "NEGOTIATION",
            },
            {
              id: "gen-c-3",
              label: "Confirm Timeline",
              text: styleTransform(
                `Could you confirm your estimated delivery date and whether you need any additional assets from our side?`,
              ),
              rationale: "Clarifies schedule and dependencies.",
              category: "CLARIFICATION",
            },
          ]
        : [
            {
              id: "gen-f-1",
              label: "Confirm Availability",
              text: styleTransform(
                `I can deliver ${activeContract?.job?.title || conversation.subject} within the target schedule. Ready to start as soon as ${activeMilestone ? `"${activeMilestone.title}" (${milestoneETB})` : "the milestone"} is funded.`,
              ),
              rationale: "Confirms readiness tied to escrow protection.",
              category: "APPROVAL",
            },
            {
              id: "gen-f-2",
              label: "Propose Milestone Breakdown",
              text: styleTransform(
                `I suggest breaking this into Phase 1 (Core Architecture & Sandbox) and Phase 2 (Production QA & Handover) on Yekis Escrow.`,
              ),
              rationale: "Structured milestone counter-proposal.",
              category: "NEGOTIATION",
            },
            {
              id: "gen-f-3",
              label: "Share Gig / Portfolio",
              text: styleTransform(
                `I have handled similar integrations${activeGig ? ` (see my gig "${activeGig.title}")` : ""} and can share sample verification logs right away.`,
              ),
              rationale: "References active freelancer gig for credibility.",
              category: "DELIVERY",
            },
          ];
  }

  return {
    suggestions: rawItems.map((i) => i.text),
    items: rawItems,
    context: {
      stage: activeMilestone?.escrowState === "SUBMITTED_FOR_REVIEW" ? "Deliverable Review" : activeContract ? "Active Escrow Contract" : "Deal Scoping",
      contractId: activeContract?.id || null,
      contractTitle: activeContract?.job?.title || null,
      milestoneId: activeMilestone?.id || null,
      milestoneTitle: activeMilestone?.title || null,
      milestoneAmountETB: milestoneETB,
      escrowState: activeMilestone?.escrowState || null,
      gigTitle: activeGig?.title || null,
    },
    actionChips: [
      { id: "act-deal", label: "Extract Deal Terms", actionType: "EXTRACT_DEAL" },
      { id: "act-sum", label: "Summarize Thread", actionType: "SUMMARIZE" },
      ...(activeContract
        ? [{ id: "act-contract", label: "Open Contracts & Escrow", actionType: "OPEN_CONTRACTS" }]
        : []),
    ],
    agentNote: activeMilestone
      ? `Grounded in ${activeContract?.job?.title || "active contract"} · ${activeMilestone.title} (${milestoneETB}, ${activeMilestone.escrowState})`
      : `Analyzed ${messages.length} recent message(s) in ${tone.toLowerCase()} tone`,
    toneUsed: tone,
  };
}

export async function summarizeConversation(params: {
  conversationId: string;
  userId: string;
}) {
  await getConversationAccess(params.conversationId, params.userId);

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: params.conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 30,
        include: { sender: { select: { id: true, email: true, role: true } } },
      },
    },
  });

  if (conversation.messages.length === 0) {
    return {
      topic: conversation.subject,
      keyPoints: ["No messages exchanged yet in this conversation."],
      agreedBudgetETB: null,
      detectedTimeline: "Not specified",
      nextStep: "Send an introductory message to start the negotiation.",
      messageCount: 0,
      lastActivity: conversation.updatedAt,
    };
  }

  const allText = conversation.messages.map((m) => m.body).join(" ");

  // Extract potential budget
  const budgetMatch = allText.match(/(?:ETB|birr)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:ETB|birr)/i);
  const agreedBudgetETB = budgetMatch ? (budgetMatch[1] || budgetMatch[2])?.trim() : null;

  // Extract potential deadlines
  const deadlineMatch = allText.match(/(?:by|within|in)\s+(\d+\s*(?:days|weeks|months|business days))/i);
  const detectedTimeline = deadlineMatch ? deadlineMatch[1] : "Timeline under discussion";

  const keyPoints = [
    `Discussion focus: ${conversation.subject}`,
    `Total messages analyzed: ${conversation.messages.length}`,
    detectedTimeline ? `Estimated duration: ${detectedTimeline}` : "Scope discussed",
  ];

  if (agreedBudgetETB) {
    keyPoints.push(`Budget reference identified: ETB ${agreedBudgetETB}`);
  }

  const nextStep = agreedBudgetETB
    ? "Formalize the agreed scope into a Milestone Contract with escrow funding."
    : "Clarify milestone deliverables and agree on the ETB budget.";

  return {
    topic: conversation.subject,
    keyPoints,
    agreedBudgetETB,
    detectedTimeline,
    nextStep,
    messageCount: conversation.messages.length,
    lastActivity: conversation.updatedAt,
  };
}

export async function extractDealTerms(params: {
  conversationId: string;
  userId: string;
}) {
  await getConversationAccess(params.conversationId, params.userId);

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: params.conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 30,
      },
    },
  });

  const fullText = conversation.messages.map((m) => m.body).join("\n");

  // Extract budget number
  let budgetETB: number | null = null;
  const budgetMatch = fullText.match(/(?:ETB|birr)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:ETB|birr)/i);
  if (budgetMatch) {
    const rawNum = (budgetMatch[1] || budgetMatch[2])?.replaceAll(",", "");
    const parsed = Number(rawNum);
    if (!Number.isNaN(parsed) && parsed > 0) {
      budgetETB = parsed;
    }
  }

  // Extract estimated days
  let estimatedDays = 7;
  const daysMatch = fullText.match(/(\d+)\s*(?:days|day)/i);
  if (daysMatch && daysMatch[1]) {
    const parsedDays = parseInt(daysMatch[1], 10);
    if (parsedDays > 0 && parsedDays <= 180) {
      estimatedDays = parsedDays;
    }
  }

  return {
    suggestedTitle: conversation.subject,
    suggestedBudgetETB: budgetETB ?? 5000,
    estimatedDays,
    confidence: budgetETB ? "HIGH" : "MEDIUM",
    readyForEscrow: Boolean(budgetETB && budgetETB > 0),
  };
}

export async function markConversationRead(params: {
  conversationId: string;
  userId: string;
}) {
  const { conversation } = await getConversationAccess(
    params.conversationId,
    params.userId,
  );
  await prisma.conversationParticipant.upsert({
    where: {
      conversationId_userId: {
        conversationId: conversation.id,
        userId: params.userId,
      },
    },
    create: {
      conversationId: conversation.id,
      userId: params.userId,
      lastReadAt: new Date(),
    },
    update: { lastReadAt: new Date() },
  });
  return { ok: true };
}

export async function listStaffConversations(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  staffId?: string;
  assignment?: string;
  sort?: string;
}) {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.limit || 20));

  const where: Record<string, unknown> = {};

  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  } else if (!params?.status) {
    where.status = "OPEN";
  }

  const assignmentNorm = params?.assignment?.toLowerCase();
  if (assignmentNorm === "unassigned") {
    where.assignedStaffId = null;
  } else if (assignmentNorm === "mine" && params?.staffId) {
    where.assignedStaffId = params.staffId;
  } else if (params?.staffId) {
    where.assignedStaffId = params.staffId;
  }

  if (params?.search) {
    where.OR = [
      { subject: { contains: params.search, mode: "insensitive" } },
      { contactEmail: { contains: params.search, mode: "insensitive" } },
      { creator: { email: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      include: {
        creator: { select: { id: true, email: true, role: true } },
        assignedStaff: { select: STAFF_SELECT },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true },
        },
      },
      orderBy:
        params?.sort === "oldest"
          ? { updatedAt: "asc" }
          : params?.sort === "waiting"
            ? { createdAt: "asc" }
            : { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: items.map((c) => ({
      ...c,
      creator: {
        ...c.creator,
        email: c.creator.email.endsWith("@guest.invalid")
          ? c.contactEmail || "Guest visitor"
          : c.creator.email,
      },
      assignedStaff: c.assignedStaff
        ? {
            id: c.assignedStaff.id,
            name: staffDisplayName(c.assignedStaff.email),
          }
        : null,
      // SLA is computed and attached server-side, so the console does not
      // have to redraw the clock and a breach is the same fact everywhere.
      sla: supportSla(c),
    })),
    total,
    page,
    pageSize: limit,
  };
}

export async function setConversationStatus(params: {
  conversationId: string;
  status: "OPEN" | "CLOSED";
}) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
  });
  if (!conversation) throw new ConversationNotFoundError();
  return prisma.conversation.update({
    where: { id: params.conversationId },
    data: {
      status: params.status,
      // Closing the ticket stops the resolution SLA clock. It is written once:
      // reopening a ticket does not un-breach a resolution that was already
      // missed, and the fact that it was closed at all is kept.
      ...(params.status === "CLOSED" && !conversation.resolvedAt
        ? { resolvedAt: new Date() }
        : {}),
    },
    include: {
      creator: { select: { id: true, email: true, role: true } },
      assignedStaff: { select: STAFF_SELECT },
    },
  });
}

export async function assignConversationToStaff(params: {
  conversationId: string;
  staffId: string;
}) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
  });
  if (!conversation) throw new ConversationNotFoundError();

  const staff = await prisma.user.findUnique({
    where: { id: params.staffId },
    select: { id: true, staffRole: true },
  });
  if (!staff?.staffRole) throw new ConversationAccessError();

  return prisma.conversation.update({
    where: { id: params.conversationId },
    data: { assignedStaffId: params.staffId },
    include: {
      creator: { select: { id: true, email: true, role: true } },
      assignedStaff: { select: STAFF_SELECT },
    },
  });
}
