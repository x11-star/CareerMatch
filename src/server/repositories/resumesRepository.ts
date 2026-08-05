import type { Prisma } from '@prisma/client';
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type CreateResumeInput = Omit<Prisma.ResumeUncheckedCreateInput, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type UpdateResumeInput = Partial<CreateResumeInput>;

export function createResume(userId: string, input: CreateResumeInput) {
  return runDb(() => prisma.resume.create({ data: { ...input, userId } }));
}

export function getLatestResumeByUserId(userId: string) {
  return runDb(() => prisma.resume.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  }));
}

export function getResumeByIdForUser(userId: string, resumeId: string) {
  return runDb(() => prisma.resume.findFirst({
    where: { id: resumeId, userId },
  }));
}

export async function updateLatestResumeByUserId(userId: string, input: UpdateResumeInput) {
  const latest = await getLatestResumeByUserId(userId);
  if (!latest) {
    return null;
  }
  return runDb(() => prisma.resume.update({
    where: { id: latest.id },
    data: input,
  }));
}

export async function deleteLatestResumeByUserId(userId: string) {
  const latest = await getLatestResumeByUserId(userId);
  if (!latest) {
    return null;
  }
  return runDb(() => prisma.resume.delete({ where: { id: latest.id } }));
}
