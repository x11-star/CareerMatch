import assert from 'node:assert/strict';
import { createReportService, sanitizeFileName, buildContentDisposition } from '../../src/server/reports/reportService';
import { assembleReportData } from '../../src/server/reports/reportData';
import type { ReportData, PositionInput } from '../../src/server/reports/types';
import type { MatchResult } from '../../src/server/ai/types';
import type { ResumeData, PersonalityResult, Position } from '../../src/types';
import {
  ResumeMissingError,
  AssessmentMissingError,
  MatchNotCachedError,
} from '../../src/server/reports/reportErrors';

const resume: ResumeData = {
  name: '张三',
  school: '南京大学',
  major: '软件工程',
  graduationYear: '2027',
  skills: ['Java'],
  internships: [{ company: '示例科技', role: '后端', duration: '3个月' }],
  projects: [{ name: '订单系统', role: '后端', tech: 'Java' }],
  inferredDirection: '后端',
  targetCities: ['北京'],
};

const assessment: PersonalityResult = {
  typeTitle: '尽责稳定型',
  description: '稳定',
  radarScores: [{ dimension: 'C', score: 80, avg: 50 }],
  industryFit: { stateOwned: 70, internet: 60 },
  hollandCode: 'RCI',
  hollandTags: ['现实型'],
  deepInterpretation: { summary: 'ok', advantages: ['细致'] },
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
  tags: [],
  summary: '后端开发。',
  responsibilities: [],
  requirements: ['Java', 'Docker'],
  softSkills: ['沟通'],
  salaryDetail: '20-30k',
  careerPath: [],
  fitPersonality: ['尽责性高'],
  howToPrepare: { timeline: ['请说明项目'], exam: '复习 JVM。', interview: '准备难点。' },
  relatedJobs: [],
};

const matchResult: MatchResult = {
  resumeMatch: 90,
  personalityMatch: 80,
  overallMatch: 86,
  resumeMatchExplanation: 'r',
  personalityMatchExplanation: 'p',
  whyExcellent: 'why',
};

const positionInput: PositionInput = {
  id: position.id,
  title: position.title,
  company: position.company,
  city: position.city,
  type: position.type,
  salaryRange: position.salaryRange,
  summary: position.summary,
  requirements: position.requirements,
  softSkills: position.softSkills,
  fitPersonality: position.fitPersonality,
  howToPrepare: position.howToPrepare,
};

function makeSpies() {
  let assembleCalls = 0;
  let renderCalls = 0;
  let receivedHtml = '';
  const fakeBuffer = Buffer.from('%PDF-1.4 fake');

  const dataAssembler = (input: Parameters<typeof assembleReportData>[0]): ReportData => {
    assembleCalls += 1;
    // delegate to the real assembler so the rest of the pipeline gets a real ReportData,
    // but record that it was invoked through the injected seam.
    return assembleReportData(input) as ReportData;
  };

  const pdfRenderer = async (html: string): Promise<Buffer> => {
    renderCalls += 1;
    receivedHtml = html;
    return fakeBuffer;
  };

  return {
    dataAssembler,
    pdfRenderer,
    counts: () => ({ assembleCalls, renderCalls }),
    receivedHtml: () => receivedHtml,
    fakeBuffer,
  };
}

async function testHappyPath() {
  const spies = makeSpies();
  const service = createReportService({ pdfRenderer: spies.pdfRenderer, dataAssembler: spies.dataAssembler });
  const result = await service.exportPositionReport({
    userId: 'u1',
    resume,
    assessment,
    matchResult,
    position: positionInput,
    positionId: 'pos-0001',
  });

  assert.equal(result.buffer, spies.fakeBuffer);
  assert.equal(result.fileName, '诊断报告_示例科技_pos-0001.pdf');
  assert.deepEqual(spies.counts(), { assembleCalls: 1, renderCalls: 1 });
  // HTML passed to renderer must contain the assembled data (company + score).
  assert.ok(spies.receivedHtml().includes('示例科技'));
  assert.ok(spies.receivedHtml().includes('86'));
}

async function testPropagatesResumeMissing() {
  const spies = makeSpies();
  const service = createReportService({ pdfRenderer: spies.pdfRenderer, dataAssembler: spies.dataAssembler });
  await assert.rejects(
    () => service.exportPositionReport({ userId: 'u1', resume: null, assessment, matchResult, position: positionInput, positionId: 'p1' }),
    (err: unknown) => err instanceof ResumeMissingError,
  );
  assert.equal(spies.counts().renderCalls, 0, 'renderer must not run when data assembly fails');
}

async function testPropagatesAssessmentMissing() {
  const spies = makeSpies();
  const service = createReportService({ pdfRenderer: spies.pdfRenderer, dataAssembler: spies.dataAssembler });
  await assert.rejects(
    () => service.exportPositionReport({ userId: 'u1', resume, assessment: null, matchResult, position: positionInput, positionId: 'p1' }),
    (err: unknown) => err instanceof AssessmentMissingError,
  );
}

async function testPropagatesMatchNotCached() {
  const spies = makeSpies();
  const service = createReportService({ pdfRenderer: spies.pdfRenderer, dataAssembler: spies.dataAssembler });
  await assert.rejects(
    () => service.exportPositionReport({ userId: 'u1', resume, assessment, matchResult: null, position: positionInput, positionId: 'p1' }),
    (err: unknown) => err instanceof MatchNotCachedError,
  );
}

async function testSanitizesFileName() {
  assert.equal(sanitizeFileName('a/b:c?d', 'x'), '诊断报告_abcd_x.pdf');
  assert.equal(sanitizeFileName('', 'x'), '诊断报告_岗位_x.pdf');
  // long company truncated to 40 chars
  const long = '公司'.repeat(50);
  assert.ok(sanitizeFileName(long, 'id').length < long.length);
}

async function testContentDispositionIsAsciiSafeAndDecodable() {
  // Node's res.setHeader rejects non-ASCII bytes (ERR_INVALID_CHAR), so the header value must
  // be 7-bit clean in its filename= part while still carrying the real CJK name via filename*=
  // (RFC 5987), which the client decodes back to the original.
  const name = '诊断报告_示例科技_pos-0001.pdf';
  const header = buildContentDisposition(name);
  // entire header value is ASCII-safe (no raw CJK bytes)
  assert.ok(/^[^\x80-\xFF]*$/.test(header), 'header must be 7-bit clean');
  // filename*= carries the percent-encoded original
  assert.ok(header.includes(`filename*=UTF-8''${encodeURIComponent(name)}`), 'filename* RFC 5987');
  // ASCII fallback present (non-ASCII replaced, not the raw CJK)
  assert.ok(/filename="[^"]*"/.test(header), 'ascii filename fallback');
  assert.ok(!/filename="诊断/.test(header), 'ascii fallback must not contain raw CJK');
}

const tests = [
  testHappyPath,
  testPropagatesResumeMissing,
  testPropagatesAssessmentMissing,
  testPropagatesMatchNotCached,
  testSanitizesFileName,
  testContentDispositionIsAsciiSafeAndDecodable,
];

for (const test of tests) {
  await test();
}

console.log(`reportService.test.ts: ${tests.length} tests passed`);
