import assert from 'node:assert/strict';
import { parseApiErrorBody } from '../../src/lib/apiClient';

function testParseApiErrorBody() {
  assert.deepEqual(parseApiErrorBody(401, { code: 'UNAUTHORIZED', error: '请先登录' }), {
    status: 401,
    code: 'UNAUTHORIZED',
    message: '请先登录',
  });
  assert.deepEqual(parseApiErrorBody(500, null), {
    status: 500,
    code: 'HTTP_ERROR',
    message: '请求失败：HTTP 500',
  });
}

const tests = [testParseApiErrorBody];
for (const test of tests) test();
console.log(`apiClient.test.ts: ${tests.length} tests passed`);
