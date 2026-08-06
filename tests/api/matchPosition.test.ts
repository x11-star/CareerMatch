import assert from 'node:assert/strict';
import { prisma } from '../../src/server/db/prisma';
import { createApp } from '../../src/server/app';
import { mapPositionForSeed } from '../../prisma/seed';
import { MOCK_POSITIONS } from '../../src/data';

const fakeAiService = {
  async parseResume() { throw new Error('not used'); },
  async chatAboutPosition() { return 'not used'; },
  async matchPosition() {
    return {
      resumeMatch: 88,
      personalityMatch: 77,
      overallMatch: 83,
      resumeMatchExplanation: '简历匹配',
      personalityMatchExplanation: '性格匹配',
      whyExcellent: '综合匹配',
    };
  },
};

async function request(app: ReturnType<typeof createApp>, path: string, init: RequestInit = {}) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address === 'object');
  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`, init);
  } finally {
    server.close();
  }
}

async function login(app: ReturnType<typeof createApp>) {
  await request(app, '/api/auth/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13388888888', purpose: 'login' }),
  });
  const verify = await request(app, '/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13388888888', code: '123456', purpose: 'login' }),
  });
  const cookie = verify.headers.get('set-cookie');
  assert.ok(cookie);
  return cookie;
}

async function resetWithUserResumeAssessmentAndPosition() {
  await prisma.matchResult.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.smsCode.deleteMany();
  await prisma.user.deleteMany({ where: { phone: '13388888888' } });
  const position = await prisma.position.upsert(mapPositionForSeed(MOCK_POSITIONS[0]));

  const user = await prisma.user.create({ data: { phone: '13388888888' } });
  await prisma.resume.create({
    data: {
      userId: user.id,
      name: '张三',
      school: '南京大学',
      major: '软件工程',
      graduationYear: '2027',
      skills: ['TypeScript'],
      internships: [],
      projects: [],
      inferredDirection: '后端开发',
      targetCities: ['南京'],
    },
  });
  await prisma.assessment.create({
    data: {
      userId: user.id,
      answers: { 1: 5 },
      typeTitle: '尽责稳定型',
      description: '稳定可靠',
      radarScores: [],
      industryFit: { stateOwned: 80, internet: 70 },
      hollandCode: 'RCI',
      hollandTags: ['现实型'],
      deepInterpretation: { summary: '适合稳健路径', advantages: ['执行力'] },
    },
  });
  return position.id;
}

async function testGuestOldBodyDoesNotWriteCache() {
  await prisma.matchResult.deleteMany();
  const app = createApp({ aiService: fakeAiService as any });
  const response = await request(app, '/api/match-position', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeData: {}, personalityResult: {}, position: MOCK_POSITIONS[0] }),
  });
  assert.equal(response.status, 200);
  assert.equal(await prisma.matchResult.count(), 0);
}

async function testLoggedInMatchWritesAndReusesCache() {
  const positionId = await resetWithUserResumeAssessmentAndPosition();
  const app = createApp({ aiService: fakeAiService as any });
  const cookie = await login(app);
  const first = await request(app, '/api/match-position', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ positionId }),
  });
  assert.equal(first.status, 200);
  assert.equal((await first.json()).cached, false);

  const second = await request(app, '/api/match-position', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ positionId }),
  });
  assert.equal(second.status, 200);
  assert.equal((await second.json()).cached, true);
  assert.equal(await prisma.matchResult.count(), 1);
}

const tests = [testGuestOldBodyDoesNotWriteCache, testLoggedInMatchWritesAndReusesCache];
for (const test of tests) await test();
console.log(`matchPosition.test.ts: ${tests.length} tests passed`);
