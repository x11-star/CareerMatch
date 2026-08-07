import assert from 'node:assert/strict';

const forbiddenCopy = [
  '已有 2,348 位高校同学',
  '报告生成成功',
  '专属 PDF 已为您自动推至浏览器下载通道中',
  '已为您调起系统',
  '已认证学信网',
  '微信已绑定',
  '邮箱已绑定',
];

function testForbiddenCopyListDocumentsPhase5Boundaries() {
  assert.equal(forbiddenCopy.includes('报告生成成功'), true);
  assert.equal(forbiddenCopy.includes('已认证学信网'), true);
}

const tests = [testForbiddenCopyListDocumentsPhase5Boundaries];
for (const test of tests) test();
console.log(`uiCopy.test.ts: ${tests.length} tests passed`);
