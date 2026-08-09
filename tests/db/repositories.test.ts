import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { mapPositionForSeed } from '../../prisma/seed';
import { mapPrismaError, UniqueConstraintError } from '../../src/server/db/errors';
import { prisma } from '../../src/server/db/prisma';
import { createAssessment, getAssessmentByIdForUser, getLatestAssessmentByUserId } from '../../src/server/repositories/assessmentsRepository';
import { addFavorite, isFavorite, listFavoritesByUserId, removeFavorite } from '../../src/server/repositories/favoritesRepository';
import { createMatchResult, findCachedMatchResult } from '../../src/server/repositories/matchResultsRepository';
import { countPositions, getPositionById, listPositions } from '../../src/server/repositories/positionsRepository';
import { createResume, getLatestResumeByUserId, getResumeByIdForUser, updateLatestResumeByUserId } from '../../src/server/repositories/resumesRepository';
import { createSession, deleteSessionByTokenHash, findSessionByTokenHash, touchSession } from '../../src/server/repositories/sessionsRepository';
import { createSmsCode, findLatestSmsCode, incrementSmsCodeAttempts, markSmsCodeConsumed } from '../../src/server/repositories/smsCodesRepository';
import { createUser, deleteUser, findUserByPhone, updateUserPhone, updateUserProfile, upsertUserByPhone } from '../../src/server/repositories/usersRepository';

async function cleanDatabase() {
  await prisma.matchResult.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.position.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.session.deleteMany();
  await prisma.smsCode.deleteMany();
  await prisma.user.deleteMany();
}

async function testDatabaseIsReachable() {
  const result = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;
  assert.equal(Number(result[0]?.ok), 1);
}

function testUniqueConstraintErrorMapping() {
  const error = new Prisma.PrismaClientKnownRequestError('Unique failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['phone'] },
  });
  const mapped = mapPrismaError(error);
  assert.ok(mapped instanceof UniqueConstraintError);
  assert.deepEqual(mapped.target, ['phone']);
}

function testPositionSeedMappingKeepsStableUpsertKey() {
  const mapped = mapPositionForSeed({
    id: 'pos-0001',
    title: '后端开发工程师',
    company: '示例科技',
    city: '北京',
    type: 'internet',
    industry: '互联网',
    category: '技术类',
    subIndustry: '工具与SaaS',
    subCategory: '开发 (Java/C++/Go/前端)',
    overallMatch: 90,
    resumeMatch: 88,
    personalityMatch: 92,
    salaryRange: '20-30k',
    difficultyRating: 4,
    tags: ['校招'],
    summary: '负责后端服务开发。',
    responsibilities: ['开发 API'],
    requirements: ['TypeScript', 'SQL'],
    softSkills: ['沟通协作'],
    salaryDetail: '20-30k',
    careerPath: ['工程师', '高级工程师'],
    fitPersonality: ['尽责性高'],
    howToPrepare: { timeline: ['9月网申'], exam: '技术笔试', interview: '项目深挖' },
    relatedJobs: [],
  });

  assert.equal(mapped.where.company_title_city.company, '示例科技');
  assert.equal(mapped.where.company_title_city.title, '后端开发工程师');
  assert.equal(mapped.where.company_title_city.city, '北京');
  assert.equal(mapped.create.difficultyRating, '4');
}

async function testUsersRepositoryCreatesFindsAndUpsertsUsers() {
  await cleanDatabase();

  const created = await createUser({
    phone: '13800138000',
    name: '张三',
    school: '南京大学',
    major: '软件工程',
    graduationYear: '2027',
  });
  assert.equal(created.phone, '13800138000');

  const found = await findUserByPhone('13800138000');
  assert.equal(found?.id, created.id);

  const upserted = await upsertUserByPhone({
    phone: '13800138000',
    name: '张三更新',
  });
  assert.equal(upserted.id, created.id);
  assert.equal(upserted.name, '张三更新');

  const updated = await updateUserProfile(created.id, { school: '复旦大学' });
  assert.equal(updated.school, '复旦大学');

  await deleteUser(created.id);
  assert.equal(await findUserByPhone('13800138000'), null);
}

