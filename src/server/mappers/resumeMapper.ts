import type { Resume } from '@prisma/client';
import type { ResumeData } from '../../types';
import type { CreateResumeInput } from '../repositories/resumesRepository';
import { HttpError } from '../http/errors';

export function toResumeData(record: Resume): ResumeData {
  return {
    name: record.name,
    school: record.school,
    major: record.major,
    graduationYear: record.graduationYear,
    skills: record.skills as string[],
    internships: record.internships as ResumeData['internships'],
    projects: record.projects as ResumeData['projects'],
    inferredDirection: record.inferredDirection,
    targetCities: record.targetCities as string[],
  };
}

export function toResumeCreateInput(
  resume: ResumeData,
  metadata: { rawText?: string | null; sourceFileName?: string | null; sourceFileType?: string | null } = {},
): CreateResumeInput {
  if (!resume.name || !resume.school || !resume.major || !resume.graduationYear) {
    throw new HttpError(400, 'INVALID_RESUME', '简历缺少必要字段');
  }
  return {
    ...resume,
    rawText: metadata.rawText || null,
    sourceFileName: metadata.sourceFileName || null,
    sourceFileType: metadata.sourceFileType || null,
  };
}
