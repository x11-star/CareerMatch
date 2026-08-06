import type express from 'express';
import { defaultAuthService } from '../auth/authService';
import { clearAuthCookie, readAuthCookie, setAuthCookie } from '../http/cookies';
import { requireAuth } from '../http/authMiddleware';
import { sendHttpError } from '../http/errors';

function publicUser(user: {
  id: string;
  phone: string;
  name: string | null;
  school: string | null;
  major: string | null;
  graduationYear: string | null;
}) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    school: user.school,
    major: user.major,
    graduationYear: user.graduationYear,
  };
}

export function registerAuthRoutes(app: express.Express) {
  app.post('/api/auth/request-code', async (req, res) => {
    try {
      const result = await defaultAuthService.requestLoginCode(String(req.body?.phone || ''), req.body?.purpose || 'login');
      return res.json(result);
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post('/api/auth/verify-code', async (req, res) => {
    try {
      const result = await defaultAuthService.verifyLoginCode(String(req.body?.phone || ''), String(req.body?.code || ''), req.body?.purpose || 'login', {
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
      });
      setAuthCookie(res, result.sessionToken);
      return res.json({ user: publicUser(result.user) });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const token = readAuthCookie(req);
      if (token) await defaultAuthService.logout(token);
      clearAuthCookie(res);
      return res.json({ ok: true });
    } catch (error) {
      clearAuthCookie(res);
      return sendHttpError(res, error);
    }
  });

  app.get('/api/me', async (req, res) => {
    try {
      const user = await requireAuth(req);
      return res.json({ user: publicUser(user) });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });
}
