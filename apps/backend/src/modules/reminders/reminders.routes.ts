// === IMPORTS ===
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { logger } from "../../lib/logger.js";

export const remindersRouter = Router();

const CreateReminderInput = z.object({
  title: z.string().trim().min(1).max(160),
  dueAt: z.string().datetime(),
  note: z.string().trim().max(500).optional().nullable(),
  contractId: z.string().trim().min(1).max(80).optional().nullable(),
  milestoneId: z.string().trim().min(1).max(80).optional().nullable(),
});

const UpdateReminderInput = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  dueAt: z.string().datetime().optional(),
  note: z.string().trim().max(500).optional().nullable(),
  contractId: z.string().trim().min(1).max(80).optional().nullable(),
  milestoneId: z.string().trim().min(1).max(80).optional().nullable(),
  completed: z.boolean().optional(),
});

remindersRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const items = await prisma.workspaceReminder.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    });
    return res.json(items);
  } catch (err) {
    logger.error({ err }, "GET /reminders failed");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

remindersRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = CreateReminderInput.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }

  try {
    const item = await prisma.workspaceReminder.create({
      data: {
        userId: req.user!.id,
        title: parsed.data.title,
        dueAt: new Date(parsed.data.dueAt),
        note: parsed.data.note ?? null,
        contractId: parsed.data.contractId ?? null,
        milestoneId: parsed.data.milestoneId ?? null,
      },
    });
    return res.status(201).json(item);
  } catch (err) {
    logger.error({ err }, "POST /reminders failed");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

remindersRouter.patch(
  "/:reminderId",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = UpdateReminderInput.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const existing = await prisma.workspaceReminder.findFirst({
        where: { id: req.params.reminderId as string, userId: req.user!.id },
      });
      if (!existing) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }

      const updated = await prisma.workspaceReminder.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.title !== undefined
            ? { title: parsed.data.title }
            : {}),
          ...(parsed.data.dueAt !== undefined
            ? { dueAt: new Date(parsed.data.dueAt) }
            : {}),
          ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
          ...(parsed.data.contractId !== undefined
            ? { contractId: parsed.data.contractId }
            : {}),
          ...(parsed.data.milestoneId !== undefined
            ? { milestoneId: parsed.data.milestoneId }
            : {}),
          ...(parsed.data.completed !== undefined
            ? { completedAt: parsed.data.completed ? new Date() : null }
            : {}),
        },
      });
      return res.json(updated);
    } catch (err) {
      logger.error({ err }, "PATCH /reminders/:reminderId failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

remindersRouter.delete(
  "/:reminderId",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const deleted = await prisma.workspaceReminder.deleteMany({
        where: { id: req.params.reminderId as string, userId: req.user!.id },
      });
      if (deleted.count === 0) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }
      return res.json({ deleted: true });
    } catch (err) {
      logger.error({ err }, "DELETE /reminders/:reminderId failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);
