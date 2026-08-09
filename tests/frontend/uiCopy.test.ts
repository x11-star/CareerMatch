import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '../..');
const files = [
  'src/components/LandingPage.tsx',
  'src/components/ResumeUploadPage.tsx',
  'src/components/ProfilePage.tsx',
  'src/components/Navbar.tsx',
  'src/components/AssessmentPage.tsx',
  'src/components/PositionDetailPage.tsx',
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
  '可信边界比营销承诺更重要',
  'Credibility boundaries',
  '低成本本地优先',
  '游客数据保存在本机',
  '游客模式下结果保存在本机浏览器',
  '本机保存体验数据',
  '本机数据库',
  '本机缓存',
  '本地 OCR',
  '开发验证码',
  'AI Key',
  'ZHIPU_API_KEY',
  'DEEPSEEK_API_KEY',
  '不生成假结果',
  '不使用假结果',
  '隐私优先',
  '真实边界',
  '诊断导向',
  '岗位数量只显示真实加载的数据',
  '阶段 5 不新增账号删除或第三方绑定能力',
  'Session 默认有效期 7 天',
  '清除当前会话 Cookie',
  '本阶段不会执行数据删除',
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
