// === IMPORTS ===
import { Router } from "express";
import {
  CreateGigInput,
  UpdateGigInput,
  GigSearchQuery,
  CreateGigOrderInput,
  SubmitGigDeliveryInput,
  RequestGigRevisionInput,
  CreateGigReviewInput,
} from "@marketplace/schemas";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requireKycVerified } from "../../middleware/hardBlock.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import {
  createGig,
  searchGigs,
  getGigById,
  updateGig,
  setGigStatus,
  listMyGigs,
  createGigOrder,
  fundGigOrderFromWallet,
  submitGigDelivery,
  requestGigRevision,
  acceptGigOrder,
  createGigReview,
  GigForbiddenError,
  GigNotFoundError,
  GigPackageNotFoundError,
  GigOrderNotFoundError,
  GigInvalidStateError,
  GigNotPartyError,
  GigInsufficientBalanceError,
} from "./gig.service.js";

export const gigsRouter = Router();

async function currentUserRole(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true },
  });
  return user.role;
}

function handleKnownErrors(err: unknown, res: import("express").Response): boolean {
  if (err instanceof GigForbiddenError || err instanceof GigNotPartyError) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
    return true;
  }
  if (
    err instanceof GigNotFoundError ||
    err instanceof GigPackageNotFoundError ||
    err instanceof GigOrderNotFoundError
  ) {
    res.status(404).json({ error: "NOT_FOUND", message: err.message });
    return true;
  }
  if (err instanceof GigInvalidStateError) {
    res.status(409).json({ error: "CONFLICT", message: err.message });
    return true;
  }
  if (err instanceof GigInsufficientBalanceError) {
    res.status(422).json({ error: "INSUFFICIENT_BALANCE", message: err.message });
    return true;
  }
  return false;
}

// ---------- Gig discovery (public) ----------
gigsRouter.get("/search", async (req, res) => {
  const parsed = GigSearchQuery.safeParse(req.query);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  try {
    return res.json(await searchGigs(parsed.data));
  } catch (err) {
    logger.error({ err }, "Gig search failed");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

gigsRouter.get("/mine", requireAuth, async (req: AuthedRequest, res) => {
  return res.json(await listMyGigs(req.user!.id));
});

gigsRouter.get("/:gigId", async (req, res) => {
  try {
    return res.json(await getGigById(req.params.gigId as string));
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Gig fetch failed");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------- Gig CRUD (freelancer) ----------
gigsRouter.post(
  "/",
  requireAuth,
  requireKycVerified("TIER_1"),
  async (req: AuthedRequest, res) => {
    const parsed = CreateGigInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      const role = await currentUserRole(req.user!.id);
      const gig = await createGig({
        freelancerId: req.user!.id,
        freelancerRole: role,
        input: parsed.data,
      });
      return res.status(201).json(gig);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig creation failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.patch(
  "/:gigId",
  requireAuth,
  requireKycVerified("TIER_1"),
  async (req: AuthedRequest, res) => {
    const parsed = UpdateGigInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      const gig = await updateGig({
        ownerId: req.user!.id,
        gigId: req.params.gigId as string,
        input: parsed.data,
      });
      return res.json(gig);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig update failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.post(
  "/:gigId/status",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const status = req.body?.status;
    if (
      status !== "ACTIVE" &&
      status !== "PAUSED" &&
      status !== "ARCHIVED" &&
      status !== "REJECTED"
    ) {
      return res.status(400).json({ error: "VALIDATION_ERROR" });
    }
    try {
      const gig = await setGigStatus({
        ownerId: req.user!.id,
        gigId: req.params.gigId as string,
        status,
      });
      return res.json(gig);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig status change failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- Gig orders ----------
gigsRouter.post(
  "/orders",
  requireAuth,
  requireKycVerified("TIER_1"),
  async (req: AuthedRequest, res) => {
    const parsed = CreateGigOrderInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      const order = await createGigOrder({
        clientId: req.user!.id,
        input: parsed.data,
      });
      return res.status(201).json(order);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig order creation failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.post(
  "/orders/:orderId/fund",
  requireAuth,
  requireKycVerified("TIER_1"),
  async (req: AuthedRequest, res) => {
    try {
      const order = await fundGigOrderFromWallet({
        clientId: req.user!.id,
        orderId: req.params.orderId as string,
      });
      return res.json(order);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig order funding failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.post(
  "/orders/:orderId/submit",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = SubmitGigDeliveryInput.safeParse(req.body ?? {});
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      const order = await submitGigDelivery({
        freelancerId: req.user!.id,
        orderId: req.params.orderId as string,
        deliverableUrl: parsed.data.deliverableUrl,
      });
      return res.json(order);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig delivery submission failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.post(
  "/orders/:orderId/revision",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = RequestGigRevisionInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      const order = await requestGigRevision({
        clientId: req.user!.id,
        orderId: req.params.orderId as string,
        note: parsed.data.note,
      });
      return res.json(order);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig revision request failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.post(
  "/orders/:orderId/accept",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const order = await acceptGigOrder({
        clientId: req.user!.id,
        orderId: req.params.orderId as string,
      });
      return res.json(order);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig order accept failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.post(
  "/orders/:orderId/review",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = CreateGigReviewInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      const review = await createGigReview({
        authorId: req.user!.id,
        orderId: req.params.orderId as string,
        input: parsed.data,
      });
      return res.status(201).json(review);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Gig review creation failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

gigsRouter.get(
  "/orders/:orderId",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const order = await prisma.gigOrder.findUnique({
        where: { id: req.params.orderId as string },
        include: { gig: { include: { packages: true } }, package: true },
      });
      if (!order) return res.status(404).json({ error: "NOT_FOUND" });
      const isParty =
        order.clientId === req.user!.id || order.gig.freelancerId === req.user!.id;
      if (!isParty) return res.status(403).json({ error: "FORBIDDEN" });
      return res.json(order);
    } catch (err) {
      logger.error({ err }, "Gig order fetch failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

export default gigsRouter;