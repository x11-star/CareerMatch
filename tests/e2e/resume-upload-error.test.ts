import 'dotenv/config';
import assert from 'node:assert/strict';
import express from 'express';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createApp } from '../../src/server/app';
import { createAiService } from '../../src/server/ai/aiService';
import { textPdf } from '../fixtures/textPdf';

const app = express();
app.use(createApp({ aiService: createAiService([]) })); // No paid providers; real file processing.
app.use(express.static('dist'));
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address();
assert(address && typeof address === 'object');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(15000);
const errors: string[] = [];
page.on('pageerror', e => errors.push(e.message));
mkdirSync('.verification', { recursive: true });
try {
  await page.goto(`http://127.0.0.1:${address.port}/#view=upload`);
  await page.getByRole('heading', { name: '完善个人材料', exact: true }).waitFor();
  await page.screenshot({ path: '.verification/matching-upload-1440.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ path: '.verification/matching-upload-375.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const reply = page.waitForResponse(r => r.url().endsWith('/api/parse-resume'));
  await page.locator('#resume-file-input').setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: textPdf() });
  const response = await reply;
  assert.equal((await response.json()).code, 'AI_CONFIGURATION_MISSING', 'Real PDF must reach the AI stage instead of failing to read');
  await page.getByText('自动读取暂时不可用。你可以先手动填写简历信息，继续查看职业推荐。', { exact: true }).waitFor();

  await page.locator('#resume-file-input').setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('broken PDF') });
  await page.getByText('没能读取这份文件。请重新导出后上传，或直接粘贴简历文字。', { exact: true }).waitFor();
  assert(!await page.locator('main').innerText().then(t => /pdfParser|is not a function|HTTP 422/.test(t)));
  assert.equal(await page.getByRole('heading', { name: '上传前看这里', exact: true }).count(), 0);
  await page.getByRole('heading', { name: '完善个人材料', exact: true }).waitFor();
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    const dimensions = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    assert(dimensions[0] <= dimensions[1]);
    await page.screenshot({ path: `.verification/upload-copy-${width}.png`, fullPage: true });
  }
  // Even if a legacy backend sends raw details, the page must choose its own safe message.
  await page.route('**/api/parse-resume', route => route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ code: 'FILE_PARSE_FAILED', error: 'pdfParser is not a function' }) }));
  await page.getByRole('button', { name: '粘贴文本', exact: true }).click();
  await page.getByLabel('简历正文', { exact: true }).fill('测试简历文字');
  await page.getByRole('button', { name: '启动 AI 解析简历', exact: false }).click();
  await page.getByText('没能读取这份文件。请重新导出后上传，或直接粘贴简历文字。', { exact: true }).waitFor();
  assert(!await page.locator('main').innerText().then(t => t.includes('pdfParser')));
  assert.equal(await page.getByLabel('简历正文', { exact: true }).inputValue(), '测试简历文字');
  assert.deepEqual(errors, []);
  writeFileSync('.verification/upload-error-results.json', JSON.stringify({ realPdfReachedAiStage: true, malformedPdfUsesChineseMessage: true, legacyEnglishErrorHidden: true, inputPreserved: true, viewports: [1440, 375], pageErrors: errors, aiProviders: 'disabled' }, null, 2));
  console.log('resume-upload-error.test.ts: real PDF processing, Chinese error boundary, legacy-detail filtering, preserved text and responsive copy passed');
} finally {
  await browser.close();
  await new Promise<void>(resolve => server.close(() => resolve()));
  const { prisma } = await import('../../src/server/db/prisma');
  await prisma.$disconnect();
}
