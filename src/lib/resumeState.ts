import { ResumeData } from '../types';

export function hasRealResumeData(resumeData: ResumeData | null | undefined) {
  if (!resumeData) return false;
  return Boolean([resumeData.name, resumeData.school, resumeData.major, resumeData.graduationYear, resumeData.inferredDirection, resumeData.qualifications?.degree].some(v => v?.trim()) ||
    resumeData.skills.some(v => v.trim()) || resumeData.internships.some(v => v.company.trim() || v.role.trim()) || resumeData.projects.some(v => v.name.trim() || v.tech.trim()) ||
    resumeData.qualifications?.languages.some(v => v.trim()) || resumeData.qualifications?.certificates.some(v => v.trim()) || resumeData.qualifications?.evidence.some(v => v.trim()));
}
