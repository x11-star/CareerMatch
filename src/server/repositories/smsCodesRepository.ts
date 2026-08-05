import type { Prisma } from '@prisma/client';
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type CreateSmsCodeInput = Pick<Prisma.SmsCodeCreateInput, 'phone' | 'codeHash' | 'purpose' | 'expiresAt'>;

export function createSmsCode(input: CreateSmsCodeInput) {
  return runDb(() => prisma.smsCode.create({ data: input }));
}

export function findLatestSmsCode(phone: string, purpose: string) {
  return runDb(() => prisma.smsCode.findFirst({
    where: { phone, purpose },
    orderBy: { createdAt: 'desc' },
  }));
}

export function markSmsCodeConsumed(id: string) {
  return runDb(() => prisma.smsCode.update({
    where: { id },
    data: { consumedAt: new Date() },
  }));
}

export function incrementSmsCodeAttempts(id: string) {
  return runDb(() => prisma.smsCode.update({
    where: { id },
    data: { attempts: { increment: 1 } },
  }));
}
