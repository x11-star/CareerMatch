import type express from 'express';
import { requireAuth } from '../http/authMiddleware';
import { sendHttpError } from '../http/errors';
import { createAssessment, getLatestAssessmentByUserId } from '../repositories/assessmentsRepository';
import { toAssessmentCreateInput, toPersonalityResult } from '../mappers/assessmentMapper';

export function registerAssessmentRoutes(app: express.Express) {
  app.get('/api/assessments/latest', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const latest = await getLatestAssessmentByUserId(user.id);
      return res.json({ assessment: latest ? { personalityResult: toPersonalityResult(latest), scores: latest.answers } : null });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post('/api/assessments', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const created = await createAssessment(user.id, toAssessmentCreateInput(req.body?.personalityResult, req.body?.scores || {}));
      return res.json({ assessment: { personalityResult: toPersonalityResult(created), scores: created.answers } });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });
}
