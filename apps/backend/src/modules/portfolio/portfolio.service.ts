// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import type {
  CreatePortfolioItemInput,
  UpdatePortfolioItemInput,
} from "../../schemas";

// === TYPES ===
/** Hard cap from the product rules; unchanged by F-17. */
const MAX_ITEMS_PER_USER = 20;

// === MAIN FUNCTIONS ===
export async function listPortfolioItems(userId: string) {
  return prisma.portfolioItem.findMany({
    where: { userId, isActive: true },
    orderBy: { displayOrder: "asc" },
  });
}

/**
 * F-17: builds the Prisma `data` object field by field from already-validated
 * input. Never spreads a request body.
 *
 * `userId` and `isActive` are set here, not taken from the caller, so they
 * cannot be reassigned. `id` and the timestamps are never writable at all.
 */
export async function createPortfolioItem(
  userId: string,
  data: CreatePortfolioItemInput,
) {
  const count = await prisma.portfolioItem.count({
    where: { userId, isActive: true },
  });

  if (count >= MAX_ITEMS_PER_USER) {
    throw new Error("BAD_REQUEST: Maximum portfolio items reached");
  }

  return prisma.portfolioItem.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      thumbnailUrl: data.thumbnailUrl ?? null,
      projectUrl: data.projectUrl ?? null,
      displayOrder: data.displayOrder ?? 0,
      userId,
      isActive: true,
    },
  });
}

/**
 * F-17: the ownership check below protected the ITEM but not its FIELDS â€” the
 * whole body was passed to `update`, so `{"userId": "<someone else>"}` moved the
 * item to another account. Only explicitly named columns are written now.
 *
 * Only keys actually present in the parsed input are included, so a partial
 * PATCH leaves everything else untouched.
 */
export async function updatePortfolioItem(
  userId: string,
  itemId: string,
  data: UpdatePortfolioItemInput,
) {
  const item = await prisma.portfolioItem.findUnique({ where: { id: itemId } });

  if (!item) throw new Error("NOT_FOUND: Item not found");
  if (item.userId !== userId) throw new Error("FORBIDDEN: Not your item");

  const update: {
    title?: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    projectUrl?: string | null;
    displayOrder?: number;
  } = {};

  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description ?? null;
  if (data.thumbnailUrl !== undefined) update.thumbnailUrl = data.thumbnailUrl ?? null;
  if (data.projectUrl !== undefined) update.projectUrl = data.projectUrl ?? null;
  if (data.displayOrder !== undefined) update.displayOrder = data.displayOrder;

  return prisma.portfolioItem.update({
    where: { id: itemId },
    data: update,
  });
}

export async function deletePortfolioItem(userId: string, itemId: string) {
  const item = await prisma.portfolioItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("NOT_FOUND: Item not found");
  if (item.userId !== userId) throw new Error("FORBIDDEN: Not your item");

  return prisma.portfolioItem.update({
    where: { id: itemId },
    data: { isActive: false },
  });
}