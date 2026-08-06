import assert from 'node:assert/strict';
import { prisma } from '../../src/server/db/prisma';
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

async function testPhoneLoginSetsCookieAndMeReadsUser() {
  await prisma.session.deleteMany();
  await prisma.smsCode.deleteMany();
  await prisma.user.deleteMany({ where: { phone: '13388888888' } });
  const app = createApp();

  const requestCode = await request(app, '/api/auth/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13388888888', purpose: 'login' }),
  });
  assert.equal(requestCode.status, 200);
  assert.equal((await requestCode.json()).devCode, '123456');

  const verify = await request(app, '/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13388888888', code: '123456', purpose: 'login' }),
  });
  assert.equal(verify.status, 200);
  const cookie = verify.headers.get('set-cookie');
  assert.ok(cookie?.includes('careermatch_session='));
  assert.ok(cookie.includes('HttpOnly'));

  const me = await request(app, '/api/me', { headers: { cookie } });
  assert.equal(me.status, 200);
  const meBody = await me.json();
  assert.equal(meBody.user.phone, '13388888888');

  const logout = await request(app, '/api/auth/logout', { method: 'POST', headers: { cookie } });
  assert.equal(logout.status, 200);
  assert.ok(logout.headers.get('set-cookie')?.includes('Max-Age=0'));
}

const tests = [testHealthRoute, testPhoneLoginSetsCookieAndMeReadsUser];
for (const test of tests) await test();
console.log(`authRoutes.test.ts: ${tests.length} tests passed`);
