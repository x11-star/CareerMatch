import v2Data from '../prisma/positions-v2.json';
import type { Position } from './types';

// This dataset describes careers, not verified employer openings. Never invent bindings.
export const CAREER_CATALOG: Position[] = v2Data.positions.map(raw => ({
  id: raw.id,
  catalogId: raw.id,
  title: raw.name,
  company: '',
  city: '',
  type: 'role-type',
  industry: raw.industry,
  category: raw.category,
  overallMatch: 0,
  resumeMatch: 0,
  personalityMatch: 0,
  salaryRange: `${raw.salaryRange[0]}-${raw.salaryRange[1]}${raw.salaryUnit || '万年薪'}`,
  difficultyRating: (raw.entryDifficulty.match(/⭐/g) || []).length,
  tags: [],
  summary: raw.workStyleDescription || '职业类型参考，具体要求以招聘公告为准。',
  responsibilities: raw.responsibilities || [],
  degreeRequirement: raw.degreeRequirement || '',
  typicalMajors: raw.typicalMajors || [],
  requirements: raw.hardSkills || [],
  softSkills: raw.softSkills || [],
  salaryDetail: '职业类型参考范围，来自模型整理，未经招聘公告逐条核验，不代表具体企业报价。',
  careerPath: (raw.developmentPath || '').split('→').map(s => s.trim()).filter(Boolean),
  fitPersonality: raw.personalityTags || [],
  howToPrepare: {
    timeline: (raw.recruitmentTimeline || '').split('→').map(s => s.trim()).filter(Boolean),
    exam: raw.examPrepNotes || '结合具体招聘公告准备专业基础与综合能力。',
    interview: `围绕${raw.name}的核心职责准备项目证据；练习问题不是企业面试真题。`,
  },
  relatedJobs: [],
}));
for (const position of CAREER_CATALOG) {
  position.relatedJobs = CAREER_CATALOG.filter(p => p.id !== position.id && p.category === position.category).slice(0, 3).map(p => p.title);
}
export function interviewPracticeQuestions(position: Pick<Position, 'title' | 'requirements'>): string[] {
  return [
    `请介绍一段能证明你适合${position.title}的项目或经历，说明自己的贡献。`,
    position.requirements.length ? `如何在具体任务中应用${position.requirements[0]}？请给出证据和局限。` : '遇到不熟悉的任务时，你如何学习并验证结果？',
    '请复盘一次遇到困难的经历，说明取舍、结果与改进。',
  ];
}
