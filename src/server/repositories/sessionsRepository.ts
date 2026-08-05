import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type CreateSessionInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export function createSession(input: CreateSessionInput) {
  return runDb(() => prisma.session.create({ data: input }));
}

export function findSessionByTokenHash(tokenHash: string) {
  return runDb(() => prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  }));
}

export function touchSession(tokenHash: string, seenAt = new Date()) {
  return runDb(() => prisma.session.update({
    where: { tokenHash },
    data: { lastSeenAt: seenAt },
  }));
}

export function deleteSessionByTokenHash(tokenHash: string) {
  return runDb(() => prisma.session.delete({ where: { tokenHash } }));
}

export function deleteExpiredSessions(now = new Date()) {
  return runDb(() => prisma.session.deleteMany({
    where: { expiresAt: { lt: now } },
  }));
}
