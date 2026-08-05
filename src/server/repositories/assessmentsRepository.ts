import type { Prisma } from '@prisma/client';
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type CreateAssessmentInput = Omit<Prisma.AssessmentUncheckedCreateInput, 'id' | 'userId' | 'createdAt'>;

export function createAssessment(userId: string, input: CreateAssessmentInput) {
  return runDb(() => prisma.assessment.create({ data: { ...input, userId } }));
}

export function getLatestAssessmentByUserId(userId: string) {
  return runDb(() => prisma.assessment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  }));
}

export function getAssessmentByIdForUser(userId: string, assessmentId: string) {
  return runDb(() => prisma.assessment.findFirst({
    where: { id: assessmentId, userId },
  }));
}

export async function deleteLatestAssessmentByUserId(userId: string) {
  const latest = await getLatestAssessmentByUserId(userId);
  if (!latest) {
    return null;
  }
  return runDb(() => prisma.assessment.delete({ where: { id: latest.id } }));
}
