import type express from 'express';
import { sendHttpError } from '../http/errors';
import { countPositions, getPositionById, listPositions, MAX_POSITION_PAGE_SIZE } from '../repositories/positionsRepository';
import { toPosition } from '../mappers/positionMapper';

export function registerPositionRoutes(app: express.Express) {
  app.get('/api/positions', async (req, res) => {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 20);
      const filters = {
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        type: typeof req.query.type === 'string' ? req.query.type : undefined,
        industry: typeof req.query.industry === 'string' ? req.query.industry : undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        city: typeof req.query.city === 'string' ? req.query.city : undefined,
        page,
        pageSize,
      };
      const [positions, total] = await Promise.all([listPositions(filters), countPositions(filters)]);
      return res.json({ positions: positions.map(toPosition), total, page: Math.max(1, Math.floor(page || 1)), pageSize: Math.min(MAX_POSITION_PAGE_SIZE, Math.max(1, Math.floor(pageSize || 20))) });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.get('/api/positions/:id', async (req, res) => {
    try {
      const position = await getPositionById(req.params.id);
      if (!position) return res.status(404).json({ code: 'POSITION_NOT_FOUND', error: '岗位不存在' });
      return res.json({ position: toPosition(position) });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });
}
