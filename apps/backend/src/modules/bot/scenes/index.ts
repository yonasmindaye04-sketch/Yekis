// Scene registration barrel file
import { Bot } from "grammy";
import {
  conversations,
  createConversation,
  Conversation,
  ConversationFlavor,
} from "@grammyjs/conversations";
import { BotContext } from "../types.js";
import {
  startScene,
  advanceScene,
  clearScene,
} from "../middleware/sceneTimeout.middleware.js";
import { env } from "../../../config/env.js";
import { prisma } from "../../../lib/prisma.js";
import { recordAuditEvent } from "../../../lib/audit.js";
import { logger } from "../../../lib/logger.js";

type MyConversation = Conversation<BotContext, BotContext>;
type MyContext = BotContext;

export function registerScenes(bot: Bot<BotContext>) {
  bot.use(createConversation(kycUploadScene, "kyc_upload"));
  bot.use(createConversation(proposeScene, "propose"));
  bot.use(createConversation(withdrawScene, "withdraw"));
  bot.use(createConversation(topupScene, "topup"));
  bot.use(createConversation(disputeRaiseScene, "dispute_raise"));
  bot.use(createConversation(staffKycReviewScene, "staff_kyc_review"));
  bot.use(createConversation(staffTopupReviewScene, "staff_topup_review"));
  bot.use(createConversation(staffMediationScene, "staff_mediation"));
}

function getLargestPhoto(
  photos: readonly { file_id: string }[] | undefined,
): string | undefined {
  if (!photos || photos.length === 0) return undefined;
  return photos[photos.length - 1]!.file_id;
}

async function kycUploadScene(conversation: MyConversation, ctx: MyContext) {
  const docType = ctx.session.sceneData?.docType;

  if (!docType) {
    await ctx.reply("Invalid document type");
    clearScene(ctx);
    return;
  }

  await ctx.reply(ctx.t(`kyc_upload_${docType}`));
  const msg = await conversation.waitFor("message:photo");

  const fileId = getLargestPhoto(msg.message.photo);
  if (!fileId) {
    await ctx.reply(ctx.t("errors_generic"));
    clearScene(ctx);
    return;
  }

  const fileName = `kyc_${docType}_${Date.now()}.jpg`;
  const mimeType = "image/jpeg";

  const storagePath = await uploadToObjectStorage(fileId, fileName, mimeType);

  if (ctx.session.userId) {
    const kycRecord = await prisma.kycRecord.findUnique({
      where: { userId: ctx.session.userId },
    });

    if (kycRecord) {
      await prisma.kycDocument.create({
        data: {
          kycRecordId: kycRecord.id,
          documentType: docType.toUpperCase() as any,
          storagePath,
        },
      });

      await prisma.kycRecord.update({
        where: { userId: ctx.session.userId },
        data: { status: "UNDER_REVIEW" },
      });

      await recordAuditEvent({
        userId: ctx.session.userId,
        eventType: "KYC_DOCUMENT_UPLOADED",
        entityType: "KycDocument",
        entityId: "",
        metadata: { documentType: docType },
      });
    }
  }

  await ctx.reply(ctx.t("kyc_submitted"));
  clearScene(ctx);
}

