import assert from 'node:assert/strict';
import {
  assembleReportData,
  ResumeMissingError,
  AssessmentMissingError,
  MatchNotCachedError,
} from '../../src/server/reports/reportData';
import type { ReportData } from '../../src/server/reports/types';
import type { MatchResult } from '../../src/server/ai/types';
import type { Position, ResumeData, PersonalityResult } from '../../src/types';

// Reuse the AI service input shapes (same as tests/ai/aiService.test.ts) so fixtures stay consistent
// with the rest of the pipeline.
type MatchResultLike = MatchResult;
type PositionLike = Position;
type ResumeDataLike = ResumeData;
type PersonalityResultLike = PersonalityResult;

const resume: ResumeDataLike = {
  name: '张三',
  school: '南京大学',
  major: '软件工程',
  graduationYear: '2027',
  skills: ['Java', 'Spring', 'MySQL', 'Git'],
  internships: [{ company: '示例科技', role: '后端实习', duration: '3个月' }],
  projects: [{ name: '电商订单系统', role: '后端', tech: 'Java/Spring' }],
  inferredDirection: '后端开发',
  targetCities: ['北京'],
};

const assessment: PersonalityResultLike = {
  typeTitle: '尽责稳定型',
  description: '稳定且细致',
  radarScores: [{ dimension: 'C', score: 80, avg: 50 }],
  industryFit: { stateOwned: 70, internet: 60 },
  hollandCode: 'RCI',
  hollandTags: ['现实型', '常规型', '研究型'],
  deepInterpretation: { summary: '适合稳健的后端岗位', advantages: ['细致', '稳定'] },
};

const position: PositionLike = {
  id: 'pos-0001',
  title: '后端开发工程师',
  company: '示例科技',
  city: '北京',
  type: 'internet',
  overallMatch: 0,
  resumeMatch: 0,
  personalityMatch: 0,
  salaryRange: '20-30k',
  difficultyRating: 4,
  tags: ['六险二金'],
  summary: '负责后端服务开发与维护。',
  responsibilities: ['设计和实现后端接口'],
  requirements: ['Java', 'Spring', 'Docker', 'Kubernetes'],
  softSkills: ['沟通能力', '团队协作', '抗压能力'],
  salaryDetail: '20-30k',
  careerPath: ['初级后端', '高级后端'],
  fitPersonality: ['尽责性高', '情绪稳定'],
  howToPrepare: {
    timeline: ['请说明你最能证明岗位能力的项目', '讲一次线上问题排查经历'],
    exam: '复习 JVM 与并发常见题型。',
    interview: '准备项目中的难点、取舍与指标。',
  },
  relatedJobs: [],
};

const matchResult: MatchResultLike = {
  resumeMatch: 90,
  personalityMatch: 80,
  overallMatch: 86,
  resumeMatchExplanation: 'resume exp',
  personalityMatchExplanation: 'personality exp',
  whyExcellent: 'why text',
};

async function testMapsAllSections() {
  const data = assembleReportData({ resume, assessment, matchResult, position, userId: 'u1' });

  // conclusion: score from matchResult.overallMatch, label/sentence/tone via thresholds (>=80 => success/推荐)
  assert.equal(data.conclusion.score, 86);
  assert.equal(data.conclusion.label, '推荐');
  assert.equal(data.conclusion.tone, 'success');
  assert.ok(data.conclusion.sentence.length > 0);

  // dimensions mirror matchResult
  assert.equal(data.dimensions.resumeMatch, 90);
  assert.equal(data.dimensions.personalityMatch, 80);
  assert.equal(data.dimensions.overallMatch, 86);

  // position header
  assert.equal(data.position.company, '示例科技');
  assert.equal(data.position.title, '后端开发工程师');
  assert.equal(data.position.city, '北京');
  assert.equal(data.position.salaryRange, '20-30k');
  assert.ok(data.position.summary.length > 0);

  // evidence: met = requirements the resume skills cover (Java, Spring), missing = Docker, Kubernetes
  assert.deepEqual(data.evidence.met.sort(), ['Java', 'Spring']);
  assert.deepEqual(data.evidence.missing.sort(), ['Docker', 'Kubernetes']);
  // partial mirrors softSkills slice(0,3) like PositionDetailPage
  assert.deepEqual(data.evidence.partial, ['沟通能力', '团队协作', '抗压能力']);
  assert.equal(data.evidence.whyExcellent, 'why text');
  // fitPersonality from position
  assert.deepEqual(data.evidence.fitPersonality, ['尽责性高', '情绪稳定']);
  assert.ok(data.evidence.risk.length > 0);

  // actions: gap list has 4 labels, timeline has 3 windows, interview has questions/exam/projectRecap
  assert.equal(data.actions.gaps.length, 4);
  assert.equal(data.actions.timeline.length, 3);
  assert.equal(data.actions.timeline[0].title, '7 天可做');
  assert.equal(data.actions.timeline[1].title, '30 天可做');
  assert.equal(data.actions.timeline[2].title, '投递前必须补');
  // interview questions from howToPrepare.timeline
  assert.deepEqual(data.actions.interview.questions, ['请说明你最能证明岗位能力的项目', '讲一次线上问题排查经历']);
  assert.equal(data.actions.interview.exam, '复习 JVM 与并发常见题型。');
  assert.equal(data.actions.interview.projectRecap, '准备项目中的难点、取舍与指标。');

  // generatedAt is ISO
  assert.ok(!Number.isNaN(Date.parse(data.generatedAt)));
}

