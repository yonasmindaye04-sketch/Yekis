// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { notifyStaffOfEvent } from "../../lib/staffAlerts.js";
import { randomInt } from "node:crypto";
import { broadcastToConversation, sendToUser } from "../../lib/socket.js";
import { notificationQueue } from "../../queue/queues.js";

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
  email: string;
  body: string;
}) {
  const email = params.email.trim().toLowerCase();
  const body = params.body.trim();
  if (!email.includes("@"))
    throw new InvalidMessageError("Enter a valid email address.");
  if (body.length < 1 || body.length > 5000)
    throw new InvalidMessageError(
      "Message must be between 1 and 5,000 characters.",
    );

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      phone: `+2519${String(randomInt(10000000, 99999999))}`,
      passwordHash: "guest-support-contact",
      role: "CLIENT",
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
      assignedStaffId: assignedStaff?.id ?? null,
      participants: { create: participantsToCreate },
      messages: { create: { senderId: user.id, body } },
    },
    include: { assignedStaff: { select: STAFF_SELECT } },
  });

  // Notify all staff of new support inquiry
  void notifyStaffOfEvent({
    eventType: "SUPPORT_REQUEST_CREATED",
    message: `New support request from ${email}: "${body.slice(0, 100)}"`,
    metadata: { conversationId: conversation.id, email },
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
        select: { id: true, lastReadAt: true },
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
      participants: { create: { userId: params.userId } },
    },
    include: { assignedStaff: { select: STAFF_SELECT } },
  });

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
  if (params.userId === params.recipientId) {
    throw new InvalidMessageError("Cannot start conversation with yourself.");
  }

  const recipient = await prisma.user.findUnique({
    where: { id: params.recipientId },
    select: USER_CARD_SELECT,
  });
  if (!recipient) {
    throw new InvalidMessageError("Recipient user not found.");
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
        { participants: { some: { userId: params.recipientId } } },
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
      ...existing,
      otherParticipant,
      latestMessage: existing.messages[0] ?? null,
    };
  }

  const conversation = await prisma.conversation.create({
    data: {
      creatorId: params.userId,
      subject,
      participants: {
        create: [{ userId: params.userId }, { userId: params.recipientId }],
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
  });

  const otherParticipant =
    conversation.participants.find((p: { userId: string; user: typeof recipient }) => p.userId !== params.userId)?.user ?? null;
  return {
    ...conversation,
    otherParticipant,
    latestMessage: null,
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
  await getConversationAccess(params.conversationId, params.userId);
  return prisma.chatMessage.findMany({
    where: { conversationId: params.conversationId },
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

  await prisma.$transaction(async (tx) => {
    if (
      isStaff &&
      !conversation.participants.find((p: { id: string }) => p.id)
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
    await tx.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: params.userId,
        body,
        ...(params.attachmentUrl
          ? { attachmentUrl: params.attachmentUrl }
          : {}),
      },
    });
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
  });

  const createdMessage = await prisma.chatMessage.findFirstOrThrow({
    where: { conversationId: conversation.id, senderId: params.userId },
    orderBy: { createdAt: "desc" },
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

  // Real-time push notification to other participants' private user socket channels
  const allParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId: conversation.id },
    select: { userId: true },
  });
  for (const p of allParticipants) {
    if (p.userId !== params.userId) {
      sendToUser(p.userId, "chat:new_message", {
        conversationId: conversation.id,
        message: createdMessage,
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
}) {
  const { conversation, isStaff } = await getConversationAccess(params.conversationId, params.userId);

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { role: true, staffRole: true },
  });
  const userRole = user?.role || "CLIENT";
  const isSupport = conversation.assignedStaffId !== null;

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: params.conversationId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { sender: { select: { id: true, role: true } } },
  });

  // ── Support Conversation Replies ──
  if (isSupport) {
    if (isStaff) {
      if (messages.length === 0) {
        return [
          "Hello! I'm reviewing your support request. How can I help you today?",
          "Greetings! Please share the details of your inquiry or issue.",
          "Welcome to Yekis Support! I'm here to assist you.",
        ];
      }
      return [
        "I'm looking into this for you right now. Please allow me a moment.",
        "Could you please provide the transaction ID, job title, or contract reference?",
        "This issue has been resolved. Please let me know if you need anything else!",
      ];
    }

    // Client or Freelancer talking to Support
    if (messages.length === 0) {
      return [
        "I have a question regarding my wallet deposit or payout.",
        "Could you please assist me with a milestone contract issue?",
        "I need help with my Fayda identity verification status.",
      ];
    }
    const latest = messages[0];
    if (latest?.senderId === params.userId) {
      return [
        "Thank you for looking into this!",
        "Let me know if you need any additional screenshots or information.",
        "I will wait for your update.",
      ];
    }
    return [
      "Thank you! That resolved my question.",
      "Here is the additional information you requested.",
      "Could you please clarify what steps I need to take next?",
    ];
  }

  // ── Direct Conversation Replies (Role-based: CLIENT vs FREELANCER) ──
  if (messages.length === 0) {
    if (userRole === "CLIENT") {
      return [
        "Hi! Are you available to discuss a new project?",
        "Could you review the project scope and share your rate estimate?",
        "Let's align on the milestone deliverables and timeline.",
      ];
    }
    // FREELANCER
    return [
      "Hello! I reviewed your project requirements and would love to help.",
      "Hi! Could you share more details on the scope and timeline?",
      "I'm available and ready to discuss milestones and deliverables.",
    ];
  }

  const latest = messages[0];
  const text = (latest?.body || "").toLowerCase();

  // If latest message was sent by the requesting user themselves
  if (latest?.senderId === params.userId) {
    if (userRole === "CLIENT") {
      return [
        "Let me know your thoughts whenever you're ready!",
        "Looking forward to hearing from you.",
        "Feel free to ask if anything in the brief is unclear.",
      ];
    }
    // FREELANCER
    return [
      "Let me know if you need any clarification on my proposal.",
      "Looking forward to hearing your thoughts!",
      "I'll keep you updated on progress.",
    ];
  }

  // Deliverable review / submission context
  if (
    text.includes("deliver") ||
    text.includes("submit") ||
    text.includes("review") ||
    text.includes("finished") ||
    text.includes("check") ||
    text.includes("done")
  ) {
    if (userRole === "CLIENT") {
      return [
        "I will review the deliverables thoroughly and get back to you shortly.",
        "Deliverables received! Everything looks great so far.",
        "Could you please share the source files and assets as well?",
      ];
    }
    return [
      "I've updated the files based on your feedback. Please take a look!",
      "Everything is ready for your review. Let me know if any revisions are needed.",
      "Thank you for reviewing! I'm ready to proceed to the next milestone.",
    ];
  }

  // Budget / Milestone / Escrow context
  if (
    text.includes("budget") ||
    text.includes("price") ||
    text.includes("etb") ||
    text.includes("birr") ||
    text.includes("milestone") ||
    text.includes("escrow") ||
    text.includes("cost") ||
    text.includes("pay")
  ) {
    if (userRole === "CLIENT") {
      return [
        "The proposed ETB budget works for me. Let's create the escrow milestone.",
        "Could we structure this into milestone payments via Yekis escrow?",
        "Could you provide a quick breakdown of deliverables for this budget?",
      ];
    }
    return [
      "The proposed ETB budget works well. I'm ready to begin once escrow is funded.",
      "Could we structure this into two milestone payments via Yekis escrow?",
      "That matches our agreed scope. Let's set up the milestone contract.",
    ];
  }

  // Deadline / Timeline context
  if (
    text.includes("when") ||
    text.includes("time") ||
    text.includes("deadline") ||
    text.includes("days") ||
    text.includes("urgent") ||
    text.includes("schedule") ||
    text.includes("start")
  ) {
    if (userRole === "CLIENT") {
      return [
        "That timeline fits my schedule well. Let's proceed.",
        "Could we aim to complete this a few days earlier if possible?",
        "Sounds like a solid schedule. Let's get started!",
      ];
    }
    return [
      "I can comfortably deliver this within the requested timeline.",
      "That timeline works perfectly. I can get started today.",
      "To guarantee high quality, could we schedule 2 extra days for QA?",
    ];
  }

  // General conversation replies
  if (userRole === "CLIENT") {
    return [
      "Sounds great! Let's proceed with this plan.",
      "Could you share a bit more detail on your approach?",
      "Understood! Looking forward to the next steps.",
    ];
  }
  return [
    "Sounds great! Let's proceed with this plan.",
    "Could you share a bit more detail on the specific requirements?",
    "Understood! I'll prepare the next steps right away.",
  ];
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
}) {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.limit || 20));

  const where: Record<string, unknown> = {};

  if (params?.status) {
    where.status = params.status;
  } else {
    where.status = "OPEN";
  }

  // If a staffId is provided, only show that staff member's conversations
  if (params?.staffId) {
    where.assignedStaffId = params.staffId;
  }

  if (params?.search) {
    where.OR = [
      { subject: { contains: params.search, mode: "insensitive" } },
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
      orderBy: { updatedAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: items.map((c) => ({
      ...c,
      assignedStaff: c.assignedStaff
        ? {
            id: c.assignedStaff.id,
            name: staffDisplayName(c.assignedStaff.email),
          }
        : null,
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
    data: { status: params.status },
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
