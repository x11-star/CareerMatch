import type { Position as PrismaPosition } from '@prisma/client';
import type { Position } from '../../types';
import { CAREER_CATALOG } from '../../catalog';

export function toPosition(record: PrismaPosition): Position {
  // Upgrade earlier seeded career rows at the API boundary without deleting favorites or reports.
  const career = CAREER_CATALOG.find(p => p.id === record.id || (p.title === record.title && p.industry === record.industry));
  if (career) return { ...career, id: record.id };
  return {
    id: record.id,
    title: record.title,
    company: record.company,
    city: record.city,
    type: record.type as Position['type'],
    industry: record.industry || undefined,
    category: record.category || undefined,
    subIndustry: record.subIndustry || undefined,
    subCategory: record.subCategory || undefined,
    salaryRange: record.salaryRange || '',
    difficultyRating: Number(record.difficultyRating || 0),
    tags: record.tags as string[],
    summary: record.summary,
    responsibilities: record.responsibilities as string[],
    requirements: record.requirements as string[],
    softSkills: record.softSkills as string[],
    salaryDetail: record.salaryDetail || '',
    careerPath: (record.careerPath || []) as string[],
    fitPersonality: (record.fitPersonality || []) as string[],
    howToPrepare: record.howToPrepare as Position['howToPrepare'],
    relatedJobs: (record.relatedJobs || []) as string[],
    overallMatch: 0,
    resumeMatch: 0,
    personalityMatch: 0,
  };
}
