// Real PostgreSQL, real routes and Chromium. No AI provider is enabled or called.
import 'dotenv/config';
import assert from 'node:assert/strict';
import express from 'express';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { createAiService } from '../../src/server/ai/aiService';

const testUrl = new URL(process.env.TEST_DATABASE_URL!);
assert.equal(testUrl.hostname, '127.0.0.1');
assert.equal(testUrl.port, '55437');
assert.equal(testUrl.pathname, '/careermatch_flow_test');
process.env.DATABASE_URL = testUrl.toString();
process.env.SMS_PROVIDER = 'dev';
process.env.DEV_SMS_CODE = '123456';
const { prisma } = await import('../../src/server/db/prisma');
const { createApp } = await import('../../src/server/app');
const phones = ['13900000781', '13900000782'];
await prisma.user.deleteMany({ where: { phone: { in: phones } } });
await prisma.smsCode.deleteMany({ where: { phone: { in: phones } } });
let failPreferences = false;
let aiCalls = 0;
const app = express();
app.use((req, res, next) => {
  if (['/api/parse-resume', '/api/match-position', '/api/position-chat'].includes(req.path)) aiCalls++;
  if (req.method === 'PUT' && req.path === '/api/preferences' && failPreferences) { failPreferences = false; res.status(503).json({ error: '偏好保存验证故障，请重试。' }); return; }
  next();
});
app.use(createApp({ aiService: createAiService([]) }));
app.use(express.static('dist'));
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address();
assert(address && typeof address === 'object');
const base = `http://127.0.0.1:${address.port}`;
mkdirSync('.verification', { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('dialog', dialog => dialog.accept());
const errors: string[] = [], results: string[] = [];
page.on('pageerror', e => errors.push(e.message));
const visible = (text: string) => page.getByText(text, { exact: true }).first().waitFor({ state: 'visible' });
const save = () => page.getByRole('button', { name: '保存偏好并查看推荐', exact: true }).click();
const finished = () => page.locator('ol[aria-label="推荐岗位"] > li').first().waitFor({ state: 'visible' });
async function editSkills(skills: string) {
  await page.getByRole('button', { name: '编辑', exact: true }).nth(1).click();
  await page.getByLabel('技能标签').fill(skills);
  await page.getByRole('button', { name: '保存更改', exact: true }).click();
}
async function login(phone: string) {
  if (await page.locator('#user-profile-menu-btn').isVisible()) {
    await page.locator('#user-profile-menu-btn').click();
    await page.getByRole('button', { name: '登录并同步游客材料', exact: true }).click();
  } else await page.getByRole('button', { name: '手机号登录', exact: true }).first().click();
  await page.getByPlaceholder('请输入手机号', { exact: true }).fill(phone);
  await page.getByRole('button', { name: '获取验证码', exact: true }).click();
  await page.getByPlaceholder('请输入 6 位验证码', { exact: true }).fill('123456');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.locator('#user-profile-menu-btn').waitFor({ state: 'visible' });
}
try {
  await page.goto(base + '/#view=upload');
  assert.equal(await page.locator('nav').first().locator('[id^="nav-item-"]').count(), 3);
  assert.equal(await page.locator('#nav-item-upload, #nav-item-assessment, #nav-item-results').count(), 0);
  assert(await page.locator('#matching-step-assessment').isDisabled());
  assert(await page.locator('#matching-step-results').isDisabled());
  await page.goto(base + '/#view=results');
  await visible('先完善个人材料');
  await page.getByRole('button', { name: '完善个人材料', exact: true }).click();
  await page.getByRole('button', { name: '手动填写', exact: true }).click();
  await page.locator('#resume-confirm-btn').click();
  await visible('简历保存失败');
  assert.equal(new URL(page.url()).hash, '#view=upload');
  await page.getByRole('button', { name: '编辑', exact: true }).first().click();
  await page.getByLabel('姓名', { exact: true }).fill('推荐流程测试');
  await page.getByLabel('就读专业', { exact: true }).fill('计算机科学');
  await page.getByRole('button', { name: '保存更改', exact: true }).click();
  await editSkills('Python, SQL');
  await page.getByLabel('学历', { exact: true }).selectOption('本科');
  await page.getByLabel('经历与成果证据', { exact: false }).fill('使用 Python 清理课程问卷数据');
  await page.locator('#resume-confirm-btn').click();
  await visible('完成职业测评');
  await page.goto(base + '/#view=results');
  await visible('完成性格测评后查看推荐');
  await page.getByRole('button', { name: '继续性格测评', exact: true }).click();
  for (let index = 0; index < 40; index++) {
    await page.getByRole('button', { name: /非常同意/ }).click();
    if (index < 39) await visible(`第 ${index + 2} / 40 题`);
  }
  await page.getByRole('heading', { name: '测评结果', exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, '#view=assessment-result');
  assert.equal(await page.locator('#matching-step-assessment').innerText().then(t => t.includes('测评结果')), true);
  await page.reload();
  await page.getByRole('heading', { name: '测评结果', exact: true }).waitFor();
  await page.locator('#see-matches-btn').click();
  await visible('职业方向与候选类型');
  await finished();
  assert.equal(new URL(page.url()).hash, '#view=results');
  await page.getByRole('button', { name: '查看测评结果', exact: true }).click();
  await page.getByRole('dialog', { name: '测评结果', exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, '#view=results');
  assert.equal(await page.locator('#matching-step-results').getAttribute('aria-current'), 'step');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(new URL(page.url()).hash, '#view=results');
  results.push('assessment completion shows saved result before recommendations; review dialog keeps step 3 and closes with Esc');
  await page.getByRole('group', { name: '偏好行业', exact: true }).getByLabel('互联网', { exact: true }).check();
  await page.getByRole('group', { name: '想探索的类别', exact: true }).getByLabel('技术类', { exact: true }).check();
  await page.getByRole('group', { name: '暂不考虑的类别', exact: true }).getByLabel('金融财务类', { exact: true }).check();
  await save(); await finished();
  const guest = await page.evaluate(() => {
    const id = localStorage.getItem('guest_uid')!;
    return { id, preferences: JSON.parse(localStorage.getItem(`preferences_${id}`)!), resume: JSON.parse(localStorage.getItem(`resume_${id}`)!) };
  });
  assert.deepEqual(guest.preferences.industries, ['互联网']);
  assert.equal(guest.resume.qualifications.degree, '本科');
  const guestFirst = await page.locator('ol[aria-label="推荐岗位"] > li h2').first().innerText();
  await page.reload(); await finished();
  await page.goto(base + '/#view=landing');
  await page.getByRole('button', { name: '查看我的推荐', exact: true }).click();
  await finished();
  assert.equal(await page.locator('ol[aria-label="推荐岗位"] > li h2').first().innerText(), guestFirst);
  assert(await page.getByRole('group', { name: '偏好行业', exact: true }).getByLabel('互联网', { exact: true }).isChecked());
  results.push('manual materials, missing fields accepted as unknown, guest preferences and refresh persistence');

  await login(phones[0]);
  await page.goto(base + '/#view=results'); await finished();
  const account = await prisma.user.findUniqueOrThrow({ where: { phone: phones[0] } });
  assert.deepEqual(account.preferences, guest.preferences);
  assert.deepEqual((await prisma.resume.findFirstOrThrow({ where: { userId: account.id } })).qualifications, guest.resume.qualifications);
  results.push('real phone login and consented guest material/preferences import');
  const before = account.preferences;
  failPreferences = true;
  await page.getByRole('group', { name: '偏好行业', exact: true }).getByLabel('AI/科技', { exact: true }).check();
  await save(); await visible('推荐尚未完成');
  assert(await page.getByRole('group', { name: '偏好行业', exact: true }).getByLabel('AI/科技', { exact: true }).isChecked());
  assert.deepEqual((await prisma.user.findUniqueOrThrow({ where: { id: account.id } })).preferences, before);
  await page.getByRole('button', { name: '重试', exact: true }).click(); await finished();
  assert((await prisma.user.findUniqueOrThrow({ where: { id: account.id } })).preferences['industries'].includes('AI/科技'));
  await page.reload(); await finished();
  assert(await page.getByRole('group', { name: '偏好行业', exact: true }).getByLabel('AI/科技', { exact: true }).isChecked());
  results.push('failed preference save retains input, retry commits, account refresh persistence');

  await page.getByRole('button', { name: '更新材料', exact: true }).click();
  await editSkills('财务分析');
  await page.getByLabel('经历与成果证据', { exact: false }).fill('');
  await page.locator('#resume-confirm-btn').click(); await finished();
  assert.notEqual(await page.locator('ol[aria-label="推荐岗位"] > li h2').first().innerText(), guestFirst);
  assert.equal((await prisma.resume.findFirstOrThrow({ where: { userId: account.id }, orderBy: { updatedAt: 'desc' } })).skills[0], '财务分析');
  results.push('updated materials produce a fresh ranking without previous-material cache');
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const dimension = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    assert(dimension.scroll <= dimension.client, `Overflow at ${width}`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `.verification/recommendations-${width}-top.png` });
    await page.locator('ol[aria-label="推荐岗位"] > li').first().screenshot({ path: `.verification/recommendations-${width}-card.png` });
    await page.screenshot({ path: `.verification/recommendations-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: '查看职业与个人诊断', exact: true }).first().click();
  await page.getByRole('button', { name: '返回推荐结果', exact: true }).waitFor();
  assert(new URL(page.url()).hash.startsWith('#position='));
  results.push('three viewport widths and stable career-detail navigation');
  await page.getByRole('button', { name: '返回推荐结果', exact: true }).click();
  await finished();
  await page.goto(base + '/#view=browser');
  await page.getByLabel('搜索职业或技能', { exact: true }).fill('Python');
  await page.getByRole('button', { name: '查看职业', exact: false }).first().click();
  await page.getByRole('button', { name: '返回岗位库', exact: true }).click();
  assert.equal(await page.getByLabel('搜索职业或技能', { exact: true }).inputValue(), 'Python');
  results.push('three-entry navigation, prerequisite gates, home resume shortcut and library filter return');

  // A late old-account response must not reappear after identity is cleared.
  await page.goto(base + '/#view=results'); await finished();
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const observed = new Promise<void>(resolve => { started = resolve; });
  await page.route('**/api/recommendations', async route => {
    const response = await route.fetch(); started(); await gate;
    await route.fulfill({ response }).catch(error => {
      if (!/already handled|Target closed|closed/i.test(String(error))) throw error;
    });
  });
  await page.reload();
  await Promise.race([observed, new Promise((_, reject) => setTimeout(() => reject(new Error('Delayed recommendation did not start')), 15000))]);
  await page.locator('#user-profile-menu-btn').click();
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await page.getByRole('button', { name: '手机号登录', exact: true }).first().waitFor({ state: 'visible' });
  release(); await page.unroute('**/api/recommendations');
  await login(phones[1]); // Existing guest material import is explicitly consented by the dialog handler.
  await page.goto(base + '/#view=results'); await finished();
  const other = await prisma.user.findUniqueOrThrow({ where: { phone: phones[1] } });
  assert.deepEqual((await prisma.resume.findFirstOrThrow({ where: { userId: other.id } })).skills, guest.resume.skills);
  assert.notDeepEqual((await prisma.resume.findFirstOrThrow({ where: { userId: account.id }, orderBy: { updatedAt: 'desc' } })).skills, guest.resume.skills);
  results.push('delayed old-account result cannot overwrite new-account materials');

  await page.locator('#user-profile-menu-btn').click();
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await page.getByRole('button', { name: '手机号登录', exact: true }).first().waitFor({ state: 'visible' });
  await page.goto(base + '/#view=upload');
  await visible('确认个人材料');
  await page.goto(base + '/#view=profile');
  await page.getByRole('button', { name: '清除全部游客资料并退出', exact: true }).click();
  await page.waitForURL('**/#view=landing');
  assert.equal(await page.evaluate(id => localStorage.getItem(`preferences_${id}`), guest.id), null);
  results.push('guest privacy clearing removes saved preferences');
  assert(aiCalls <= 2, "Only opening detail may attempt the disabled AI service; recommendation itself has no AI call");
  assert.deepEqual(errors, []);
  for (const result of results) console.log(`PASS: ${result}`);
} catch (error) {
  await page.screenshot({ path: '.verification/recommendation-failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally {
  writeFileSync('.verification/recommendation-browser-results.json', JSON.stringify({ results, errors, aiCalls, database: 'real dedicated PostgreSQL', ai: 'disabled' }, null, 2));
  await browser.close();
  await new Promise<void>(resolve => server.close(() => resolve()));
  await prisma.user.deleteMany({ where: { phone: { in: phones } } });
  await prisma.$disconnect();
}
