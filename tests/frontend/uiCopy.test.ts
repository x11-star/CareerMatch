import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '../..');
const files = [
  'src/components/LandingPage.tsx',
  'src/components/ProfilePage.tsx',
  'src/components/ShareModal.tsx',
  'src/components/DownloadModal.tsx',
];

const forbiddenCopy = [
  '已有 2,348 位高校同学',
  '报告生成成功',
  '专属 PDF 已为您自动推至浏览器下载通道中',
  '已为您调起系统',
  '已认证学信网',
  '微信已绑定',
  '邮箱已绑定',
  '清华大学',
];

function testForbiddenCopyRemovedFromRuntimeComponents() {
  for (const file of files) {
    const content = readFileSync(resolve(repoRoot, file), 'utf8');
    for (const copy of forbiddenCopy) {
      assert.equal(content.includes(copy), false, `${file} still contains forbidden copy: ${copy}`);
    }
  }
}

const tests = [testForbiddenCopyRemovedFromRuntimeComponents];
for (const test of tests) test();
console.log(`uiCopy.test.ts: ${tests.length} tests passed`);
