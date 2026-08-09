import type express from 'express';
import { requireAuth } from '../http/authMiddleware';
import { sendHttpError } from '../http/errors';
import { clearAuthCookie } from '../http/cookies';
import { defaultAuthService } from '../auth/authService';
import { updateUserProfile } from '../repositories/usersRepository';
import { createResume, updateLatestResumeByUserId } from '../repositories/resumesRepository';
import { createAssessment } from '../repositories/assessmentsRepository';
import { addFavorite } from '../repositories/favoritesRepository';
import { toAssessmentCreateInput } from '../mappers/assessmentMapper';
import { toResumeCreateInput } from '../mappers/resumeMapper';

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

export function registerMeRoutes(app: express.Express) {
  app.get('/api/me', async (req, res) => {
    try {
      const user = await requireAuth(req);
      return res.json({ user: publicUser(user) });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.patch('/api/me', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const updated = await updateUserProfile(user.id, {
        name: req.body?.name ?? null,
        school: req.body?.school ?? null,
        major: req.body?.major ?? null,
        graduationYear: req.body?.graduationYear ?? null,
      });
      return res.json({ user: publicUser(updated) });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post('/api/me/import-local-data', async (req, res) => {
    try {
      const user = await requireAuth(req);
      let resumeImported = false;
      let assessmentImported = false;
      let favoritesImported = 0;

      if (req.body?.resume) {
        const input = toResumeCreateInput(req.body.resume);
        const updated = await updateLatestResumeByUserId(user.id, input);
        if (!updated) await createResume(user.id, input);
        resumeImported = true;
      }

      if (req.body?.assessment?.personalityResult) {
        await createAssessment(user.id, toAssessmentCreateInput(req.body.assessment.personalityResult, req.body.assessment.scores || {}));
        assessmentImported = true;
      }

      const favoritePositionIds = Array.isArray(req.body?.favoritePositionIds) ? req.body.favoritePositionIds : [];
      for (const positionId of favoritePositionIds) {
        if (typeof positionId === 'string') {
          await addFavorite(user.id, positionId);
          favoritesImported += 1;
        }
      }

      return res.json({ imported: { resume: resumeImported, assessment: assessmentImported, favorites: favoritesImported } });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post('/api/me/change-phone/request-code', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const result = await defaultAuthService.requestChangePhoneCode(user.id, String(req.body?.newPhone || ''));
      return res.json(result);
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post('/api/me/change-phone/verify', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const result = await defaultAuthService.verifyChangePhoneCode(user.id, String(req.body?.newPhone || ''), String(req.body?.code || ''));
      return res.json({ user: publicUser(result.user) });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post('/api/me/delete-account/request-code', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const result = await defaultAuthService.requestDeleteAccountCode(user.id, user.phone);
      return res.json(result);
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post('/api/me/delete-account', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const result = await defaultAuthService.verifyDeleteAccountCode(user.id, user.phone, String(req.body?.code || ''));
      clearAuthCookie(res);
      return res.json(result);
    } catch (error) {
      return sendHttpError(res, error);
    }
  });
}