async function testUpdateUserPhoneUpdatesAndEnforcesUnique() {
  await cleanDatabase();

  const userA = await createUser({ phone: '13800139000' });
  await createUser({ phone: '13800139001' });

  const updated = await updateUserPhone(userA.id, '13800139099');
  assert.equal(updated.phone, '13800139099');
  assert.equal((await findUserByPhone('13800139099'))?.id, userA.id);

  await assert.rejects(
    () => updateUserPhone(userA.id, '13800139001'),
    (error: unknown) => {
      assert.ok(error instanceof UniqueConstraintError, 'should be UniqueConstraintError');
      assert.ok((error as UniqueConstraintError).target.includes('phone'), 'target should include phone');
      return true;
    },
  );
}

async function testSmsCodeRepositoryStoresAndConsumesHashOnly() {
  await cleanDatabase();

  const code = await createSmsCode({
    phone: '13800138001',
    codeHash: 'hashed-code',
    purpose: 'login',
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
  });
  assert.equal(code.codeHash, 'hashed-code');

  const latest = await findLatestSmsCode('13800138001', 'login');
  assert.equal(latest?.id, code.id);

  const attempted = await incrementSmsCodeAttempts(code.id);
  assert.equal(attempted.attempts, 1);

  const consumed = await markSmsCodeConsumed(code.id);
  assert.ok(consumed.consumedAt);
}

async function testSessionRepositoryStoresTokenHashAndTouch() {
  await cleanDatabase();

  const user = await createUser({ phone: '13800138002' });
  const session = await createSession({
    userId: user.id,
    tokenHash: 'hashed-token',
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    userAgent: 'tests',
    ipAddress: '127.0.0.1',
  });
  assert.equal(session.tokenHash, 'hashed-token');

  const found = await findSessionByTokenHash('hashed-token');
  assert.equal(found?.id, session.id);

  const touched = await touchSession('hashed-token', new Date('2030-01-01T00:01:00.000Z'));
  assert.equal(touched.lastSeenAt?.toISOString(), '2030-01-01T00:01:00.000Z');

  await deleteSessionByTokenHash('hashed-token');
  assert.equal(await findSessionByTokenHash('hashed-token'), null);
}

async function testResumeRepositoryRequiresUserScope() {
  await cleanDatabase();

  const owner = await createUser({ phone: '13800138100' });
  const other = await createUser({ phone: '13800138101' });
  const resume = await createResume(owner.id, {
    name: '李四',
    school: '浙江大学',
    major: '计算机科学',
    graduationYear: '2027',
    skills: ['TypeScript', 'PostgreSQL'],
    internships: [],
    projects: [],
    inferredDirection: '后端开发',
    targetCities: ['杭州'],
    rawText: '完整简历文本',
    sourceFileName: 'resume.txt',
    sourceFileType: 'text',
  });

  const latest = await getLatestResumeByUserId(owner.id);
  assert.equal(latest?.id, resume.id);

  const crossUserRead = await getResumeByIdForUser(other.id, resume.id);
  assert.equal(crossUserRead, null);

  const updated = await updateLatestResumeByUserId(owner.id, { inferredDirection: '平台研发' });
  assert.equal(updated?.inferredDirection, '平台研发');
}

async function testAssessmentRepositoryRequiresUserScope() {
  await cleanDatabase();

  const owner = await createUser({ phone: '13800138102' });
  const other = await createUser({ phone: '13800138103' });
  const assessment = await createAssessment(owner.id, {
    answers: [{ id: 1, score: 5 }],
    typeTitle: '尽责稳定型',
    description: '适合长期复杂任务。',
    radarScores: [{ dimension: 'C', score: 90, avg: 65 }],
    industryFit: { stateOwned: 80, internet: 75 },
    hollandCode: 'RCI',
    hollandTags: ['现实型', '常规型', '研究型'],
    deepInterpretation: { summary: '稳定', advantages: ['可靠'] },
  });

  const latest = await getLatestAssessmentByUserId(owner.id);
  assert.equal(latest?.id, assessment.id);

  const crossUserRead = await getAssessmentByIdForUser(other.id, assessment.id);
  assert.equal(crossUserRead, null);
}

