import assert from 'node:assert/strict';
import { buildReportHtml } from '../../src/server/reports/reportHtml';
import type { ReportData } from '../../src/server/reports/types';
import { assembleReportData } from '../../src/server/reports/reportData';
import type { MatchResult } from '../../src/server/ai/types';
import type { Position, ResumeData, PersonalityResult } from '../../src/types';

const resume: ResumeData = {
  name: '张三',
  school: '南京大学',
  major: '软件工程',
  graduationYear: '2027',
  skills: ['Java', 'Spring'],
  internships: [{ company: '示例科技', role: '后端实习', duration: '3个月' }],
  projects: [{ name: '电商订单系统', role: '后端', tech: 'Java/Spring' }],
  inferredDirection: '后端开发',
  targetCities: ['北京'],
};

const assessment: PersonalityResult = {
  typeTitle: '尽责稳定型',
  description: '稳定且细致',
  radarScores: [{ dimension: 'C', score: 80, avg: 50 }],
  industryFit: { stateOwned: 70, internet: 60 },
  hollandCode: 'RCI',
  hollandTags: ['现实型', '常规型', '研究型'],
  deepInterpretation: { summary: '适合稳健的后端岗位', advantages: ['细致', '稳定'] },
};

const position: Position = {
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
  requirements: ['Java', 'Spring', 'Docker'],
  softSkills: ['沟通能力', '团队协作'],
  salaryDetail: '20-30k',
  careerPath: ['初级后端'],
  fitPersonality: ['尽责性高', '情绪稳定'],
  howToPrepare: { timeline: ['请说明你最能证明岗位能力的项目'], exam: '复习 JVM。', interview: '准备难点。' },
  relatedJobs: [],
};

const matchResult: MatchResult = {
  resumeMatch: 90,
  personalityMatch: 80,
  overallMatch: 86,
  resumeMatchExplanation: 'resume',
  personalityMatchExplanation: 'personality',
  whyExcellent: 'why',
};

function buildData(): ReportData {
  return assembleReportData({ resume, assessment, matchResult, position, userId: 'u1' });
}

function testContainsAllFields() {
  const html = buildReportHtml(buildData());
  assert.ok(html.includes('示例科技'), 'company');
  assert.ok(html.includes('后端开发工程师'), 'title');
  assert.ok(html.includes('86'), 'score');
  assert.ok(html.includes('推荐'), 'diagnosis label');
  assert.ok(html.includes('90'), 'resumeMatch');
  assert.ok(html.includes('80'), 'personalityMatch');
  assert.ok(html.includes('Java'), 'met requirement');
  assert.ok(html.includes('Docker'), 'missing requirement');
}

function testSelfContained() {
  const html = buildReportHtml(buildData());
  // no external resources
  assert.ok(!/<link[\s>]/i.test(html), 'no <link>');
  assert.ok(!/@import/.test(html), 'no @import');
  assert.ok(!/\bsrc\s*=/i.test(html), 'no src=');
  assert.ok(!/href\s*=\s*["']https?:/i.test(html), 'no http href');
  // style is inline only
  assert.ok(/<style[\s>]/i.test(html), 'has inline <style>');
}

function testEscapesUserInput() {
  const evil = '<script>alert(1)</script>';
  const data = buildData();
  data.position.company = evil;
  data.evidence.whyExcellent = evil;
  data.evidence.met = [evil];
  const html = buildReportHtml(data);
  assert.ok(!html.includes('<script>'), 'script tag must be escaped');
  assert.ok(html.includes('&lt;script&gt;'), 'script tag escaped');
}

function testThreeSections() {
  const html = buildReportHtml(buildData());
  assert.ok(html.includes('结论'), 'conclusion section');
  assert.ok(html.includes('证据'), 'evidence section');
  assert.ok(html.includes('行动'), 'action section');
}

function testHeaderHasNameAndGeneratedAt() {
  const html = buildReportHtml(buildData());
  assert.ok(html.includes('张三'), 'applicant name');
  assert.ok(html.includes('南京大学'), 'school');
  assert.ok(html.includes('后端开发工程师'), 'position title');
  // generatedAt ISO date appears (YYYY-MM-DD substring present in ISO string)
  assert.ok(/\d{4}-\d{2}-\d{2}/.test(html), 'generated date');
}

const tests = [
  testContainsAllFields,
  testSelfContained,
  testEscapesUserInput,
  testThreeSections,
  testHeaderHasNameAndGeneratedAt,
];

for (const test of tests) {
  test();
}

console.log(`reportHtml.test.ts: ${tests.length} tests passed`);
