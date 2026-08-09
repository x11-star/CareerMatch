import type { User } from '@prisma/client';
import { createSessionToken, hashSessionToken, hashSmsCode, safeEqualHash } from './hash';
import { createSmsSenderFromEnv, nextSmsCode, type SmsSender, type SmsPurpose } from './smsSender';
import { HttpError } from '../http/errors';
import { UniqueConstraintError, RecordNotFoundError } from '../db/errors';
import { createSmsCode, findLatestSmsCode, incrementSmsCodeAttempts, markSmsCodeConsumed } from '../repositories/smsCodesRepository';
import { createSession, deleteSessionByTokenHash, findSessionByTokenHash, touchSession } from '../repositories/sessionsRepository';
import { deleteUser, findUserByPhone, updateUserPhone, upsertUserByPhone } from '../repositories/usersRepository';

const PHONE_PATTERN = /^1\d{10}$/;
const CODE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = Number(process.env.AUTH_SESSION_TTL_DAYS || 7) * 24 * 60 * 60 * 1000;
const SEND_INTERVAL_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

type AuthOptions = { smsSender?: SmsSender; now?: () => Date };

export function createAuthService(options: AuthOptions = {}) {
  const smsSender = options.smsSender || createSmsSenderFromEnv();
  const now = options.now || (() => new Date());

  return {
    async requestLoginCode(phone: string, purpose: SmsPurpose = 'login') {
      if (!PHONE_PATTERN.test(phone)) throw new HttpError(400, 'INVALID_PHONE', '请输入有效的手机号');
      const latest = await findLatestSmsCode(phone, purpose);
      const current = now();
      if (latest && current.getTime() - latest.createdAt.getTime() < SEND_INTERVAL_MS) {
        throw new HttpError(429, 'SMS_CODE_RATE_LIMITED', '验证码发送太频繁，请稍后再试');
      }
      const code = nextSmsCode();
      await createSmsCode({ phone, purpose, codeHash: hashSmsCode(phone, purpose, code), expiresAt: new Date(current.getTime() + CODE_TTL_MS) });
      const sent = await smsSender.sendSmsCode({ phone, purpose, code });
      return { ok: true as const, devCode: sent.devCode, expiresInSeconds: 300 };
    },

    async verifyLoginCode(phone: string, code: string, purpose: SmsPurpose = 'login', metadata: { userAgent?: string | null; ipAddress?: string | null } = {}) {
      if (!PHONE_PATTERN.test(phone)) throw new HttpError(400, 'INVALID_PHONE', '请输入有效的手机号');
      const latest = await findLatestSmsCode(phone, purpose);
      const current = now();
      const invalid = new HttpError(400, 'INVALID_SMS_CODE', '验证码错误或已过期');
      if (!latest || latest.consumedAt || latest.expiresAt.getTime() < current.getTime() || latest.attempts >= MAX_ATTEMPTS) throw invalid;
      const expectedHash = hashSmsCode(phone, purpose, code);
      if (!safeEqualHash(latest.codeHash, expectedHash)) {
        await incrementSmsCodeAttempts(latest.id);
        throw invalid;
      }
      await markSmsCodeConsumed(latest.id);
      const user = await upsertUserByPhone({ phone });
      const sessionToken = createSessionToken();
      await createSession({ userId: user.id, tokenHash: hashSessionToken(sessionToken), expiresAt: new Date(current.getTime() + SESSION_TTL_MS), userAgent: metadata.userAgent, ipAddress: metadata.ipAddress });
      return { user, sessionToken };
    },

    async getSessionUser(sessionToken: string): Promise<User | null> {
      const tokenHash = hashSessionToken(sessionToken);
      const session = await findSessionByTokenHash(tokenHash);
      if (!session || session.expiresAt.getTime() < now().getTime()) return null;
      await touchSession(tokenHash, now());
      return session.user;
    },

    async logout(sessionToken: string) {
      try {
        await deleteSessionByTokenHash(hashSessionToken(sessionToken));
      } catch {
        // Logout remains idempotent from the route perspective.
      }
      return { ok: true as const };
    },

    async requestChangePhoneCode(userId: string, newPhone: string) {
      if (!PHONE_PATTERN.test(newPhone)) throw new HttpError(400, 'INVALID_PHONE', '请输入有效的手机号');
      const owner = await findUserByPhone(newPhone);
      if (owner && owner.id !== userId) throw new HttpError(409, 'PHONE_ALREADY_USED', '该手机号已被其他账号绑定');
      await enforceSendInterval(newPhone, 'change_phone');
      const code = nextSmsCode();
      await createSmsCode({ phone: newPhone, purpose: 'change_phone', codeHash: hashSmsCode(newPhone, 'change_phone', code), expiresAt: new Date(now().getTime() + CODE_TTL_MS) });
      const sent = await smsSender.sendSmsCode({ phone: newPhone, purpose: 'change_phone', code });
      return { ok: true as const, devCode: sent.devCode, expiresInSeconds: 300 };
    },

    async verifyChangePhoneCode(userId: string, newPhone: string, code: string) {
      if (!PHONE_PATTERN.test(newPhone)) throw new HttpError(400, 'INVALID_PHONE', '请输入有效的手机号');
      const latest = await findLatestSmsCode(newPhone, 'change_phone');
      const current = now();
      const invalid = new HttpError(400, 'INVALID_SMS_CODE', '验证码错误或已过期');
      if (!latest || latest.consumedAt || latest.expiresAt.getTime() < current.getTime() || latest.attempts >= MAX_ATTEMPTS) throw invalid;
      const expectedHash = hashSmsCode(newPhone, 'change_phone', code);
      if (!safeEqualHash(latest.codeHash, expectedHash)) {
        await incrementSmsCodeAttempts(latest.id);
        throw invalid;
      }
      await markSmsCodeConsumed(latest.id);
      try {
        await updateUserPhone(userId, newPhone);
      } catch (error) {
        if (error instanceof UniqueConstraintError) throw new HttpError(409, 'PHONE_ALREADY_USED', '该手机号已被其他账号绑定');
        throw error;
      }
      const user = await findUserByPhone(newPhone);
      if (!user) throw new HttpError(404, 'USER_NOT_FOUND', '账号不存在或已注销');
      return { user };
    },

    async requestDeleteAccountCode(userId: string, phone: string) {
      if (!PHONE_PATTERN.test(phone)) throw new HttpError(400, 'INVALID_PHONE', '请输入有效的手机号');
      await enforceSendInterval(phone, 'delete_account');
      const code = nextSmsCode();
      await createSmsCode({ phone, purpose: 'delete_account', codeHash: hashSmsCode(phone, 'delete_account', code), expiresAt: new Date(now().getTime() + CODE_TTL_MS) });
      const sent = await smsSender.sendSmsCode({ phone, purpose: 'delete_account', code });
      return { ok: true as const, devCode: sent.devCode, expiresInSeconds: 300 };
    },

    async verifyDeleteAccountCode(userId: string, phone: string, code: string) {
      if (!PHONE_PATTERN.test(phone)) throw new HttpError(400, 'INVALID_PHONE', '请输入有效的手机号');
      const latest = await findLatestSmsCode(phone, 'delete_account');
      const current = now();
      const invalid = new HttpError(400, 'INVALID_SMS_CODE', '验证码错误或已过期');
      if (!latest || latest.consumedAt || latest.expiresAt.getTime() < current.getTime() || latest.attempts >= MAX_ATTEMPTS) throw invalid;
      const expectedHash = hashSmsCode(phone, 'delete_account', code);
      if (!safeEqualHash(latest.codeHash, expectedHash)) {
        await incrementSmsCodeAttempts(latest.id);
        throw invalid;
      }
      await markSmsCodeConsumed(latest.id);
      try {
        await deleteUser(userId);
      } catch (error) {
        if (error instanceof RecordNotFoundError) throw new HttpError(404, 'USER_NOT_FOUND', '账号不存在或已注销');
        throw error;
      }
      return { ok: true as const };
    },
  };

  async function enforceSendInterval(phone: string, purpose: SmsPurpose) {
    const latest = await findLatestSmsCode(phone, purpose);
    const current = now();
    if (latest && current.getTime() - latest.createdAt.getTime() < SEND_INTERVAL_MS) {
      throw new HttpError(429, 'SMS_CODE_RATE_LIMITED', '验证码发送太频繁，请稍后再试');
    }
  }
}

export const defaultAuthService = createAuthService();
