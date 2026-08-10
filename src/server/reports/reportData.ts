import {
  AssessmentMissingError,
  MatchNotCachedError,
  ResumeMissingError,
} from './reportErrors';
import type {
  AssembleReportDataInput,
  DiagnosisTone,
  ReportData,
  ReportGap,
} from './types';

// Thresholds + copy duplicated from PositionDetailPage (诊断结论 thresholds). Duplication is
// intentional: the report must not import a React component, so it keeps its own copy of the
// diagnosis rules. Keep these in sync if PositionDetailPage thresholds change.
function diagnosisTone(score: number): DiagnosisTone {
  if (score >= 80) return 'success';
  if (score >= 65) return 'warning';
  return 'error';
}

function diagnosisLabel(score: number): string {
  if (score >= 80) return '推荐';
  if (score >= 65) return '谨慎';
  return '不建议';
}

function diagnosisSentence(score: number): string {
  if (score >= 80) return '推荐投递，但建议补充项目证明。';
  if (score >= 65) return '可以尝试，但需要先补齐关键差距。';
  return '当前匹配度较低，建议优先考虑更贴近背景的岗位。';
}

// Same bidirectional includes() match as PositionDetailPage.resumeSkillsHasRequirement:
// a requirement is "met" if any skill is a substring of the requirement or vice-versa.
function skillCoversRequirement(skills: string[], requirement: string): boolean {
  const normalized = requirement.toLowerCase();
  return skills.some((skill) => {
    const s = skill.toLowerCase();
    return normalized.includes(s) || s.includes(normalized);
  });
}

function buildGaps(
  missingRequirements: string[],
  hasExperience: boolean,
): ReportGap[] {
  return [
    {
      label: '技能差距',
      value: missingRequirements.slice(0, 3).join('、') || '技能项基本覆盖,补项目证据',
    },
    {
      label: '经历差距',
      value: hasExperience
        ? '把实习或项目整理成 STAR 结构,突出具体贡献'
        : '暂无实习或项目,补充课程项目或竞赛',
    },
    {
      label: '表达差距',
      value: '准备项目背景、职责、难点、方案和结果',
    },
    {
      label: '行业理解',
      value: '准备公司业务、岗位所属部门和近期行业变化',
    },
  ];
}

function buildTimeline(): ReportData['actions']['timeline'] {
  return [
    {
      title: '7 天可做',
      items: [
        '补齐岗位要求中最缺的 1-2 个技能证明',
        '把一个项目整理成 STAR 复盘稿',
        '准备 3 个和岗位职责相关的问题',
      ],
    },
    {
      title: '30 天可做',
      items: [
        '补一个小型项目或案例,覆盖岗位核心技术',
        '针对目标岗位更新简历摘要和项目描述',
        '完成 2-3 次模拟面试复盘',
      ],
    },
    {
      title: '投递前必须补',
      items: [
        '确认简历中没有空泛形容词',
        '准备岗位要求逐条对应证据',
        '梳理公司业务和部门方向',
      ],
    },
  ];
}

export function assembleReportData(input: AssembleReportDataInput): ReportData {
  const { resume, assessment, matchResult, position } = input;

  if (!resume) throw new ResumeMissingError();
  if (!assessment) throw new AssessmentMissingError();
  if (!matchResult) throw new MatchNotCachedError();

  const score = matchResult.overallMatch;
  const skills = resume.skills || [];
  const requirements = position.requirements || [];
  const met = requirements.filter((req) => skillCoversRequirement(skills, req));
  const missing = requirements.filter((req) => !skillCoversRequirement(skills, req));
  const hasExperience = Boolean(resume.internships?.length || resume.projects?.length);

  return {
    applicant: {
      name: resume.name,
      school: resume.school || '',
      major: resume.major || '',
    },
    position: {
      company: position.company,
      title: position.title,
      city: position.city,
      type: position.type === 'state-owned' ? '央国企' : '互联网',
      salaryRange: position.salaryRange,
      summary: position.summary,
    },
    conclusion: {
      score,
      label: diagnosisLabel(score),
      sentence: diagnosisSentence(score),
      tone: diagnosisTone(score),
    },
    dimensions: {
      resumeMatch: matchResult.resumeMatch,
      personalityMatch: matchResult.personalityMatch,
      overallMatch: matchResult.overallMatch,
    },
    evidence: {
      met,
      partial: (position.softSkills || []).slice(0, 3),
      missing,
      fitPersonality: position.fitPersonality || [],
      // Mirrors PositionDetailPage's risk line. assessment is guaranteed non-null here
      // (a null assessment throws AssessmentMissingError above), so this is a fixed advisory
      // sentence rather than a per-profile derivation. Kept identical to the on-screen report
      // so the PDF and the page agree.
      risk: '如果岗位节奏或反馈密度与你的测评倾向不同,需要提前准备适应策略。',
      whyExcellent: matchResult.whyExcellent,
    },
    actions: {
      gaps: buildGaps(missing, hasExperience),
      timeline: buildTimeline(),
      interview: {
        questions: position.howToPrepare?.timeline || [],
        exam: position.howToPrepare?.exam || '复习岗位要求中的基础知识和常见题型。',
        projectRecap: position.howToPrepare?.interview || '准备项目中的难点、取舍、指标和复盘。',
      },
    },
    generatedAt: new Date().toISOString(),
  };
}

// Re-export the error classes so callers can `import { ResumeMissingError, ... } from './reportData'`.
export { AssessmentMissingError, MatchNotCachedError, ResumeMissingError };
