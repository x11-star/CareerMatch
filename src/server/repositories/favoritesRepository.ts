import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export function listFavoritesByUserId(userId: string) {
  return runDb(() => prisma.favorite.findMany({
    where: { userId },
    include: { position: true },
    orderBy: { createdAt: 'desc' },
  }));
}

export function addFavorite(userId: string, positionId: string) {
  return runDb(() => prisma.favorite.upsert({
    where: { userId_positionId: { userId, positionId } },
    create: { userId, positionId },
    update: {},
  }));
}

export function removeFavorite(userId: string, positionId: string) {
  return runDb(() => prisma.favorite.deleteMany({
    where: { userId, positionId },
  }));
}

export async function isFavorite(userId: string, positionId: string) {
  const favorite = await runDb(() => prisma.favorite.findUnique({
    where: { userId_positionId: { userId, positionId } },
    select: { id: true },
  }));
  return Boolean(favorite);
}
