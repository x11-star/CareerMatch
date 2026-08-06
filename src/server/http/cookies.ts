import type express from 'express';

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'careermatch_session';
const SESSION_TTL_SECONDS = Number(process.env.AUTH_SESSION_TTL_DAYS || 7) * 24 * 60 * 60;

export function readCookie(req: express.Request, name: string) {
  const header = req.headers.cookie || '';
  const pairs = header.split(';').map((part) => part.trim()).filter(Boolean);
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    if (key === name) return decodeURIComponent(valueParts.join('='));
  }
  return null;
}

export function readAuthCookie(req: express.Request) {
  return readCookie(req, AUTH_COOKIE_NAME);
}

export function setAuthCookie(res: express.Response, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`);
}

export function clearAuthCookie(res: express.Response) {
  res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}
