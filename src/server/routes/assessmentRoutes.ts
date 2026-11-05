import type express from 'express';
import { requireAuth } from '../http/authMiddleware';
import { sendHttpError } from '../http/errors';
import { createAssessment, getLatestAssessmentByUserId } from '../repositories/assessmentsRepository';
import { toAssessmentCreateInput, toPersonalityResult } from '../mappers/assessmentMapper';
import { prisma } from '../db/prisma';
import { calculatePersonalityResult } from '../../lib/assessmentHelper';
import { MOCK_QUESTIONS } from '../../data';
import { HttpError } from '../http/errors';

export function registerAssessmentRoutes(app: express.Express) {
  app.delete('/api/assessments', async (req, res) => {
    try {
      const user = await requireAuth(req);
      await prisma.assessment.deleteMany({ where: { userId: user.id } });
      return res.json({ ok: true });
    } catch (error) { return sendHttpError(res, error); }
  });
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
      const answers = req.body?.scores;
      if (!answers || typeof answers !== 'object' || Array.isArray(answers) || MOCK_QUESTIONS.some(q => !Number.isInteger(answers[q.id]) || answers[q.id] < 1 || answers[q.id] > 5)) {
        throw new HttpError(400, 'INVALID_ASSESSMENT_ANSWERS', '请完成全部测评题目后再保存。');
      }
      const normalized = Object.fromEntries(MOCK_QUESTIONS.map(q => [q.id, answers[q.id]]));
      const created = await createAssessment(user.id, toAssessmentCreateInput(calculatePersonalityResult(normalized), normalized));
      return res.json({ assessment: { personalityResult: toPersonalityResult(created), scores: created.answers } });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });
}
