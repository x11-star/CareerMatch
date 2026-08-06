import type express from 'express';
import { requireAuth } from '../http/authMiddleware';
import { sendHttpError } from '../http/errors';
import { createResume, getLatestResumeByUserId, updateLatestResumeByUserId } from '../repositories/resumesRepository';
import { toResumeCreateInput, toResumeData } from '../mappers/resumeMapper';

export function registerResumeRoutes(app: express.Express) {
  app.get('/api/resumes/latest', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const latest = await getLatestResumeByUserId(user.id);
      return res.json({ resume: latest ? toResumeData(latest) : null });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post('/api/resumes', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const input = toResumeCreateInput(req.body?.resume, {
        rawText: req.body?.rawText,
        sourceFileName: req.body?.sourceFileName,
        sourceFileType: req.body?.sourceFileType,
      });
      const created = await createResume(user.id, input);
      return res.json({ resume: toResumeData(created) });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.put('/api/resumes/latest', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const input = toResumeCreateInput(req.body?.resume, {
        rawText: req.body?.rawText,
        sourceFileName: req.body?.sourceFileName,
        sourceFileType: req.body?.sourceFileType,
      });
      const updated = await updateLatestResumeByUserId(user.id, input);
      const record = updated || await createResume(user.id, input);
      return res.json({ resume: toResumeData(record) });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });
}
