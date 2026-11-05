import { MOCK_QUESTIONS } from '../../src/data';
import { calculatePersonalityResult } from '../../src/lib/assessmentHelper';
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
        _warnings: ['OCR warning'],
        id: 'client-chosen-id',
        userId: 'another-user',
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
  assert.equal(await prisma.resume.count({ where: { id: 'client-chosen-id' } }), 0);

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
      scores: Object.fromEntries(MOCK_QUESTIONS.map(q => [q.id, 5])),
    }),
  });
  assert.equal(assessmentResponse.status, 200);
  const savedAssessment = await assessmentResponse.json();
  assert.equal(savedAssessment.assessment.personalityResult.typeTitle, calculatePersonalityResult(Object.fromEntries(MOCK_QUESTIONS.map(q => [q.id, 5]))).typeTitle);
  const invalid = await request(app, '/api/assessments', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ scores: { 1: 5 }, personalityResult: { typeTitle: '伪造结果' } }) });
  assert.equal(invalid.status, 400);

  const positions = await request(app, '/api/positions?pageSize=1');
  const positionBody = await positions.json();
  assert.equal(positions.status, 200);
  assert.equal(positionBody.positions.length, 1);

  const favorite = await request(app, `/api/favorites/${positionId}`, { method: 'POST', headers: { cookie } });
  assert.equal(favorite.status, 200);
  const favorites = await request(app, '/api/favorites', { headers: { cookie } });
  assert.deepEqual((await favorites.json()).positionIds, [positionId]);
  const owner = await prisma.user.findUniqueOrThrow({ where: { phone: '13388888888' } });
  const other = await prisma.user.upsert({ where: { phone: '13900000999' }, create: { phone: '13900000999' }, update: {} });
  const ownedResume = await prisma.resume.findFirstOrThrow({ where: { userId: owner.id } });
  const ownedAssessment = await prisma.assessment.findFirstOrThrow({ where: { userId: owner.id } });
  const { id: _resumeId, createdAt: _created, updatedAt: _updated, ...resumeFields } = ownedResume;
  const { id: _assessmentId, createdAt: _assessmentCreated, ...assessmentFields } = ownedAssessment;
  await prisma.resume.create({ data: { ...resumeFields, userId: other.id } });
  await prisma.assessment.create({ data: { ...assessmentFields, userId: other.id } });
  assert.equal((await request(app, '/api/resumes', { method: 'DELETE' })).status, 401);
  assert.equal((await request(app, '/api/assessments', { method: 'DELETE' })).status, 401);
  assert.equal((await request(app, '/api/resumes', { method: 'DELETE', headers: { cookie } })).status, 200);
  assert.equal((await request(app, '/api/assessments', { method: 'DELETE', headers: { cookie } })).status, 200);
  assert.equal(await prisma.resume.count({ where: { userId: owner.id } }), 0);
  assert.equal(await prisma.assessment.count({ where: { userId: owner.id } }), 0);
  assert.equal(await prisma.resume.count({ where: { userId: other.id } }), 1);
  assert.equal(await prisma.assessment.count({ where: { userId: other.id } }), 1);
}

const tests = [testProfileResumeAssessmentAndFavorites];
for (const test of tests) await test();
console.log(`dataRoutes.test.ts: ${tests.length} tests passed`);