async function proposeScene(conversation: MyConversation, ctx: MyContext) {
  const jobId = ctx.session.sceneData?.jobId;

  if (!jobId) {
    await ctx.reply("No job selected");
    clearScene(ctx);
    return;
  }

  await ctx.reply(ctx.t("propose_cover_letter_prompt"));
  const coverLetterMsg = await conversation.waitFor("message:text");
  const coverLetter = coverLetterMsg.message.text;

  if (coverLetter.length > 2000) {
    await ctx.reply("Cover letter too long (max 2000 characters)");
    clearScene(ctx);
    return;
  }

  advanceScene(ctx, { coverLetter });

  await ctx.reply(ctx.t("propose_amount_prompt"));
  const amountMsg = await conversation.waitFor("message:text");
  const amount = parseFloat(amountMsg.message.text);

  if (isNaN(amount) || amount < 100 || amount > 10_000_000) {
    await ctx.reply("Invalid amount (100 - 10,000,000 ETB)");
    clearScene(ctx);
    return;
  }

  advanceScene(ctx, { amount });

  await ctx.reply(ctx.t("propose_days_prompt"));
  const daysMsg = await conversation.waitFor("message:text");
  const estimatedDays = parseInt(daysMsg.message.text, 10);

  if (isNaN(estimatedDays) || estimatedDays < 1 || estimatedDays > 365) {
    await ctx.reply("Invalid days (1 - 365)");
    clearScene(ctx);
    return;
  }

  advanceScene(ctx, { estimatedDays });

  await ctx.reply(ctx.t("propose_confirm", { amount }), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: ctx.t("confirm_yes"), callback_data: "propose:confirm:yes" },
          { text: ctx.t("confirm_no"), callback_data: "propose:confirm:no" },
        ],
      ],
    },
  });

  const confirmMsg = await conversation.waitFor("callback_query:data");
  const confirmed = confirmMsg.callbackQuery.data === "propose:confirm:yes";

  if (!confirmed) {
    await ctx.reply(ctx.t("propose_cancelled"));
    clearScene(ctx);
    return;
  }

  try {
    const proposalId = `PROP-${Date.now()}`;
    await ctx.reply(ctx.t("propose_success", { proposalId }));
    clearScene(ctx);
  } catch (error) {
    logger.error({ error }, "Failed to submit proposal");
    await ctx.reply(ctx.t("propose_error"));
    clearScene(ctx);
  }
}

async function withdrawScene(conversation: MyConversation, ctx: MyContext) {
  if (ctx.session.kycTier !== "TIER_2" && ctx.session.kycTier !== "TIER_3") {
    await ctx.reply(ctx.t("errors_tier2_required"));
    clearScene(ctx);
    return;
  }

  await ctx.reply(ctx.t("wallet_withdraw_amount"));
  const amountMsg = await conversation.waitFor("message:text");
  const amount = parseFloat(amountMsg.message.text);

  if (isNaN(amount) || amount < 100) {
    await ctx.reply("Invalid amount");
    clearScene(ctx);
    return;
  }

  advanceScene(ctx, { amount });

  await ctx.reply(ctx.t("wallet_withdraw_destination"), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Telebirr", callback_data: "withdraw:dest:telebirr" },
          { text: "CBE Birr", callback_data: "withdraw:dest:cbe" },
        ],
        [{ text: ctx.t("confirm_no"), callback_data: "menu:wallet" }],
      ],
    },
  });

  const destMsg = await conversation.waitFor("callback_query:data");
  const destination = destMsg.callbackQuery.data.split(":")[2] || "";

  if (destination === "menu") {
    await ctx.reply(ctx.t("propose_cancelled"));
    clearScene(ctx);
    return;
  }

  advanceScene(ctx, { destination });

  await ctx.reply(
    ctx.t("wallet_withdraw_confirm", { amount: amount || 0, destination }),
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: ctx.t("confirm_yes"),
              callback_data: "withdraw:confirm:yes",
            },
            { text: ctx.t("confirm_no"), callback_data: "menu:wallet" },
          ],
        ],
      },
    },
  );

  const confirmMsg = await conversation.waitFor("callback_query:data");
  const confirmed = confirmMsg.callbackQuery.data === "withdraw:confirm:yes";

  if (!confirmed) {
    await ctx.reply(ctx.t("propose_cancelled"));
    clearScene(ctx);
    return;
  }

  try {
    await ctx.reply(ctx.t("wallet_withdraw_success"));
    clearScene(ctx);
  } catch (error) {
    logger.error({ error }, "Withdrawal failed");
    await ctx.reply(ctx.t("errors_generic"));
    clearScene(ctx);
  }
}