async function testMatchResultRepositoryCachesByHashes() {
  await cleanDatabase();

  const user = await createUser({ phone: '13800138104' });
  const resume = await createResume(user.id, {
    name: '王五',
    school: '上海交通大学',
    major: '软件工程',
    graduationYear: '2027',
    skills: ['Node.js'],
    internships: [],
    projects: [],
    inferredDirection: '后端开发',
    targetCities: ['上海'],
  });
  const assessment = await createAssessment(user.id, {
    answers: [],
    typeTitle: '探索执行型',
    description: '学习快。',
    radarScores: [],
    industryFit: { stateOwned: 70, internet: 85 },
    hollandCode: 'IRC',
    hollandTags: ['研究型'],
    deepInterpretation: { summary: '探索', advantages: [] },
  });
  const position = await prisma.position.create({
    data: {
      title: '后端开发工程师',
      company: '示例科技',
      city: '上海',
      type: 'internet',
      tags: ['校招'],
      summary: '负责后端服务。',
      responsibilities: ['开发 API'],
      requirements: ['Node.js'],
      softSkills: ['协作'],
    },
  });

  await createMatchResult({
    userId: user.id,
    resumeId: resume.id,
    assessmentId: assessment.id,
    positionId: position.id,
    resumeHash: 'resume-hash',
    assessmentHash: 'assessment-hash',
    resumeMatch: 82,
    personalityMatch: 76,
    overallMatch: 80,
    resumeMatchExplanation: '技能匹配。',
    personalityMatchExplanation: '性格匹配。',
    whyExcellent: '基础扎实。',
    provider: 'zhipu',
    model: 'glm-4-flash',
  });

  const cached = await findCachedMatchResult({
    userId: user.id,
    resumeId: resume.id,
    assessmentId: assessment.id,
    positionId: position.id,
    resumeHash: 'resume-hash',
    assessmentHash: 'assessment-hash',
  });
  assert.equal(cached?.overallMatch, 80);
}

let positionCounter = 0;
async function createTestPosition(overrides: Partial<Parameters<typeof prisma.position.create>[0]['data']> = {}) {
  positionCounter += 1;
  return prisma.position.create({
    data: {
      title: 'AI产品经理',
      company: `示例公司${positionCounter}`,
      city: '北京',
      type: 'internet',
      industry: '互联网',
      category: '产品类',
      tags: ['校招'],
      summary: '负责 AI 产品。',
      responsibilities: ['需求分析'],
      requirements: ['SQL'],
      softSkills: ['沟通'],
      ...overrides,
    },
  });
}

async function testPositionsRepositoryFiltersAndPaginates() {
  await cleanDatabase();

  const first = await createTestPosition({ title: 'AI产品经理', city: '北京' });
  await createTestPosition({ title: '后端开发工程师', city: '上海', category: '技术类' });

  const positions = await listPositions({ q: 'AI', city: '北京', page: 1, pageSize: 100 });
  assert.equal(positions.length, 1);
  assert.equal(positions[0].id, first.id);

  const count = await countPositions({ city: '北京' });
  assert.equal(count, 1);

  const byId = await getPositionById(first.id);
  assert.equal(byId?.title, 'AI产品经理');
}

async function testFavoritesRepositoryIsIdempotent() {
  await cleanDatabase();

  const user = await createUser({ phone: '13800138200' });
  const position = await createTestPosition({ company: '收藏测试公司' });

  await addFavorite(user.id, position.id);
  await addFavorite(user.id, position.id);

  const favorites = await listFavoritesByUserId(user.id);
  assert.equal(favorites.length, 1);
  assert.equal(await isFavorite(user.id, position.id), true);

  await removeFavorite(user.id, position.id);
  assert.equal(await isFavorite(user.id, position.id), false);
}

const tests = [
  testDatabaseIsReachable,
  testUniqueConstraintErrorMapping,
  testPositionSeedMappingKeepsStableUpsertKey,
  testUsersRepositoryCreatesFindsAndUpsertsUsers,
  testUpdateUserPhoneUpdatesAndEnforcesUnique,
  testSmsCodeRepositoryStoresAndConsumesHashOnly,
  testSessionRepositoryStoresTokenHashAndTouch,
  testResumeRepositoryRequiresUserScope,
  testAssessmentRepositoryRequiresUserScope,
  testMatchResultRepositoryCachesByHashes,
  testPositionsRepositoryFiltersAndPaginates,
  testFavoritesRepositoryIsIdempotent,
];

for (const test of tests) {
  await test();
}

console.log(`repositories.test.ts: ${tests.length} tests passed`);
