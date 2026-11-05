// Real PostgreSQL, auth, routes, browser and PDF. AI only is an explicit deterministic fixture.
import 'dotenv/config';
import assert from 'node:assert/strict';
import express from 'express';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createAiService } from '../../src/server/ai/aiService';
import type { AiProvider } from '../../src/server/ai/types';
import { CAREER_CATALOG } from '../../src/catalog';
import { MOCK_QUESTIONS } from '../../src/data';

const testUrl = process.env.TEST_DATABASE_URL;
assert.ok(testUrl, 'Dedicated TEST_DATABASE_URL required');
const parsed = new URL(testUrl);
assert.equal(parsed.hostname, '127.0.0.1');
assert.equal(parsed.port, '55437');
assert.equal(parsed.pathname, '/careermatch_flow_test', 'Refuse to mutate any other database');
process.env.DATABASE_URL = testUrl;
process.env.SMS_PROVIDER = 'dev';
process.env.DEV_SMS_CODE = '123456';
const { prisma } = await import('../../src/server/db/prisma');
const { seedPositions } = await import('../../prisma/seed');
const { createApp } = await import('../../src/server/app');
for (const table of ['matchResult', 'favorite', 'resume', 'assessment', 'session', 'smsCode', 'user', 'position'] as const) await (prisma[table] as { deleteMany: () => Promise<unknown> }).deleteMany();
await seedPositions();
let failResume = true, failAssessment = true, failFavorite = true, failMatch = true;
let matchCalls = 0;
const fixture: AiProvider = {
  name: 'zhipu', model: 'fixture-only', isConfigured: () => true,
  async parseResume(input) {
    return { name: '流程测试同学', school: '测试大学', major: '软件工程', graduationYear: '2027', skills: input.extractedText.includes('Python') ? ['Python'] : ['Java'], internships: [], projects: [{ name: '课程项目', role: '开发', tech: 'Java' }], inferredDirection: '软件开发', targetCities: ['南京'] };
  },
  async matchPosition(input) {
    matchCalls++;
    if (failMatch) { failMatch = false; throw new Error('Fixture match failure'); }
    const score = input.resumeData.skills?.includes('Python') ? 69 : 86;
    return { overallMatch: score, resumeMatch: score, personalityMatch: 80, resumeMatchExplanation: '测试夹具：技能证据', personalityMatchExplanation: '测试夹具：工作偏好', whyExcellent: '测试夹具：建议补充项目证明。' };
  },
  async chatAboutPosition() { return '测试夹具回复'; },
};
const app = express();
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/api/resumes' && failResume) { failResume = false; res.status(503).json({ error: '保存验证故障，请重试。' }); return; }
  if (req.method === 'POST' && req.path === '/api/assessments' && failAssessment) { failAssessment = false; res.status(503).json({ error: '测评保存验证故障，请重试。' }); return; }
  if (req.method === 'POST' && req.path.startsWith('/api/favorites/') && failFavorite) { failFavorite = false; res.status(503).json({ error: '收藏验证故障，请重试。' }); return; }
  next();
});
app.use(createApp({ aiService: createAiService([fixture]) }));
app.use(express.static('dist'));
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address();
assert(address && typeof address === 'object');
const base = `http://127.0.0.1:${address.port}`;
mkdirSync('.verification', { recursive: true });
const results: { check: string; passed: boolean }[] = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(15000);
const pass = (check: string) => { results.push({ check, passed: true }); console.log(`PASS: ${check}`); };
async function textVisible(text: string) { await page.getByText(text, { exact: true }).first().waitFor({ state: 'visible' }); }
async function login(phone: string) {
  await page.getByRole('button', { name: '手机号登录', exact: true }).first().click();
  await page.getByPlaceholder('请输入手机号', { exact: true }).fill(phone);
  await page.getByRole('button', { name: '获取验证码', exact: true }).click();
  await page.getByPlaceholder('请输入 6 位验证码', { exact: true }).fill('123456');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.locator('#user-profile-menu-btn').waitFor({ state: 'visible' });
}
try {
  await page.goto(base);
  await page.locator('#nav-item-browser').click();
  await textVisible('职业类型库');
  assert.equal(await page.getByText('代表性·', { exact: false }).count(), 0);
  await page.getByLabel('搜索职业或技能', { exact: true }).fill('不存在的职业zzz');
  await textVisible('没有符合条件的职业类型');
  await page.getByLabel('搜索职业或技能', { exact: true }).fill('');
  pass('career catalogue, search, honest employer/city/benefit display');
  await login('13900000001');
  await page.goto(base + '/#view=upload');
  await page.getByRole('button', { name: '粘贴文本', exact: true }).click();
  await page.getByLabel('简历正文', { exact: true }).fill('流程测试同学 软件工程 Java 课程项目');
  await page.getByRole('button', { name: '启动 AI 解析简历', exact: false }).click();
  await page.locator('#resume-confirm-btn').waitFor({ state: 'visible' });
  await page.locator('#resume-confirm-btn').click();
  await textVisible('简历保存失败');
  assert.equal(new URL(page.url()).hash, '#view=upload');
  assert.equal(await prisma.resume.count(), 0);
  await page.locator('#resume-confirm-btn').click();
  await textVisible('完成职业测评');
  assert.equal(await prisma.resume.count(), 1);
  pass('real phone login, resume save failure retains materials, retry persists');

  await page.getByRole('button', { name: /非常同意/ }).click();
  await textVisible('第 2 / 40 题');
  await page.getByRole('button', { name: '保存并退出', exact: true }).click();
  await page.locator('#matching-step-assessment').click();
  await textVisible('第 2 / 40 题');
  await page.reload();
  await textVisible('第 2 / 40 题');
  pass('assessment draft save-and-exit and refresh restore');
  for (let index = 1; index < MOCK_QUESTIONS.length; index++) {
    await page.getByRole('button', { name: /非常同意/ }).click();
    if (index < MOCK_QUESTIONS.length - 1) await textVisible(`第 ${index + 2} / 40 题`);
  }
  await textVisible('测评尚未完成保存');
  assert.equal(await prisma.assessment.count(), 0);
  await page.getByRole('button', { name: '重新保存测评', exact: true }).click();
  await textVisible('测评结果');
  assert.equal(new URL(page.url()).hash, '#view=assessment-result');
  await page.locator('#see-matches-btn').click();
  await textVisible('职业方向与候选类型');
  assert.equal(await prisma.assessment.count(), 1);
  pass('assessment failure/retry and server-side recomputation');

  const career = CAREER_CATALOG[0];
  await page.goto(`${base}/#position=${career.id}`);
  await textVisible('AI 诊断解释暂不可用');
  await page.getByRole('button', { name: '重新生成', exact: true }).click();
  await textVisible('推荐');
  assert.equal(await prisma.matchResult.count(), 1);
  const cached = await prisma.matchResult.findFirstOrThrow();
  assert.equal(cached.provider, 'zhipu');
  assert.equal(cached.model, 'fixture-only');
  await page.getByRole('button', { name: '收藏职业', exact: true }).click();
  await textVisible('收藏操作未完成');
  assert.equal(await prisma.favorite.count(), 0);
  await page.getByRole('button', { name: '收藏职业', exact: true }).click();
  await textVisible('已收藏');
  await page.reload();
  await textVisible('已收藏');
  await textVisible('推荐');
  await page.locator('#nav-item-profile').click();
  await page.getByRole('button', { name: '我的收藏', exact: false }).click();
  await page.getByRole('button', { name: career.title, exact: true }).click();
  await textVisible('岗位诊断报告');
  pass('diagnosis retry, server cache, real favorite persistence and profile list');

  await page.getByRole('button', { name: '分享职业链接', exact: true }).click();
  const shared = await page.getByLabel('公开链接', { exact: true }).inputValue();
  assert.equal(new URL(shared).hash, `#position=${career.id}`);
  assert.equal(new URL(shared).search, '');
  await page.evaluate("Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async function() { throw new Error('denied'); } } })");
  await page.getByRole('button', { name: '复制网址链接', exact: false }).click();
  await textVisible('未能复制。请选中下方链接，手动复制。');
  assert.equal(await page.getByText('链接已复制', { exact: true }).count(), 0);
  await page.keyboard.press('Escape');
  const stranger = await browser.newContext();
  const publicPage = await stranger.newPage();
  await publicPage.goto(shared);
  await publicPage.getByText('还没有完整的诊断材料', { exact: true }).waitFor({ state: 'visible' });
  assert.equal(await publicPage.getByText('流程测试同学', { exact: false }).count(), 0);
  await stranger.close();
  pass('public career deep link excludes personal report; clipboard denial is visible');

  await page.getByRole('button', { name: '导出 PDF 报告', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '生成 PDF', exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs('.verification/diagnosis-fixture.pdf');
  assert.equal(readFileSync('.verification/diagnosis-fixture.pdf').subarray(0, 5).toString(), '%PDF-');
  pass('authenticated export with real Chromium PDF bytes (fixture AI)');

  const beforeUpdate = matchCalls;
  await page.goto(base + '/#view=upload');
  await page.getByRole('button', { name: '重新上传', exact: true }).click();
  await page.getByRole('button', { name: '粘贴文本', exact: true }).click();
  await page.getByLabel('简历正文', { exact: true }).fill('流程测试同学 软件工程 Python 课程项目');
  await page.getByRole('button', { name: '启动 AI 解析简历', exact: false }).click();
  await page.locator('#resume-confirm-btn').waitFor({ state: 'visible' });
  await page.locator('#resume-confirm-btn').click();
  await textVisible('职业方向与候选类型');
  await page.goto(`${base}/#position=${career.id}`);
  await textVisible('谨慎');
  assert.ok(matchCalls > beforeUpdate, 'Same-name resume update must call fresh matching');
  pass('same-name changed skills invalidate diagnosis');

  let releaseLate!: () => void;
  let observed!: () => void;
  const gate = new Promise<void>(resolve => { releaseLate = resolve; });
  const started = new Promise<void>(resolve => { observed = resolve; });
  await page.route('**/api/resumes/latest', async route => {
    const response = await route.fetch(); observed(); await gate;
    await route.fulfill({ response }).catch(() => {});
  });
  await page.goto(`${base}/#view=profile`);
  await page.reload();
  await Promise.race([started, new Promise((_, reject) => setTimeout(() => reject(new Error('Delayed resume request did not start')), 15000))]);
  await page.locator('#user-profile-menu-btn').click();
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  releaseLate();
  await page.unroute('**/api/resumes/latest');
  await login('13900000002');
  await page.locator('#nav-item-profile').click();
  await page.getByRole('button', { name: '我的简历', exact: true }).click();
  await textVisible('还没有简历档案');
  assert.equal(await page.getByText('流程测试同学', { exact: false }).count(), 0);
  pass('logout/login account isolation, including late old resume response');

  const me = await (await page.request.get(base + '/api/me')).json();
  const a = await prisma.user.findUniqueOrThrow({ where: { phone: '13900000001' } });
  const existingA = await prisma.resume.count({ where: { userId: a.id } });
  const material = await fixture.parseResume({ extractedText: 'Python', sourceType: 'text' });
  assert.equal((await page.request.post(base + '/api/resumes', { data: { resume: material } })).status(), 200);
  await page.goto(base + '/#view=profile');
  await page.reload();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '删除全部简历记录', exact: true }).click();
  await page.getByText('流程测试同学', { exact: true }).first().waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '我的简历', exact: true }).click();
  await textVisible('还没有简历档案');
  assert.equal(await prisma.resume.count({ where: { userId: me.user.id } }), 0);
  assert.equal(await prisma.resume.count({ where: { userId: a.id } }), existingA);
  pass('confirmed material deletion clears current account and preserves another account');

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['#view=landing', '#view=browser', '#view=profile', `#position=${career.id}`]) {
      await page.goto(base + '/' + route);
      await page.waitForTimeout(400);
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      assert.ok(dimensions.scroll <= dimensions.client, `Horizontal overflow at ${width}, ${route}`);
      if (width === 375 || width === 1440) await page.screenshot({ path: `.verification/${route.includes('position') ? 'career' : route.split('=')[1]}-${width}.png`, fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
  pass('four viewport widths, key pages, no page exceptions');
} catch (error) {
  await page.screenshot({ path: '.verification/failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally {
  writeFileSync('.verification/browser-results.json', JSON.stringify({ ai: 'fixture-only', database: 'real isolated PostgreSQL', results, pageErrors: errors }, null, 2));
  await browser.close();
  await new Promise<void>(resolve => server.close(() => resolve()));
  await prisma.$disconnect();
}
