import type { Resume } from '@prisma/client';
import type { ResumeData } from '../../types';
import type { CreateResumeInput } from '../repositories/resumesRepository';
import { HttpError } from '../http/errors';
import { validateResumeData } from '../ai/schemas';
import { normalizeQualifications } from '../../lib/careerPreferences';
import { hasRealResumeData } from '../../lib/resumeState';

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
    qualifications: normalizeQualifications(record.qualifications),
  };
}

export function toResumeCreateInput(
  resume: ResumeData,
  metadata: { rawText?: string | null; sourceFileName?: string | null; sourceFileType?: string | null } = {},
): CreateResumeInput {
  let normalized: ResumeData;
  try { normalized = validateResumeData(resume); }
  catch { throw new HttpError(400, 'INVALID_RESUME', '简历字段格式不正确，请检查后再保存。'); }
  if (!hasRealResumeData(normalized)) {
    throw new HttpError(400, 'INVALID_RESUME', '请至少填写一项个人材料；其他信息可以留空。');
  }
  return {
    // Do not pass client/UI metadata or reserved IDs into Prisma writes.
    ...normalized,
    qualifications: normalized.qualifications ? { ...normalized.qualifications } : {},
    rawText: metadata.rawText || null,
    sourceFileName: metadata.sourceFileName || null,
    sourceFileType: metadata.sourceFileType || null,
  };
}
