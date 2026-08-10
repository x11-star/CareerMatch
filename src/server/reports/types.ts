import type { MatchResult } from '../ai/types';

// ReportData mirrors what PositionDetailPage renders: conclusion (score + label + sentence),
// match dimensions, evidence (met/partial/missing requirements + personality fit/risk + AI whyExcellent),
// and a pure action plan (gap list + 7d/30d/pre-submit timeline + interview prep). Pure data — no marketing copy.

export interface ReportPositionHeader {
  company: string;
  title: string;
  city: string;
  type: string; // '央国企' | '互联网' (already localized, matching PositionDetailPage display)
  salaryRange: string;
  summary: string;
}

export type DiagnosisTone = 'success' | 'warning' | 'error';

export interface ReportConclusion {
  score: number; // matchResult.overallMatch
  label: string; // 推荐 | 谨慎 | 不建议
  sentence: string;
  tone: DiagnosisTone;
}

export interface ReportDimensions {
  resumeMatch: number;
  personalityMatch: number;
  overallMatch: number;
}

export interface ReportEvidence {
  met: string[]; // position.requirements the resume skills cover
  partial: string[]; // position.softSkills.slice(0, 3)
  missing: string[]; // position.requirements not covered
  fitPersonality: string[]; // position.fitPersonality
  risk: string; // personality-aware risk sentence
  whyExcellent: string; // matchResult.whyExcellent
}

export interface ReportGap {
  label: string;
  value: string;
}

export interface ReportTimelineWindow {
  title: string; // 7 天可做 | 30 天可做 | 投递前必须补
  items: string[];
}

export interface ReportInterview {
  questions: string[]; // position.howToPrepare.timeline
  exam: string; // position.howToPrepare.exam
  projectRecap: string; // position.howToPrepare.interview
}

export interface ReportActions {
  gaps: ReportGap[]; // 4 gap dimensions: 技能/经历/表达/行业理解
  timeline: ReportTimelineWindow[]; // 7d / 30d / pre-submit
  interview: ReportInterview;
}

export interface ReportData {
  position: ReportPositionHeader;
  conclusion: ReportConclusion;
  dimensions: ReportDimensions;
  evidence: ReportEvidence;
  actions: ReportActions;
  generatedAt: string; // ISO timestamp
}

export interface AssembleReportDataInput {
  resume: ResumeDataInput | null;
  assessment: PersonalityResultInput | null;
  matchResult: MatchResult | null;
  position: PositionInput;
  userId: string; // present for traceability; report is already scoped to this user by the route
}

// Local structural aliases so report assembly does not import React-side types directly via long paths.
// They intentionally re-declare the relevant fields of src/types to keep the report module self-contained.
export interface ResumeDataInput {
  name: string;
  school?: string;
  major?: string;
  graduationYear?: string;
  skills: string[];
  internships: unknown[];
  projects: unknown[];
  inferredDirection?: string;
  targetCities?: string[];
}

export interface PersonalityResultInput {
  typeTitle: string;
  description?: string;
}

export interface PositionInput {
  id: string;
  title: string;
  company: string;
  city: string;
  type: 'state-owned' | 'internet';
  salaryRange: string;
  summary: string;
  requirements: string[];
  softSkills: string[];
  fitPersonality: string[];
  howToPrepare: {
    timeline: string[];
    exam: string;
    interview: string;
  };
}

export type { MatchResult };
