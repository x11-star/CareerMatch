import assert from 'node:assert/strict';
import { prisma } from '../../src/server/db/prisma';
import { createAuthService } from '../../src/server/auth/authService';
import { createDevSmsSender } from '../../src/server/auth/smsSender';

async function resetAuthTables() {
  await prisma.session.deleteMany();
  await prisma.smsCode.deleteMany();
  await prisma.user.deleteMany({ where: { phone: { in: ['13388888888', '12200000000', '13300000000', '13311111111', '13322222222', '13333333333', '13344444444'] } } });
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

async function loginHelper(auth: ReturnType<typeof createAuthService>, phone: string) {
  await auth.requestLoginCode(phone);
  return auth.verifyLoginCode(phone, '123456');
}

async function testRequestChangePhoneCodeStoresHashWithPurpose() {
  await resetAuthTables();
  const auth = createAuthService({ smsSender: createDevSmsSender({ fixedCode: '123456' }) });
  const verified = await loginHelper(auth, '13388888888');

  // S1: 验证码发到当前手机号(user.phone),不是新号
  const result = await auth.requestChangePhoneCode(verified.user.id, '13388888888');
  assert.equal(result.devCode, '123456');
  const code = await prisma.smsCode.findFirstOrThrow({ where: { phone: '13388888888' } });
  assert.equal(code.purpose, 'change_phone');
  assert.notEqual(code.codeHash, '123456');
}

async function testRequestChangePhoneCodeRejectsMismatchedCurrentPhone() {
  await resetAuthTables();
  const auth = createAuthService({ smsSender: createDevSmsSender({ fixedCode: '123456' }) });
  const a = await loginHelper(auth, '13388888888');

  // S1: currentPhone 必须属于当前账号,否则拒绝(防止越权)
  await assert.rejects(() => auth.requestChangePhoneCode(a.user.id, '13311111111'), /PHONE_MISMATCH/);
}

async function testVerifyChangePhoneCodeUpdatesPhoneAndKeepsSession() {
  await resetAuthTables();
  const auth = createAuthService({ smsSender: createDevSmsSender({ fixedCode: '123456' }) });
  const verified = await loginHelper(auth, '13388888888');
  await auth.requestChangePhoneCode(verified.user.id, '13388888888');

  const result = await auth.verifyChangePhoneCode(verified.user.id, '13388888888', '123456', '13300000000');
  assert.equal(result.user.phone, '13300000000');

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: verified.user.id } });
  assert.equal(dbUser.phone, '13300000000');

  // The original session cookie still resolves, and reflects the new phone.
  const sessionUser = await auth.getSessionUser(verified.sessionToken);
  assert.equal(sessionUser?.phone, '13300000000');
}

async function testVerifyChangePhoneCodeRejectsLoginCode() {
  await resetAuthTables();
  const auth = createAuthService({ smsSender: createDevSmsSender({ fixedCode: '123456' }) });
  const verified = await loginHelper(auth, '13388888888');
  // S1: change-phone 码发到当前号 13388888888。login 码发到别的号,不能混用。
  await auth.requestChangePhoneCode(verified.user.id, '13388888888');
  await auth.requestLoginCode('13322222222');

  await assert.rejects(
    () => auth.verifyChangePhoneCode(verified.user.id, '13322222222', '123456', '13399999999'),
    /INVALID_SMS_CODE/,
  );
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: verified.user.id } });
  assert.equal(dbUser.phone, '13388888888');
}

async function testVerifyChangePhoneCodeRejectsDuplicateOnRace() {
  await resetAuthTables();
  const auth = createAuthService({ smsSender: createDevSmsSender({ fixedCode: '123456' }) });
  const verified = await loginHelper(auth, '13388888888');
  await loginHelper(auth, '13333333333');
  await auth.requestChangePhoneCode(verified.user.id, '13388888888');
  // Race: another user grabs the new phone between request and verify.
  await prisma.user.update({ where: { phone: '13333333333' }, data: { phone: '13344444444' } });

  await assert.rejects(
    () => auth.verifyChangePhoneCode(verified.user.id, '13388888888', '123456', '13344444444'),
    /PHONE_ALREADY_USED/,
  );
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: verified.user.id } });
  assert.equal(dbUser.phone, '13388888888');
}

async function testRequestDeleteAccountCodeStoresHashWithPurpose() {
  await resetAuthTables();
  const auth = createAuthService({ smsSender: createDevSmsSender({ fixedCode: '123456' }) });
  const verified = await loginHelper(auth, '13388888888');

  const result = await auth.requestDeleteAccountCode(verified.user.id, '13388888888');
  assert.equal(result.devCode, '123456');
  const code = await prisma.smsCode.findFirstOrThrow({ where: { phone: '13388888888', purpose: 'delete_account' } });
  assert.notEqual(code.codeHash, '123456');
}

async function testVerifyDeleteAccountCodeCascadesAndInvalidatesSession() {
  await resetAuthTables();
  const auth = createAuthService({ smsSender: createDevSmsSender({ fixedCode: '123456' }) });
  const verified = await loginHelper(auth, '13388888888');
  await auth.requestDeleteAccountCode(verified.user.id, '13388888888');

  const result = await auth.verifyDeleteAccountCode(verified.user.id, '13388888888', '123456');
  assert.equal(result.ok, true);

  assert.equal(await prisma.user.findUnique({ where: { id: verified.user.id } }), null);
  const sessions = await prisma.session.findMany({ where: { userId: verified.user.id } });
  assert.equal(sessions.length, 0);
  assert.equal(await auth.getSessionUser(verified.sessionToken), null);
}

async function testVerifyDeleteAccountCodeRejectsWrongCode() {
  await resetAuthTables();
  const auth = createAuthService({ smsSender: createDevSmsSender({ fixedCode: '123456' }) });
  const verified = await loginHelper(auth, '13388888888');
  await auth.requestDeleteAccountCode(verified.user.id, '13388888888');

  await assert.rejects(
    () => auth.verifyDeleteAccountCode(verified.user.id, '13388888888', '000000'),
    /INVALID_SMS_CODE/,
  );
  assert.ok(await prisma.user.findUnique({ where: { id: verified.user.id } }));
}

const tests = [
  testRequestLoginCodeStoresHashOnly,
  testInvalidPhoneRejected,
  testVerifyCreatesUserAndSession,
  testWrongCodeIncrementsAttempts,
  testGetSessionUserAndLogout,
  testRequestChangePhoneCodeStoresHashWithPurpose,
  testRequestChangePhoneCodeRejectsMismatchedCurrentPhone,
  testVerifyChangePhoneCodeUpdatesPhoneAndKeepsSession,
  testVerifyChangePhoneCodeRejectsLoginCode,
  testVerifyChangePhoneCodeRejectsDuplicateOnRace,
  testRequestDeleteAccountCodeStoresHashWithPurpose,
  testVerifyDeleteAccountCodeCascadesAndInvalidatesSession,
  testVerifyDeleteAccountCodeRejectsWrongCode,
];

for (const test of tests) await test();
console.log(`authService.test.ts: ${tests.length} tests passed`);
