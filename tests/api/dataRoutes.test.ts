import assert from 'node:assert/strict';
import { prisma } from '../../src/server/db/prisma';
import { createApp } from '../../src/server/app';
import { mapPositionForSeed } from '../../prisma/seed';
import { MOCK_POSITIONS } from '../../src/data';

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

async function reset(): Promise<string> {
  await prisma.matchResult.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.smsCode.deleteMany();
  await prisma.user.deleteMany({ where: { phone: '13388888888' } });
  await prisma.position.upsert(mapPositionForSeed(MOCK_POSITIONS[0]));
  // The DB row gets a Prisma cuid id (different from MOCK_POSITIONS[0].id). Return the real DB id
  // so the favorite test uses a valid FK target.
  const seeded = await prisma.position.findUnique({
    where: {
      company_title_city: {
        company: MOCK_POSITIONS[0].company,
        title: MOCK_POSITIONS[0].title,
        city: MOCK_POSITIONS[0].city,
      },
    },
    select: { id: true },
  });
  assert(seeded, 'seeded position not found');
  return seeded.id;
}

async function testProfileResumeAssessmentAndFavorites() {
  const positionId = await reset();
  const app = createApp();
  const cookie = await login(app);

  const patchMe = await request(app, '/api/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ name: '张三', school: '南京大学', major: '软件工程', graduationYear: '2027' }),
  });
  assert.equal(patchMe.status, 200);
  assert.equal((await patchMe.json()).user.name, '张三');

  const resumeResponse = await request(app, '/api/resumes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      resume: {
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
    }),
  });
  assert.equal(resumeResponse.status, 200);

  const latestResume = await request(app, '/api/resumes/latest', { headers: { cookie } });
  assert.equal((await latestResume.json()).resume.name, '张三');

  const assessmentResponse = await request(app, '/api/assessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      personalityResult: {
        typeTitle: '尽责稳定型',
        description: '稳定可靠',
        radarScores: [],
        industryFit: { stateOwned: 80, internet: 70 },
        hollandCode: 'RCI',
        hollandTags: ['现实型'],
        deepInterpretation: { summary: '适合稳健路径', advantages: ['执行力'] },
      },
      scores: { 1: 5 },
    }),
  });
  assert.equal(assessmentResponse.status, 200);

  const positions = await request(app, '/api/positions?pageSize=1');
  const positionBody = await positions.json();
  assert.equal(positions.status, 200);
  assert.equal(positionBody.positions.length, 1);

  const favorite = await request(app, `/api/favorites/${positionId}`, { method: 'POST', headers: { cookie } });
  assert.equal(favorite.status, 200);
  const favorites = await request(app, '/api/favorites', { headers: { cookie } });
  assert.deepEqual((await favorites.json()).positionIds, [positionId]);
}

const tests = [testProfileResumeAssessmentAndFavorites];
for (const test of tests) await test();
console.log(`dataRoutes.test.ts: ${tests.length} tests passed`);
