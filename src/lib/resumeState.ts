import { DEFAULT_RESUME_DATA } from '../data';
import { ResumeData } from '../types';

export function hasRealResumeData(resumeData: ResumeData | null | undefined) {
  if (!resumeData) return false;
  return JSON.stringify(resumeData) !== JSON.stringify(DEFAULT_RESUME_DATA);
}