async function testThresholdWarning() {
  const data = assembleReportData({
    resume,
    assessment,
    matchResult: { ...matchResult, overallMatch: 70 },
    position,
    userId: 'u1',
  });
  assert.equal(data.conclusion.label, '谨慎');
  assert.equal(data.conclusion.tone, 'warning');
}

async function testThresholdError() {
  const data = assembleReportData({
    resume,
    assessment,
    matchResult: { ...matchResult, overallMatch: 50 },
    position,
    userId: 'u1',
  });
  assert.equal(data.conclusion.label, '不建议');
  assert.equal(data.conclusion.tone, 'error');
}

async function expectReject<T extends Error>(fn: () => unknown, ErrorClass: new () => T) {
  let thrown: unknown;
  try {
    fn();
  } catch (err) {
    thrown = err;
  }
  assert.ok(thrown instanceof ErrorClass, `expected ${ErrorClass.name}, got ${thrown ? String((thrown as Error).message) : 'no throw'}`);
}

async function testThrowsWhenResumeMissing() {
  await expectReject(
    () => assembleReportData({ resume: null, assessment, matchResult, position, userId: 'u1' }),
    ResumeMissingError,
  );
}

async function testThrowsWhenAssessmentMissing() {
  await expectReject(
    () => assembleReportData({ resume, assessment: null, matchResult, position, userId: 'u1' }),
    AssessmentMissingError,
  );
}

async function testThrowsWhenMatchNotCached() {
  await expectReject(
    () => assembleReportData({ resume, assessment, matchResult: null, position, userId: 'u1' }),
    MatchNotCachedError,
  );
}

async function testGapsWhenNoExperience() {
  const noExpResume: ResumeDataLike = { ...resume, internships: [], projects: [] };
  const data = assembleReportData({ resume: noExpResume, assessment, matchResult, position, userId: 'u1' });
  const experienceGap = data.actions.gaps.find((g) => g.label === '经历差距');
  assert.ok(experienceGap);
  assert.ok(experienceGap.value.includes('暂无实习或项目') || experienceGap.value.includes('课程项目'));
}

async function testMatchesRequirementSubstringBothWays() {
  // PositionDetailPage uses bidirectional includes; "Spring Boot" requirement should be met by "Spring" skill.
  const posWithSpringBoot: PositionLike = { ...position, requirements: ['Spring Boot'] };
  const data = assembleReportData({ resume, assessment, matchResult, position: posWithSpringBoot, userId: 'u1' });
  assert.deepEqual(data.evidence.met, ['Spring Boot']);
  assert.deepEqual(data.evidence.missing, []);
}

const tests = [
  testMapsAllSections,
  testThresholdWarning,
  testThresholdError,
  testThrowsWhenResumeMissing,
  testThrowsWhenAssessmentMissing,
  testThrowsWhenMatchNotCached,
  testGapsWhenNoExperience,
  testMatchesRequirementSubstringBothWays,
];

for (const test of tests) {
  await test();
}

// Reference to keep the type import meaningful for readers; ensures ReportData stays structurally compatible.
const _reportDataShape: ReportData = assembleReportData({
  resume,
  assessment,
  matchResult,
  position,
  userId: 'u1',
});
void _reportDataShape;

console.log(`reportData.test.ts: ${tests.length} tests passed`);
