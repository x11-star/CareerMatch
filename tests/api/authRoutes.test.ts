import assert from 'node:assert/strict';
import { createApp } from '../../src/server/app';

async function request(app: ReturnType<typeof createApp>, path: string, init: RequestInit = {}) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address === 'object');
  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`, init);
  } finally {
    server.close();
  }
}

async function testHealthRoute() {
  const response = await request(createApp(), '/api/health');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');
}

const tests = [testHealthRoute];
for (const test of tests) await test();
console.log(`authRoutes.test.ts: ${tests.length} tests passed`);
