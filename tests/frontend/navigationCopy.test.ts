import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '../..');

function testAssessmentDoesNotKeepUploadNavActive() {
  const content = readFileSync(resolve(repoRoot, 'src/components/Navbar.tsx'), 'utf8');

  assert.equal(
    content.includes("view === 'upload' && currentView === 'assessment'"),
    false,
    'Assessment view must not keep the upload nav item active',
  );
}

function testResumeUploadDoesNotRenderTopInfoPillGrid() {
  const content = readFileSync(resolve(repoRoot, 'src/components/ResumeUploadPage.tsx'), 'utf8');

  for (const copy of ['PDF / DOCX / TXT / 图片', '扫描 PDF 默认识别前 3 页', '未登录可先体验']) {
    assert.equal(content.includes(copy), false, `Resume upload still renders top info pill copy: ${copy}`);
  }
}

function testProfileDoesNotRenderDataAndPrivacyPanel() {
  const content = readFileSync(resolve(repoRoot, 'src/components/ProfilePage.tsx'), 'utf8');

  for (const copy of ["'privacy'", '数据与隐私', '说明数据保存位置和 AI 处理边界', '清除临时体验数据功能后续开放']) {
    assert.equal(content.includes(copy), false, `Profile still renders data-and-privacy content: ${copy}`);
  }
}

const tests = [testAssessmentDoesNotKeepUploadNavActive, testResumeUploadDoesNotRenderTopInfoPillGrid, testProfileDoesNotRenderDataAndPrivacyPanel];
for (const test of tests) test();
console.log(`navigationCopy.test.ts: ${tests.length} tests passed`);
