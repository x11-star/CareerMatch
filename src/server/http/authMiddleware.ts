import type express from 'express';
import { defaultAuthService } from '../auth/authService';
import { readAuthCookie } from './cookies';
import { HttpError } from './errors';

export async function getOptionalAuth(req: express.Request) {
  const token = readAuthCookie(req);
  if (!token) return null;
  return defaultAuthService.getSessionUser(token);
}

export async function requireAuth(req: express.Request) {
  const user = await getOptionalAuth(req);
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', '请先登录');
  return user;
}