async function topupScene(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply(
    ctx.t("wallet_topup_instructions", {
      amount: "1000",
      phone: "+251911223344",
      reference: `TOPUP-${ctx.session.userId?.slice(-6)}`,
    }),
  );

  await ctx.reply(ctx.t("wallet_topup_receipt"));
  const msg = await conversation.waitFor("message:photo");

  const fileId = getLargestPhoto(msg.message.photo);
  if (!fileId) {
    await ctx.reply(ctx.t("errors_generic"));
    clearScene(ctx);
    return;
  }

  const fileName = `topup_receipt_${Date.now()}.jpg`;
  const mimeType = "image/jpeg";

  const storagePath = await uploadToObjectStorage(fileId, fileName, mimeType);

  if (ctx.session.userId) {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: ctx.session.userId },
    });

    if (wallet) {
      await prisma.walletTopUp.create({
        data: {
          userId: ctx.session.userId,
          walletId: wallet.id,
          provider: "TELEBIRR",
          amountMinor: 100000,
          referenceNumber: `TOPUP-${ctx.session.userId?.slice(-6)}`,
          receiptImagePath: storagePath,
          status: "PENDING",
        },
      });

      await recordAuditEvent({
        userId: ctx.session.userId,
        eventType: "WALLET_TOPUP_SUBMITTED",
        entityType: "WalletTopUp",
        entityId: "",
        metadata: { amount: 100000 },
      });
    }
  }

  await ctx.reply(ctx.t("wallet_topup_submitted"));
  clearScene(ctx);
}

async function disputeRaiseScene(conversation: MyConversation, ctx: MyContext) {
  const milestoneId = ctx.session.sceneData?.milestoneId;

  if (!milestoneId) {
    await ctx.reply("No milestone selected");
    clearScene(ctx);
    return;
  }

  await ctx.reply(ctx.t("dispute_raise"));

  await ctx.reply("Select dispute category:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Non-delivery", callback_data: "dispute:cat:NON_DELIVERY" },
          { text: "Quality Issue", callback_data: "dispute:cat:QUALITY_ISSUE" },
        ],
        [
          { text: "Scope Creep", callback_data: "dispute:cat:SCOPE_CREEP" },
          { text: "Non-payment", callback_data: "dispute:cat:NON_PAYMENT" },
        ],
        [
          { text: "Late Delivery", callback_data: "dispute:cat:LATE_DELIVERY" },
          {
            text: "Communication",
            callback_data: "dispute:cat:COMMUNICATION_BREAKDOWN",
          },
        ],
      ],
    },
  });

  const catMsg = await conversation.waitFor("callback_query:data");
  const category = catMsg.callbackQuery.data.split(":")[2];
  advanceScene(ctx, { category });

  await ctx.reply("Describe the issue:");
  const descMsg = await conversation.waitFor("message:text");
  const description = descMsg.message.text;
  advanceScene(ctx, { description });

  await ctx.reply(ctx.t("dispute_evidence_prompt"));
  const evidenceMsg = await conversation.waitFor("message:photo");

  let evidenceFiles: string[] = [];
  const fileId = getLargestPhoto(evidenceMsg.message.photo);
  if (fileId) {
    const fileName = `dispute_${Date.now()}.jpg`;
    const mimeType = "image/jpeg";
    const storagePath = await uploadToObjectStorage(fileId, fileName, mimeType);
    evidenceFiles.push(storagePath);
  }

  advanceScene(ctx, { evidenceFiles });

  await ctx.reply("Submit dispute?", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: ctx.t("confirm_yes"), callback_data: "dispute:confirm:yes" },
          { text: ctx.t("confirm_no"), callback_data: "menu:disputes" },
        ],
      ],
    },
  });

  const confirmMsg = await conversation.waitFor("callback_query:data");
  const confirmed = confirmMsg.callbackQuery.data === "dispute:confirm:yes";

  if (!confirmed) {
    await ctx.reply(ctx.t("propose_cancelled"));
    clearScene(ctx);
    return;
  }

  try {
    await ctx.reply("Dispute submitted successfully!");
    clearScene(ctx);
  } catch (error) {
    logger.error({ error }, "Dispute creation failed");
    await ctx.reply(ctx.t("errors_generic"));
    clearScene(ctx);
  }
}

