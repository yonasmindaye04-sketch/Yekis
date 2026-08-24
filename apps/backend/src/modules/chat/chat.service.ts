// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { randomInt } from "node:crypto";


// === MAIN FUNCTIONS ===
export class ConversationNotFoundError extends Error {}
export class ConversationAccessError extends Error {}
export class InvalidMessageError extends Error {}

const STAFF_SELECT = { id: true, email: true, staffRole: true, role: true };

export async function createGuestConversation(params: { email: string; body: string }) {
  const email = params.email.trim().toLowerCase();
  const body = params.body.trim();
  if (!email.includes("@")) throw new InvalidMessageError("Enter a valid email address.");
  if (body.length < 1 || body.length > 5000) throw new InvalidMessageError("Message must be between 1 and 5,000 characters.");

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

  const conversation = await prisma.conversation.create({
    data: {
      creatorId: user.id,
      subject: "Website support request",
      assignedStaffId: assignedStaff?.id ?? null,
      participants: { create: { userId: user.id } },
      messages: { create: { senderId: user.id, body } },
    },
    include: { assignedStaff: { select: STAFF_SELECT } },
  });

  return {
    id: conversation.id,
    subject: conversation.subject,
    status: conversation.status,
    assignedStaff: conversation.assignedStaff
      ? { id: conversation.assignedStaff.id, name: staffDisplayName(conversation.assignedStaff.email) }
      : null,
  };
}

/** Pick the staff member (ADMIN or COMPLIANCE_OFFICER) with fewest open assigned conversations */
async function pickAvailableStaff() {
  const staffUsers = await prisma.user.findMany({
    where: { staffRole: { in: ["ADMIN", "COMPLIANCE_OFFICER"] } },
    select: { id: true, email: true, staffRole: true, _count: { select: { conversationsAssigned: { where: { status: "OPEN" } } } } },
    orderBy: { conversationsAssigned: { _count: "asc" } },
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
      participants: { where: { userId }, select: { id: true, lastReadAt: true } },
      assignedStaff: { select: STAFF_SELECT },
    },
  });
  if (!conversation) throw new ConversationNotFoundError();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { staffRole: true } });
  const isStaff = user?.staffRole === "ADMIN" || user?.staffRole === "COMPLIANCE_OFFICER";

  // Staff can only access conversations assigned to them (unless ADMIN can see all)
  if (isStaff) {
    const isAdmin = user?.staffRole === "ADMIN";
    const isAssigned = conversation.assignedStaffId === userId;
    if (!isAdmin && !isAssigned) throw new ConversationAccessError();
  } else {
    if (!conversation.participants.length) throw new ConversationAccessError();
  }

  return { conversation, isStaff };
}

export async function createConversation(params: { userId: string; subject: string }) {
  const subject = params.subject.trim();
  if (subject.length < 3 || subject.length > 160) throw new InvalidMessageError("Subject must be between 3 and 160 characters.");

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

  await recordAuditEvent({ userId: params.userId, eventType: "SUPPORT_CONVERSATION_CREATED", entityType: "Conversation", entityId: conversation.id });
  return {
    ...conversation,
    assignedStaff: conversation.assignedStaff
      ? { id: conversation.assignedStaff.id, name: staffDisplayName(conversation.assignedStaff.email) }
      : null,
  };
}

export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { where: { userId }, select: { lastReadAt: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true, senderId: true } },
      assignedStaff: { select: STAFF_SELECT },
    },
    orderBy: { updatedAt: "desc" },
  });

  return conversations.map((conversation) => {
    const lastReadAt = conversation.participants[0]?.lastReadAt;
    const latestMessage = conversation.messages[0] ?? null;
    return {
      id: conversation.id,
      subject: conversation.subject,
      status: conversation.status,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      latestMessage,
      unread: Boolean(latestMessage && latestMessage.senderId !== userId && (!lastReadAt || latestMessage.createdAt > lastReadAt)),
      assignedStaff: conversation.assignedStaff
        ? { id: conversation.assignedStaff.id, name: staffDisplayName(conversation.assignedStaff.email) }
        : null,
    };
  });
}

export async function listMessages(params: { conversationId: string; userId: string }) {
  await getConversationAccess(params.conversationId, params.userId);
  return prisma.chatMessage.findMany({
    where: { conversationId: params.conversationId },
    include: { sender: { select: { id: true, role: true, staffRole: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendMessage(params: { conversationId: string; userId: string; body: string; attachmentUrl?: string }) {
  const body = params.body.trim();
  if (body.length < 1 || body.length > 5000) throw new InvalidMessageError("Message must be between 1 and 5,000 characters.");
  const { conversation, isStaff } = await getConversationAccess(params.conversationId, params.userId);

  await prisma.$transaction(async (tx) => {
    if (isStaff && !conversation.participants.find((p: { id: string }) => p.id)) {
      await tx.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId: params.userId } },
        create: { conversationId: conversation.id, userId: params.userId },
        update: {},
      });
    }
    await tx.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: params.userId,
        body,
        ...(params.attachmentUrl ? { attachmentUrl: params.attachmentUrl } : {}),
      },
    });
    await tx.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
  });

  return prisma.chatMessage.findFirstOrThrow({
    where: { conversationId: conversation.id, senderId: params.userId },
    orderBy: { createdAt: "desc" },
    include: { sender: { select: { id: true, role: true, staffRole: true } } },
  });
}

export async function markConversationRead(params: { conversationId: string; userId: string }) {
  const { conversation } = await getConversationAccess(params.conversationId, params.userId);
  await prisma.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId: conversation.id, userId: params.userId } },
    create: { conversationId: conversation.id, userId: params.userId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
  return { ok: true };
}

export async function listStaffConversations(params?: { page?: number; limit?: number; search?: string; status?: string; staffId?: string }) {
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
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true } },
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
        ? { id: c.assignedStaff.id, name: staffDisplayName(c.assignedStaff.email) }
        : null,
    })),
    total,
    page,
    pageSize: limit,
  };
}

export async function setConversationStatus(params: { conversationId: string; status: "OPEN" | "CLOSED" }) {
  const conversation = await prisma.conversation.findUnique({ where: { id: params.conversationId } });
  if (!conversation) throw new ConversationNotFoundError();
  return prisma.conversation.update({
    where: { id: params.conversationId },
    data: { status: params.status },
    include: { creator: { select: { id: true, email: true, role: true } }, assignedStaff: { select: STAFF_SELECT } },
  });
}

export async function assignConversationToStaff(params: { conversationId: string; staffId: string }) {
  const conversation = await prisma.conversation.findUnique({ where: { id: params.conversationId } });
  if (!conversation) throw new ConversationNotFoundError();

  const staff = await prisma.user.findUnique({ where: { id: params.staffId }, select: { id: true, staffRole: true } });
  if (!staff?.staffRole) throw new ConversationAccessError();

  return prisma.conversation.update({
    where: { id: params.conversationId },
    data: { assignedStaffId: params.staffId },
    include: { creator: { select: { id: true, email: true, role: true } }, assignedStaff: { select: STAFF_SELECT } },
  });
}
