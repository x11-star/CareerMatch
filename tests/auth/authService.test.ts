import assert from 'node:assert/strict';
import { prisma } from '../../src/server/db/prisma';
import { createAuthService } from '../../src/server/auth/authService';
import { createDevSmsSender } from '../../src/server/auth/smsSender';

async function resetAuthTables() {
  await prisma.session.deleteMany();
  await prisma.smsCode.deleteMany();
  await prisma.user.deleteMany({ where: { phone: { in: ['13388888888', '12200000000'] } } });
}

async function testRequestLoginCodeStoresHashOnly() {
  await resetAuthTables();
  const auth = createAuthService({ smsSender: createDevSmsSender({ fixedCode: '123456' }) });
  const result = await auth.requestLoginCode('13388888888');
  assert.equal(result.devCode, '123456');
  const code = await prisma.smsCode.findFirst({ where: { phone: '13388888888' } });
  assert.ok(code);
  assert.notEqual(code.codeHash, '123456');
  assert.equal(code.purpose, 'login');
}

async function testInvalidPhoneRejected() {
  await resetAuthTables();
  const auth = createAuthService({ smsSender: createDevSmsSender({ fixedCode: '123456' }) });
  await assert.rejects(() => auth.requestLoginCode('123'), /INVALID_PHONE/);
}

async function testVerifyCreatesUserAndSession() {
  await resetAuthTables();
  const auth = createAuthService({ smsSender: createDevSmsSender({ fixedCode: '123456' }) });
  await auth.requestLoginCode('13388888888');
  const verified = await auth.verifyLoginCode('13388888888', '123456');
  assert.equal(verified.user.phone, '13388888888');
  assert.equal(verified.user.name, null);
  assert.ok(verified.sessionToken.length >= 32);
  const sessions = await prisma.session.findMany({ where: { userId: verified.user.id } });
  assert.equal(sessions.length, 1);
  assert.notEqual(sessions[0].tokenHash, verified.sessionToken);
}

async function testWrongCodeIncrementsAttempts() {
  await resetAuthTables();
  const auth = createAuthService({ smsSender: createDevSmsSender({ fixedCode: '123456' }) });
  await auth.requestLoginCode('13388888888');
  await assert.rejects(() => auth.verifyLoginCode('13388888888', '000000'), /INVALID_SMS_CODE/);
  const code = await prisma.smsCode.findFirstOrThrow({ where: { phone: '13388888888' } });
  assert.equal(code.attempts, 1);
}

async function testGetSessionUserAndLogout() {
  await resetAuthTables();
  const auth = createAuthService({ smsSender: createDevSmsSender({ fixedCode: '123456' }) });
  await auth.requestLoginCode('13388888888');
  const verified = await auth.verifyLoginCode('13388888888', '123456');
  const user = await auth.getSessionUser(verified.sessionToken);
  assert.equal(user?.phone, '13388888888');
  await auth.logout(verified.sessionToken);
  const afterLogout = await auth.getSessionUser(verified.sessionToken);
  assert.equal(afterLogout, null);
}

const tests = [
  testRequestLoginCodeStoresHashOnly,
  testInvalidPhoneRejected,
  testVerifyCreatesUserAndSession,
  testWrongCodeIncrementsAttempts,
  testGetSessionUserAndLogout,
];

for (const test of tests) await test();
console.log(`authService.test.ts: ${tests.length} tests passed`);
