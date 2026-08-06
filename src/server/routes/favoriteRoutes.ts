import type express from 'express';
import { requireAuth } from '../http/authMiddleware';
import { sendHttpError } from '../http/errors';
import { addFavorite, listFavoritesByUserId, removeFavorite } from '../repositories/favoritesRepository';

export function registerFavoriteRoutes(app: express.Express) {
  app.get('/api/favorites', async (req, res) => {
    try {
      const user = await requireAuth(req);
      const favorites = await listFavoritesByUserId(user.id);
      return res.json({ positionIds: favorites.map((favorite) => favorite.positionId) });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post('/api/favorites/:positionId', async (req, res) => {
    try {
      const user = await requireAuth(req);
      await addFavorite(user.id, req.params.positionId);
      return res.json({ ok: true });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.delete('/api/favorites/:positionId', async (req, res) => {
    try {
      const user = await requireAuth(req);
      await removeFavorite(user.id, req.params.positionId);
      return res.json({ ok: true });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });
}
