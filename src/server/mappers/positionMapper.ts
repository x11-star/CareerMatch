import type { Position as PrismaPosition } from '@prisma/client';
import type { Position } from '../../types';

export function toPosition(record: PrismaPosition): Position {
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
