import type express from 'express';
import { requireAuth } from '../http/authMiddleware';
import { sendHttpError } from '../http/errors';
import { HttpError } from '../http/errors';
import { prisma } from '../db/prisma';
import { normalizePreferences, normalizeCatalogPreferences } from '../../lib/careerPreferences';
import { recommendCareers } from '../../lib/careerRecommendation';
import { CAREER_CATALOG } from '../../catalog';
import { getLatestResumeByUserId } from '../repositories/resumesRepository';
import { toResumeData } from '../mappers/resumeMapper';

export function registerRecommendationRoutes(app: express.Express) {
  app.get('/api/preferences', async (req, res) => {
    try {
      const user = await requireAuth(req);
      return res.json({ preferences: normalizePreferences(user.preferences) });
    } catch (error) { return sendHttpError(res, error); }
  });
  app.put('/api/preferences', async (req, res) => {
    try {
      const user = await requireAuth(req);
      let preferences;
      if (req.body?.preferences == null) throw new HttpError(400, 'INVALID_PREFERENCES', '请提供求职偏好；清空偏好请提交空对象。');
      try { preferences = normalizeCatalogPreferences(req.body.preferences, CAREER_CATALOG); }
      catch (error) { throw new HttpError(400, 'INVALID_PREFERENCES', (error as Error).message); }
      await prisma.user.update({ where: { id: user.id }, data: { preferences: { ...preferences } } });
      return res.json({ preferences });
    } catch (error) { return sendHttpError(res, error); }
  });
  app.get('/api/recommendations', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const resume = await getLatestResumeByUserId(user.id);
      if (!resume) throw new HttpError(409, 'RESUME_MISSING', '请先确认并保存简历材料。');
      // Identity, materials and preferences come from the session; query/body IDs cannot select another account.
      return res.json(recommendCareers(toResumeData(resume), normalizePreferences(user.preferences), CAREER_CATALOG));
    } catch (error) { return sendHttpError(res, error); }
  });
}
