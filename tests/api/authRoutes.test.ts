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

async function resetAuthRoutesTables() {
  await prisma.session.deleteMany();
  await prisma.smsCode.deleteMany();
  await prisma.user.deleteMany({ where: { phone: { in: ['13388888888', '13300000000', '13311111111'] } } });
}

async function loginWithPhone(app: ReturnType<typeof createApp>, phone: string) {
  await request(app, '/api/auth/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, purpose: 'login' }),
  });
  const verify = await request(app, '/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code: '123456', purpose: 'login' }),
  });
  const cookie = verify.headers.get('set-cookie');
  assert.ok(cookie);
  return cookie as string;
}

async function testChangePhoneFlowPreservesCookie() {
  await resetAuthRoutesTables();
  const app = createApp();
  const cookie = await loginWithPhone(app, '13388888888');

  const requestCode = await request(app, '/api/me/change-phone/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ newPhone: '13300000000' }),
  });
  assert.equal(requestCode.status, 200);
  assert.equal((await requestCode.json()).devCode, '123456');

  const verify = await request(app, '/api/me/change-phone/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ newPhone: '13300000000', code: '123456' }),
  });
  assert.equal(verify.status, 200);
  assert.equal((await verify.json()).user.phone, '13300000000');

  // The same original cookie still works and reflects the new phone.
  const me = await request(app, '/api/me', { headers: { cookie } });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.phone, '13300000000');
}

async function testChangePhoneRejectsOwnedPhone() {
  await resetAuthRoutesTables();
  const app = createApp();
  await loginWithPhone(app, '13311111111');
  const cookie = await loginWithPhone(app, '13388888888');

  const requestCode = await request(app, '/api/me/change-phone/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ newPhone: '13311111111' }),
  });
  assert.equal(requestCode.status, 409);
  assert.equal((await requestCode.json()).code, 'PHONE_ALREADY_USED');
}

async function testDeleteAccountFlowClearsCookieAndSession() {
  await resetAuthRoutesTables();
  const app = createApp();
  const cookie = await loginWithPhone(app, '13388888888');

  const requestCode = await request(app, '/api/me/delete-account/request-code', {
    method: 'POST',
    headers: { cookie },
  });
  assert.equal(requestCode.status, 200);
  assert.equal((await requestCode.json()).devCode, '123456');

  const del = await request(app, '/api/me/delete-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ code: '123456' }),
  });
  assert.equal(del.status, 200);
  assert.ok(del.headers.get('set-cookie')?.includes('Max-Age=0'));

  const me = await request(app, '/api/me', { headers: { cookie } });
  assert.equal(me.status, 401);
}

async function testDeleteAccountRejectsWrongCode() {
  await resetAuthRoutesTables();
  const app = createApp();
  const cookie = await loginWithPhone(app, '13388888888');
  await request(app, '/api/me/delete-account/request-code', { method: 'POST', headers: { cookie } });

  const del = await request(app, '/api/me/delete-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ code: '000000' }),
  });
  assert.equal(del.status, 400);
  assert.equal((await del.json()).code, 'INVALID_SMS_CODE');

  const me = await request(app, '/api/me', { headers: { cookie } });
  assert.equal(me.status, 200);
}

const tests = [
  testHealthRoute,
  testPhoneLoginSetsCookieAndMeReadsUser,
  testChangePhoneFlowPreservesCookie,
  testChangePhoneRejectsOwnedPhone,
  testDeleteAccountFlowClearsCookieAndSession,
  testDeleteAccountRejectsWrongCode,
];
for (const test of tests) await test();
console.log(`authRoutes.test.ts: ${tests.length} tests passed`);