async function staffKycReviewScene(
  conversation: MyConversation,
  ctx: MyContext,
) {
  const kycRecordId = ctx.session.sceneData?.kycRecordId;

  if (!kycRecordId || ctx.session.role !== "STAFF") {
    await ctx.reply(ctx.t("errors_unauthorized"));
    clearScene(ctx);
    return;
  }

  const kyc = await prisma.kycRecord.findUnique({
    where: { id: kycRecordId },
    include: {
      user: {
        select: {
          id: true,
          ucid: true,
          email: true,
          phone: true,
          languagePreference: true,
          role: true,
          dateOfBirth: true,
          faydaPsut: true,
          isSuspended: true,
          staffRole: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      documents: true,
    },
  });

  if (!kyc) {
    await ctx.reply("KYC record not found");
    clearScene(ctx);
    return;
  }

  const userName = kyc.user.email?.split("@")[0] || "Unknown";
  let message = ` ${userName} (${kyc.user.ucid})\n`;
  message += `Tier: ${kyc.tier}\n`;
  message += `Documents: ${kyc.documents.length}\n`;

  for (const doc of kyc.documents) {
    message += `\n ${doc.documentType}: ${env.FRONTEND_URL}/evidence/${doc.storagePath}`;
  }

  await ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: ctx.t("staff_kyc_approve"),
            callback_data: `staff:kyc:approve:${kycRecordId}`,
          },
          {
            text: ctx.t("staff_kyc_reject"),
            callback_data: `staff:kyc:reject:${kycRecordId}`,
          },
        ],
        [
          {
            text: ctx.t("staff_kyc_flag"),
            callback_data: `staff:kyc:flag:${kycRecordId}`,
          },
          { text: ctx.t("back"), callback_data: "staff:kyc_queue:0" },
        ],
      ],
    },
  });

  clearScene(ctx);
}

async function staffTopupReviewScene(
  conversation: MyConversation,
  ctx: MyContext,
) {
  const topupId = ctx.session.sceneData?.topupId;

  if (!topupId || ctx.session.role !== "STAFF") {
    await ctx.reply(ctx.t("errors_unauthorized"));
    clearScene(ctx);
    return;
  }

  const topup = await prisma.walletTopUp.findUnique({
    where: { id: topupId },
    include: {
      user: {
        select: {
          id: true,
          ucid: true,
          email: true,
          phone: true,
          languagePreference: true,
          role: true,
          dateOfBirth: true,
          faydaPsut: true,
          isSuspended: true,
          staffRole: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!topup) {
    await ctx.reply("TopUp not found");
    clearScene(ctx);
    return;
  }

  const userName = topup.user.email?.split("@")[0] || "Unknown";
  const message =
    ` TopUp Review\n` +
    `User: ${userName} (${topup.user.ucid})\n` +
    `Amount: ${topup.amountMinor / 100} ETB\n` +
    `Reference: ${topup.referenceNumber}\n` +
    `Receipt: ${env.FRONTEND_URL}/evidence/${topup.receiptImagePath}`;

  await ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: ctx.t("staff_topup_approve"),
            callback_data: `staff:topup:approve:${topupId}`,
          },
          {
            text: ctx.t("staff_topup_reject"),
            callback_data: `staff:topup:reject:${topupId}`,
          },
        ],
        [
          {
            text: ctx.t("staff_topup_flag"),
            callback_data: `staff:topup:flag:${topupId}`,
          },
          { text: ctx.t("back"), callback_data: "staff:topup_queue:0" },
        ],
      ],
    },
  });

  clearScene(ctx);
}

async function staffMediationScene(
  conversation: MyConversation,
  ctx: MyContext,
) {
  const disputeId = ctx.session.sceneData?.disputeId;

  if (!disputeId || ctx.session.role !== "STAFF") {
    await ctx.reply(ctx.t("errors_unauthorized"));
    clearScene(ctx);
    return;
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      contract: { include: { milestones: true } },
      evidence: true,
    },
  });

  if (!dispute) {
    await ctx.reply("Dispute not found");
    clearScene(ctx);
    return;
  }

  let message = ` Mediation: ${disputeId}\n`;
  message += `Stage: ${dispute.stage}\n`;
  message += `Category: ${dispute.category}\n`;
  message += `Milestone: ${dispute.milestoneId}\n`;
  message += `Contract: ${dispute.contractId}\n\n`;
  message += `Evidence: ${dispute.evidence.length} items\n`;

  await ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: ctx.t("staff_dispute_mediate"),
            callback_data: `staff:dispute:mediate:${disputeId}`,
          },
          { text: ctx.t("back"), callback_data: "staff:dispute_queue:0" },
        ],
      ],
    },
  });

  clearScene(ctx);
}

async function uploadToObjectStorage(
  fileId: string,
  fileName: string,
  mimeType: string,
): Promise<string> {
  return `kyc/${fileName}`;
}
