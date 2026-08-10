import type { Prisma } from '@prisma/client';
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type PositionFilters = {
  q?: string;
  type?: string;
  industry?: string;
  category?: string;
  city?: string;
  page?: number;
  pageSize?: number;
};

export const MAX_POSITION_PAGE_SIZE = 500;

function normalizePage(page?: number) {
  return Math.max(1, Math.floor(page || 1));
}

function normalizePageSize(pageSize?: number) {
  return Math.min(MAX_POSITION_PAGE_SIZE, Math.max(1, Math.floor(pageSize || 20)));
}

function buildWhere(filters: PositionFilters): Prisma.PositionWhereInput {
  const where: Prisma.PositionWhereInput = {};

  if (filters.q?.trim()) {
    const query = filters.q.trim();
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { company: { contains: query, mode: 'insensitive' } },
      { summary: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (filters.type) where.type = filters.type;
  if (filters.industry) where.industry = filters.industry;
  if (filters.category) where.category = filters.category;
  if (filters.city) where.city = filters.city;

  return where;
}

export function listPositions(filters: PositionFilters = {}) {
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);

  return runDb(() => prisma.position.findMany({
    where: buildWhere(filters),
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  }));
}

export function countPositions(filters: PositionFilters = {}) {
  return runDb(() => prisma.position.count({ where: buildWhere(filters) }));
}

export function getPositionById(positionId: string) {
  return runDb(() => prisma.position.findUnique({ where: { id: positionId } }));
}
