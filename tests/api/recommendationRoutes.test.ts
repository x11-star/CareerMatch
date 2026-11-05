import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { prisma } from '../../src/server/db/prisma';
import { createApp } from '../../src/server/app';
import { hashSessionToken } from '../../src/server/auth/hash';
import { AUTH_COOKIE_NAME } from '../../src/server/http/cookies';
import { DEFAULT_RESUME_DATA } from '../../src/data';
import { EMPTY_PREFERENCES } from '../../src/lib/careerPreferences';
import { recommendCareers } from '../../src/lib/careerRecommendation';
import { CAREER_CATALOG } from '../../src/catalog';

// This file is loaded by the API runner, after it switches to and migrates the dedicated test DB.
assert.equal(new URL(process.env.DATABASE_URL!).pathname, '/careermatch_flow_test');
const phones = ['13900000871', '13900000872'];
await prisma.user.deleteMany({ where: { phone: { in: phones } } });
async function session(phone: string) {
  const user = await prisma.user.create({ data: { phone } });
  const token = randomBytes(24).toString('hex');
  await prisma.session.create({ data: { userId: user.id, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 60000) } });
  return { user, cookie: `${AUTH_COOKIE_NAME}=${token}` };
}
const a = await session(phones[0]), b = await session(phones[1]);
const server = createApp().listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address();
assert(address && typeof address === 'object');
const base = `http://127.0.0.1:${address.port}`;
async function request(path: string, cookie?: string, method = 'GET', body?: unknown) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
const material = { ...DEFAULT_RESUME_DATA, skills: ['Python', 'SQL'], qualifications: { degree: '本科', languages: ['英语六级'], certificates: [], evidence: ['用 Python 清理课程问卷数据'] } };
try {
  for (const path of ['/api/preferences', '/api/recommendations']) assert.equal((await request(path)).status, 401);
  assert.equal((await request('/api/preferences', undefined, 'PUT', { preferences: {} })).status, 401);
  assert.equal((await request('/api/recommendations', a.cookie)).status, 409);
  assert.deepEqual((await request('/api/preferences', a.cookie)).body.preferences, EMPTY_PREFERENCES);
  const saved = await request('/api/resumes', a.cookie, 'POST', { resume: material, userId: b.user.id });
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.resume.qualifications, material.qualifications);
  assert.equal(await prisma.resume.count({ where: { userId: b.user.id } }), 0);
  const preferences = { ...EMPTY_PREFERENCES, industries: ['互联网'], excludedCategories: ['金融财务类'], targetCities: ['南京'], salaryExpectation: '月薪 10K', priorities: ['成长'] };
  assert.equal((await request('/api/preferences', a.cookie, 'PUT', { preferences, userId: b.user.id })).status, 200);
  assert.deepEqual((await request('/api/preferences', a.cookie)).body.preferences, preferences);
  assert.deepEqual((await request('/api/preferences', b.cookie)).body.preferences, EMPTY_PREFERENCES);
  for (const payload of [{}, { preferences: null }, { preferences: { industries: '互联网' } }, { preferences: { industries: ['伪造行业'] } }, { preferences: { categories: ['技术类'], excludedCategories: ['技术类'] } }]) {
    assert.equal((await request('/api/preferences', a.cookie, 'PUT', payload)).status, 400);
    assert.deepEqual((await request('/api/preferences', a.cookie)).body.preferences, preferences);
  }
  const recommendation = await request(`/api/recommendations?userId=${b.user.id}`, a.cookie);
  assert.equal(recommendation.status, 200);
  assert.deepEqual(recommendation.body, recommendCareers(material, preferences, CAREER_CATALOG));
  assert(recommendation.body.recommendations.length > 0 && recommendation.body.recommendations.length <= 10);
  assert(recommendation.body.recommendations.every((r: any) => r.position.category !== '金融财务类'));
  assert.equal((await request(`/api/recommendations?userId=${a.user.id}`, b.cookie)).status, 409);
  assert.equal((await request('/api/me/import-local-data', b.cookie, 'POST', { preferences: { industries: ['不存在'] }, resume: material })).status, 400);
  assert.equal(await prisma.resume.count({ where: { userId: b.user.id } }), 0);
  const imported = await request('/api/me/import-local-data', b.cookie, 'POST', { preferences, resume: material });
  assert.equal(imported.status, 200);
  assert.equal(imported.body.imported.preferences, true);
  assert.deepEqual((await request('/api/preferences', b.cookie)).body.preferences, preferences);
  assert.deepEqual((await request('/api/resumes/latest', b.cookie)).body.resume.qualifications, material.qualifications);
  assert.equal((await request('/api/resumes/latest', b.cookie, 'PUT', { resume: { ...DEFAULT_RESUME_DATA, name: '只填昵称' } })).status, 200);
  assert.deepEqual((await request('/api/resumes/latest', b.cookie)).body.resume.qualifications, { degree: '', languages: [], certificates: [], evidence: [] });
  assert.equal((await request('/api/resumes', a.cookie, 'POST', { resume: { ...material, qualifications: { degree: '编造学历' } } })).status, 400);
  assert.equal((await request('/api/preferences', a.cookie, 'PUT', { preferences: {} })).status, 200);
  assert.deepEqual((await request('/api/preferences', a.cookie)).body.preferences, EMPTY_PREFERENCES);
  console.log('recommendationRoutes.test.ts: persistence, validation, guest import, legacy fields, identity isolation and server-owned materials passed');
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
  await prisma.user.deleteMany({ where: { phone: { in: phones } } });
}
