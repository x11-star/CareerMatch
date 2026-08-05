import type { Prisma } from '@prisma/client';
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type CachedMatchResultInput = {
  userId: string;
  resumeId: string;
  assessmentId: string;
  positionId: string;
  resumeHash: string;
  assessmentHash: string;
};

export type CreateMatchResultInput = Omit<Prisma.MatchResultUncheckedCreateInput, 'id' | 'createdAt'>;

export function findCachedMatchResult(input: CachedMatchResultInput) {
  return runDb(() => prisma.matchResult.findUnique({
    where: {
      userId_resumeId_assessmentId_positionId_resumeHash_assessmentHash: input,
    },
  }));
}

export function createMatchResult(input: CreateMatchResultInput) {
  return runDb(() => prisma.matchResult.create({ data: input }));
}
