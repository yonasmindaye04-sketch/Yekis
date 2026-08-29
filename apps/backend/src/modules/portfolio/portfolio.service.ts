// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";

// === MAIN FUNCTIONS ===
export async function listPortfolioItems(userId: string) {
  return prisma.portfolioItem.findMany({
    where: { userId, isActive: true },
    orderBy: { displayOrder: "asc" },
  });
}

export async function createPortfolioItem(userId: string, data: any) {
  const count = await prisma.portfolioItem.count({
    where: { userId, isActive: true },
  });

  if (count >= 20) {
    throw new Error("BAD_REQUEST: Maximum portfolio items reached");
  }

  return prisma.portfolioItem.create({
    data: {
      ...data,
      userId,
      isActive: true,
    },
  });
}

export async function updatePortfolioItem(
  userId: string,
  itemId: string,
  data: any,
) {
  const item = await prisma.portfolioItem.findUnique({ where: { id: itemId } });

  if (!item) throw new Error("NOT_FOUND: Item not found");
  if (item.userId !== userId) throw new Error("FORBIDDEN: Not your item");

  return prisma.portfolioItem.update({
    where: { id: itemId },
    data,
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
