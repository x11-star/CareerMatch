# CareerMatch Phone Auth API Firebase Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 4 so logged-in CareerMatch users use phone-code authentication, HttpOnly Cookie sessions, PostgreSQL APIs, and MatchResult caching while guests continue to use localStorage.

**Architecture:** Split the Express runtime into a testable `createApp()` plus route modules, add a small auth/session layer over the Phase 3 Prisma repositories, expose user-owned data through API routes, then migrate the React app from Firebase Auth/Firestore to `apiClient` + `userDataStore`. Keep AI parsing and position chat compatible with guests; make logged-in matching read the latest server-side resume/assessment and cache AI match results.

**Tech Stack:** TypeScript, React 19, Express 4, Vite, Prisma 6, PostgreSQL, Node `crypto`, HttpOnly cookies, `tsx`, Node built-in `assert`, existing npm/package-lock workflow.

## Global Constraints

- This is a backend/API migration phase, not a full UI/UX redesign phase.
- Login entry becomes phone-code login plus guest experience; do not keep email login, email registration, or Firebase anonymous login.
- Phone-code auth uses a replaceable `SmsSender`; Phase 4 uses a dev sender and sends no real SMS.
- Test phone number example is `13388888888`; real users still log in with the phone number they enter.
- First phone login creates only `User.phone`; do not write default name, school, major, or graduation year.
- Sessions use HttpOnly Cookie `careermatch_session`, `SameSite=Lax`, `Path=/`, seven-day TTL, and `Secure` only in production.
- Do not store plaintext session tokens or plaintext SMS codes.
- Guest mode remains fully localStorage-based and must not call Firebase anonymous auth.
- Logged-in user data must come from PostgreSQL APIs, not Firebase Auth/Firestore or logged-in localStorage keys.
- `/api/parse-resume` keeps parsing only; it does not require login and does not save resumes.
- `/api/position-chat` remains guest-compatible, does not require login, and does not write DB rows.
- Logged-in `/api/match-position` reads latest server resume/assessment and uses `MatchResult` cache.
- Guest `/api/match-position` continues to accept the old body and writes no cache.
- ProfilePage must not claim 学信网认证, 微信绑定, 邮箱绑定, or account deletion support that is not implemented.
- If `TEST_DATABASE_URL` is absent, `test:db`, `test:auth`, and `test:api` skip and exit 0; if configured, they run real guarded-live tests.
- Remove the `firebase` npm dependency only after frontend runtime imports are gone.

---

## File Structure

Create these focused files:

- `src/server/app.ts` — creates the Express app, JSON parser, health route, existing AI/file routes, and new route modules; exported for API tests.
- `src/server/auth/hash.ts` — normalizes phone auth hashing and secure token/code helpers.
- `src/server/auth/smsSender.ts` — defines `SmsSender`, `createDevSmsSender()`, and `createSmsSenderFromEnv()`.
- `src/server/auth/authService.ts` — implements request-code, verify-code, get-session-user, logout.
- `src/server/http/cookies.ts` — reads/sets/clears `careermatch_session` cookie.
- `src/server/http/errors.ts` — normalized HTTP error class and JSON response helper.
- `src/server/http/authMiddleware.ts` — Express helpers `requireAuth()` and `getOptionalAuth()`.
- `src/server/routes/authRoutes.ts` — auth endpoints.
- `src/server/routes/meRoutes.ts` — profile and local data import endpoints.
- `src/server/routes/resumeRoutes.ts` — latest resume endpoints.
- `src/server/routes/assessmentRoutes.ts` — latest assessment endpoints.
- `src/server/routes/positionRoutes.ts` — position list/detail endpoints.
- `src/server/routes/favoriteRoutes.ts` — favorites endpoints.
- `src/server/mappers/resumeMapper.ts` — Prisma resume records ↔ frontend `ResumeData`.
- `src/server/mappers/assessmentMapper.ts` — Prisma assessment records ↔ frontend `PersonalityResult`.
- `src/server/mappers/positionMapper.ts` — Prisma position records ↔ frontend `Position`.
- `src/server/matching/hash.ts` — stable JSON SHA-256 hash for match cache.
- `src/lib/apiClient.ts` — browser fetch wrapper with `credentials: 'include'`.
- `src/lib/userDataStore.ts` — guest localStorage and logged-in API data adapter.
- `tests/auth/authService.test.ts` — guarded-live service-level auth tests.
- `tests/auth/run-tests.ts` — guarded auth runner.
- `tests/api/authRoutes.test.ts` — guarded auth route integration tests.
- `tests/api/dataRoutes.test.ts` — guarded data route integration tests.
- `tests/api/matchPosition.test.ts` — guarded match-position integration tests with fake AI service.
- `tests/api/run-tests.ts` — guarded API runner.
- `tests/frontend/apiClient.test.ts` — pure client helper tests.
- `tests/frontend/userDataStore.test.ts` — pure guest/localStorage store tests.
- `tests/frontend/run-tests.ts` — frontend helper test runner.

Modify these existing files:

- `server.ts` — delegate to `createApp()` and keep startup-only concerns.
- `package.json` / `package-lock.json` — add test scripts, remove Firebase after migration.
- `.env.example` — add auth/session/SMS env vars.
- `README.md` — document phone dev auth, guest migration, PostgreSQL login path, and guarded tests.
- `src/context/AuthContext.tsx` — replace Firebase user/session logic with phone auth + guest localStorage logic.
- `src/App.tsx` — replace `firebaseStore` imports and remove Firestore seeding UI path.
- `src/components/Navbar.tsx` — replace quick anonymous login with phone-code login modal and guest button.
- `src/components/ResumeUploadPage.tsx` — save/load resumes through `userDataStore` and `user.id`.
- `src/components/AssessmentPage.tsx` — save assessments through `userDataStore` and `user.id`.
- `src/components/PositionBrowserPage.tsx` — load positions through `userDataStore`.
- `src/components/MatchResultsPage.tsx` — load/toggle favorites through `userDataStore`.
- `src/components/PositionDetailPage.tsx` — logged-in match calls send `{ positionId }`; guest calls keep old body.
- `src/components/ProfilePage.tsx` — display real phone/guest state and remove unsupported account claims.
- `src/lib/firebase.ts` / `src/lib/firebaseStore.ts` — delete after no runtime imports remain.

---

### Task 1: Express App Split and Guarded Test Runners

**Files:**
- Create: `src/server/app.ts`
- Modify: `server.ts`
- Create: `tests/auth/run-tests.ts`
- Create: `tests/api/run-tests.ts`
- Create: `tests/frontend/run-tests.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes existing `defaultAiService`, `toHttpAiError`, `parseUploadedResumeText`, `toHttpFileError`, `MAX_UPLOAD_JSON_BYTES`.
- Produces `createApp(options?: { aiService?: ReturnType<typeof createAiService> }): express.Express`.
- Produces scripts: `test:auth`, `test:api`, `test:frontend`.

- [ ] **Step 1: Write failing app split test**

Create `tests/api/authRoutes.test.ts` with a health smoke first:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test:api
```

Expected before implementation: fails because `test:api` script or `src/server/app.ts` does not exist.

- [ ] **Step 3: Add guarded runners**

Create `tests/api/run-tests.ts`:

```ts
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const originalDatabaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  console.log('test:api skipped: TEST_DATABASE_URL is not configured');
  process.exit(0);
}

if (originalDatabaseUrl && originalDatabaseUrl === testDatabaseUrl) {
  console.error('test:api refused: TEST_DATABASE_URL must be separate from DATABASE_URL');
  process.exit(1);
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.SMS_PROVIDER = process.env.SMS_PROVIDER || 'dev';
process.env.DEV_SMS_CODE = process.env.DEV_SMS_CODE || '123456';

const migrate = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  env: process.env,
  stdio: 'inherit',
});

if (migrate.status !== 0) process.exit(migrate.status ?? 1);

try {
  await import('./authRoutes.test');
} finally {
  const { prisma } = await import('../../src/server/db/prisma');
  await prisma.$disconnect();
}
```

Create `tests/auth/run-tests.ts`:

```ts
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

if (!process.env.TEST_DATABASE_URL) {
  console.log('test:auth skipped: TEST_DATABASE_URL is not configured');
  process.exit(0);
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL === process.env.TEST_DATABASE_URL) {
  console.error('test:auth refused: TEST_DATABASE_URL must be separate from DATABASE_URL');
  process.exit(1);
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.SMS_PROVIDER = process.env.SMS_PROVIDER || 'dev';
process.env.DEV_SMS_CODE = process.env.DEV_SMS_CODE || '123456';

const migrate = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  env: process.env,
  stdio: 'inherit',
});

if (migrate.status !== 0) process.exit(migrate.status ?? 1);

try {
  await import('./authService.test');
} finally {
  const { prisma } = await import('../../src/server/db/prisma');
  await prisma.$disconnect();
}
```

Create `tests/frontend/run-tests.ts`:

```ts
await import('./apiClient.test');
await import('./userDataStore.test');
```

- [ ] **Step 4: Add scripts**

Modify `package.json` scripts:

```json
{
  "test:auth": "tsx tests/auth/run-tests.ts",
  "test:api": "tsx tests/api/run-tests.ts",
  "test:frontend": "tsx tests/frontend/run-tests.ts"
}
```

Keep existing scripts unchanged.

- [ ] **Step 5: Extract createApp without behavior changes**

Create `src/server/app.ts` by moving the current Express app setup from `server.ts`. Preserve existing `/api/health`, `/api/parse-resume`, `/api/match-position`, and `/api/position-chat` behavior. Use this signature:

```ts
import express from 'express';
import { defaultAiService } from './ai/aiService';
import type { createAiService } from './ai/aiService';

type AiService = ReturnType<typeof createAiService>;

type CreateAppOptions = {
  aiService?: AiService;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const aiService = options.aiService || defaultAiService;

  // existing json parser, health route, parse-resume route,
  // match-position route, and position-chat route move here.

  return app;
}
```

Modify `server.ts` so startup-only code remains:

```ts
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createApp } from './src/server/app';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = createApp();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

startServer();
```

Ensure `server.ts` imports `express` if using `express.static`.

- [ ] **Step 6: Verify guarded skip and health smoke**

Run without `TEST_DATABASE_URL`:

```bash
npm run test:api
npm run test:auth
```

Expected:

```text
test:api skipped: TEST_DATABASE_URL is not configured
test:auth skipped: TEST_DATABASE_URL is not configured
```

Run normal checks:

```bash
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 7: Commit Task 1**

```bash
git add package.json server.ts src/server/app.ts tests/api/run-tests.ts tests/api/authRoutes.test.ts tests/auth/run-tests.ts tests/frontend/run-tests.ts
git commit -m "refactor: split express app for api tests"
```

---

### Task 2: Auth Service, Hashing, Cookies, and Middleware

**Files:**
- Create: `src/server/auth/hash.ts`
- Create: `src/server/auth/smsSender.ts`
- Create: `src/server/auth/authService.ts`
- Create: `src/server/http/cookies.ts`
- Create: `src/server/http/errors.ts`
- Create: `src/server/http/authMiddleware.ts`
- Create: `tests/auth/authService.test.ts`

**Interfaces:**
- Consumes Phase 3 repositories: `smsCodesRepository`, `sessionsRepository`, `usersRepository`.
- Produces `requestLoginCode(phone, purpose?)`, `verifyLoginCode(phone, code, purpose?, metadata?)`, `getSessionUser(sessionToken)`, `logout(sessionToken)`.
- Produces `requireAuth(req, res)` and `getOptionalAuth(req)` helpers for routes.

- [ ] **Step 1: Write auth service tests**

Create `tests/auth/authService.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run with configured `TEST_DATABASE_URL`:

```bash
npm run test:auth
```

Expected before implementation: fails because `src/server/auth/authService.ts` does not exist.

- [ ] **Step 3: Implement hash helpers**

Create `src/server/auth/hash.ts`:

```ts
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function createRandomNumericCode(length = 6) {
  const max = 10 ** length;
  const value = Number.parseInt(randomBytes(4).toString('hex'), 16) % max;
  return value.toString().padStart(length, '0');
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashSmsCode(phone: string, purpose: string, code: string) {
  return sha256Hex(`${phone}:${purpose}:${code}`);
}

export function hashSessionToken(token: string) {
  return sha256Hex(token);
}

export function safeEqualHash(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
```

- [ ] **Step 4: Implement SMS sender**

Create `src/server/auth/smsSender.ts`:

```ts
import { createRandomNumericCode } from './hash';

export type SmsPurpose = 'login';

export interface SmsSender {
  sendSmsCode(input: { phone: string; code: string; purpose: SmsPurpose }): Promise<{ devCode?: string }>;
}

export function createDevSmsSender(options: { fixedCode?: string } = {}): SmsSender {
  return {
    async sendSmsCode({ code }) {
      return { devCode: options.fixedCode || code };
    },
  };
}

export function nextSmsCode() {
  return process.env.DEV_SMS_CODE || createRandomNumericCode(6);
}

export function createSmsSenderFromEnv(): SmsSender {
  if (process.env.SMS_PROVIDER === 'dev' || process.env.NODE_ENV !== 'production') {
    return createDevSmsSender({ fixedCode: process.env.DEV_SMS_CODE });
  }
  throw new Error('AUTH_CONFIGURATION_ERROR');
}
```

- [ ] **Step 5: Implement HTTP errors and cookies**

Create `src/server/http/errors.ts`:

```ts
import type express from 'express';

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export function sendHttpError(res: express.Response, error: unknown) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ code: error.code, error: error.message });
  }
  if (error instanceof Error && error.message === 'AUTH_CONFIGURATION_ERROR') {
    return res.status(500).json({ code: 'AUTH_CONFIGURATION_ERROR', error: '认证服务未正确配置' });
  }
  return res.status(500).json({ code: 'INTERNAL_SERVER_ERROR', error: '服务器暂时不可用' });
}
```

Create `src/server/http/cookies.ts`:

```ts
import type express from 'express';

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'careermatch_session';
const SESSION_TTL_SECONDS = Number(process.env.AUTH_SESSION_TTL_DAYS || 7) * 24 * 60 * 60;

export function readCookie(req: express.Request, name: string) {
  const header = req.headers.cookie || '';
  const pairs = header.split(';').map((part) => part.trim()).filter(Boolean);
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    if (key === name) return decodeURIComponent(valueParts.join('='));
  }
  return null;
}

export function readAuthCookie(req: express.Request) {
  return readCookie(req, AUTH_COOKIE_NAME);
}

export function setAuthCookie(res: express.Response, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`);
}

export function clearAuthCookie(res: express.Response) {
  res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}
```

- [ ] **Step 6: Implement auth service and middleware**

Create `src/server/auth/authService.ts` implementing the test-visible behavior:

```ts
import type { User } from '@prisma/client';
import { createSessionToken, hashSessionToken, hashSmsCode, safeEqualHash } from './hash';
import { createSmsSenderFromEnv, nextSmsCode, type SmsSender, type SmsPurpose } from './smsSender';
import { HttpError } from '../http/errors';
import { createSmsCode, findLatestSmsCode, incrementSmsCodeAttempts, markSmsCodeConsumed } from '../repositories/smsCodesRepository';
import { createSession, deleteSessionByTokenHash, findSessionByTokenHash, touchSession } from '../repositories/sessionsRepository';
import { upsertUserByPhone } from '../repositories/usersRepository';

const PHONE_PATTERN = /^1\d{10}$/;
const CODE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = Number(process.env.AUTH_SESSION_TTL_DAYS || 7) * 24 * 60 * 60 * 1000;
const SEND_INTERVAL_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

type AuthOptions = { smsSender?: SmsSender; now?: () => Date };

export function createAuthService(options: AuthOptions = {}) {
  const smsSender = options.smsSender || createSmsSenderFromEnv();
  const now = options.now || (() => new Date());

  return {
    async requestLoginCode(phone: string, purpose: SmsPurpose = 'login') {
      if (!PHONE_PATTERN.test(phone)) throw new HttpError(400, 'INVALID_PHONE', '请输入有效的手机号');
      const latest = await findLatestSmsCode(phone, purpose);
      const current = now();
      if (latest && current.getTime() - latest.createdAt.getTime() < SEND_INTERVAL_MS) {
        throw new HttpError(429, 'SMS_CODE_RATE_LIMITED', '验证码发送太频繁，请稍后再试');
      }
      const code = nextSmsCode();
      await createSmsCode({ phone, purpose, codeHash: hashSmsCode(phone, purpose, code), expiresAt: new Date(current.getTime() + CODE_TTL_MS) });
      const sent = await smsSender.sendSmsCode({ phone, purpose, code });
      return { ok: true, devCode: sent.devCode, expiresInSeconds: 300 };
    },

    async verifyLoginCode(phone: string, code: string, purpose: SmsPurpose = 'login', metadata: { userAgent?: string | null; ipAddress?: string | null } = {}) {
      if (!PHONE_PATTERN.test(phone)) throw new HttpError(400, 'INVALID_PHONE', '请输入有效的手机号');
      const latest = await findLatestSmsCode(phone, purpose);
      const current = now();
      const invalid = new HttpError(400, 'INVALID_SMS_CODE', '验证码错误或已过期');
      if (!latest || latest.consumedAt || latest.expiresAt.getTime() < current.getTime() || latest.attempts >= MAX_ATTEMPTS) throw invalid;
      const expectedHash = hashSmsCode(phone, purpose, code);
      if (!safeEqualHash(latest.codeHash, expectedHash)) {
        await incrementSmsCodeAttempts(latest.id);
        throw invalid;
      }
      await markSmsCodeConsumed(latest.id);
      const user = await upsertUserByPhone({ phone });
      const sessionToken = createSessionToken();
      await createSession({ userId: user.id, tokenHash: hashSessionToken(sessionToken), expiresAt: new Date(current.getTime() + SESSION_TTL_MS), userAgent: metadata.userAgent, ipAddress: metadata.ipAddress });
      return { user, sessionToken };
    },

    async getSessionUser(sessionToken: string): Promise<User | null> {
      const tokenHash = hashSessionToken(sessionToken);
      const session = await findSessionByTokenHash(tokenHash);
      if (!session || session.expiresAt.getTime() < now().getTime()) return null;
      await touchSession(tokenHash, now());
      return session.user;
    },

    async logout(sessionToken: string) {
      try {
        await deleteSessionByTokenHash(hashSessionToken(sessionToken));
      } catch {
        // Logout remains idempotent from the route perspective.
      }
      return { ok: true };
    },
  };
}

export const defaultAuthService = createAuthService();
```

Create `src/server/http/authMiddleware.ts`:

```ts
import type express from 'express';
import { defaultAuthService } from '../auth/authService';
import { readAuthCookie } from './cookies';
import { HttpError } from './errors';

export async function getOptionalAuth(req: express.Request) {
  const token = readAuthCookie(req);
  if (!token) return null;
  return defaultAuthService.getSessionUser(token);
}

export async function requireAuth(req: express.Request) {
  const user = await getOptionalAuth(req);
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', '请先登录');
  return user;
}
```

- [ ] **Step 7: Verify auth service**

Run with configured `TEST_DATABASE_URL`:

```bash
npm run test:auth
```

Expected: `authService.test.ts: 5 tests passed`.

Run always:

```bash
npm run typecheck
```

Expected: pass.

- [ ] **Step 8: Commit Task 2**

```bash
git add src/server/auth src/server/http tests/auth/authService.test.ts
git commit -m "feat: add phone auth service"
```

---

### Task 3: Auth Routes and Cookie Session API

**Files:**
- Create: `src/server/routes/authRoutes.ts`
- Modify: `src/server/app.ts`
- Modify: `tests/api/authRoutes.test.ts`

**Interfaces:**
- Consumes `defaultAuthService`, `setAuthCookie()`, `clearAuthCookie()`, `readAuthCookie()`.
- Produces API routes: `POST /api/auth/request-code`, `POST /api/auth/verify-code`, `POST /api/auth/logout`, and authenticated `GET /api/me` stub if Task 4 has not created it yet.

- [ ] **Step 1: Extend route tests**

Modify `tests/api/authRoutes.test.ts` to include request-code, verify-code, cookie, me, and logout checks:

```ts
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
```

Add this function to the `tests` array.

- [ ] **Step 2: Run test to verify it fails**

Run with configured `TEST_DATABASE_URL`:

```bash
npm run test:api
```

Expected before implementation: route returns 404 for `/api/auth/request-code`.

- [ ] **Step 3: Implement auth routes**

Create `src/server/routes/authRoutes.ts`:

```ts
import type express from 'express';
import { defaultAuthService } from '../auth/authService';
import { clearAuthCookie, readAuthCookie, setAuthCookie } from '../http/cookies';
import { sendHttpError } from '../http/errors';

function publicUser(user: { id: string; phone: string; name: string | null; school: string | null; major: string | null; graduationYear: string | null }) {
  return { id: user.id, phone: user.phone, name: user.name, school: user.school, major: user.major, graduationYear: user.graduationYear };
}

export function registerAuthRoutes(app: express.Express) {
  app.post('/api/auth/request-code', async (req, res) => {
    try {
      const result = await defaultAuthService.requestLoginCode(String(req.body?.phone || ''), req.body?.purpose || 'login');
      return res.json(result);
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post('/api/auth/verify-code', async (req, res) => {
    try {
      const result = await defaultAuthService.verifyLoginCode(String(req.body?.phone || ''), String(req.body?.code || ''), req.body?.purpose || 'login', {
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
      });
      setAuthCookie(res, result.sessionToken);
      return res.json({ user: publicUser(result.user) });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const token = readAuthCookie(req);
      if (token) await defaultAuthService.logout(token);
      clearAuthCookie(res);
      return res.json({ ok: true });
    } catch (error) {
      clearAuthCookie(res);
      return sendHttpError(res, error);
    }
  });
}
```

- [ ] **Step 4: Register auth routes in createApp**

In `src/server/app.ts`, import and call before Vite/static handling:

```ts
import { registerAuthRoutes } from './routes/authRoutes';

// inside createApp, after health route or before existing API routes:
registerAuthRoutes(app);
```

If `/api/me` is not implemented until Task 4, create a temporary route in Task 4 instead and keep this Task 3 test limited to request-code/verify/logout.

- [ ] **Step 5: Verify auth routes**

Run with configured DB:

```bash
npm run test:api
```

Expected: auth route test passes after Task 4 adds `/api/me`, or all auth-only assertions pass if `/api/me` is deferred.

Run:

```bash
npm run typecheck
npm run build
```

Expected: pass.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/server/routes/authRoutes.ts src/server/app.ts tests/api/authRoutes.test.ts
git commit -m "feat: add phone auth routes"
```

---

### Task 4: Data Mappers and User Data API Routes

**Files:**
- Create: `src/server/mappers/resumeMapper.ts`
- Create: `src/server/mappers/assessmentMapper.ts`
- Create: `src/server/mappers/positionMapper.ts`
- Create: `src/server/routes/meRoutes.ts`
- Create: `src/server/routes/resumeRoutes.ts`
- Create: `src/server/routes/assessmentRoutes.ts`
- Create: `src/server/routes/positionRoutes.ts`
- Create: `src/server/routes/favoriteRoutes.ts`
- Modify: `src/server/app.ts`
- Create: `tests/api/dataRoutes.test.ts`
- Modify: `tests/api/run-tests.ts`

**Interfaces:**
- Consumes `requireAuth()` and Phase 3 repositories.
- Produces `GET/PATCH /api/me`, `POST /api/me/import-local-data`, latest resume/assessment routes, position list/detail, and favorites routes.

- [ ] **Step 1: Write data route tests**

Create `tests/api/dataRoutes.test.ts` with login helper and route assertions:

```ts
import assert from 'node:assert/strict';
import { prisma } from '../../src/server/db/prisma';
import { createApp } from '../../src/server/app';
import { mapPositionForSeed } from '../../prisma/seed';
import { MOCK_POSITIONS } from '../../src/data';

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

async function login(app: ReturnType<typeof createApp>) {
  await request(app, '/api/auth/request-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '13388888888', purpose: 'login' }) });
  const verify = await request(app, '/api/auth/verify-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '13388888888', code: '123456', purpose: 'login' }) });
  const cookie = verify.headers.get('set-cookie');
  assert.ok(cookie);
  return cookie;
}

async function reset() {
  await prisma.matchResult.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.smsCode.deleteMany();
  await prisma.user.deleteMany({ where: { phone: '13388888888' } });
  await prisma.position.upsert(mapPositionForSeed(MOCK_POSITIONS[0]));
}

async function testProfileResumeAssessmentAndFavorites() {
  await reset();
  const app = createApp();
  const cookie = await login(app);

  const patchMe = await request(app, '/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ name: '张三', school: '南京大学', major: '软件工程', graduationYear: '2027' }) });
  assert.equal(patchMe.status, 200);
  assert.equal((await patchMe.json()).user.name, '张三');

  const resumeResponse = await request(app, '/api/resumes', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ resume: { name: '张三', school: '南京大学', major: '软件工程', graduationYear: '2027', skills: ['TypeScript'], internships: [], projects: [], inferredDirection: '后端开发', targetCities: ['南京'] } }) });
  assert.equal(resumeResponse.status, 200);

  const latestResume = await request(app, '/api/resumes/latest', { headers: { cookie } });
  assert.equal((await latestResume.json()).resume.name, '张三');

  const assessmentResponse = await request(app, '/api/assessments', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ personalityResult: { typeTitle: '尽责稳定型', description: '稳定可靠', radarScores: [], industryFit: { stateOwned: 80, internet: 70 }, hollandCode: 'RCI', hollandTags: ['现实型'], deepInterpretation: { summary: '适合稳健路径', advantages: ['执行力'] } }, scores: { 1: 5 } }) });
  assert.equal(assessmentResponse.status, 200);

  const positions = await request(app, '/api/positions?pageSize=1');
  const positionBody = await positions.json();
  assert.equal(positions.status, 200);
  assert.equal(positionBody.positions.length, 1);

  const favorite = await request(app, `/api/favorites/${MOCK_POSITIONS[0].id}`, { method: 'POST', headers: { cookie } });
  assert.equal(favorite.status, 200);
  const favorites = await request(app, '/api/favorites', { headers: { cookie } });
  assert.deepEqual((await favorites.json()).positionIds, [MOCK_POSITIONS[0].id]);
}

const tests = [testProfileResumeAssessmentAndFavorites];
for (const test of tests) await test();
console.log(`dataRoutes.test.ts: ${tests.length} tests passed`);
```

- [ ] **Step 2: Register test import**

Modify `tests/api/run-tests.ts`:

```ts
await import('./authRoutes.test');
await import('./dataRoutes.test');
```

- [ ] **Step 3: Run test to verify it fails**

Run with configured DB:

```bash
npm run test:api
```

Expected before implementation: 404 for `/api/me` or data routes.

- [ ] **Step 4: Implement mapper modules**

Create mapper functions with exact exports:

```ts
// src/server/mappers/resumeMapper.ts
import type { Resume } from '@prisma/client';
import type { ResumeData } from '../../types';
import type { CreateResumeInput } from '../repositories/resumesRepository';
import { HttpError } from '../http/errors';

export function toResumeData(record: Resume): ResumeData {
  return {
    name: record.name,
    school: record.school,
    major: record.major,
    graduationYear: record.graduationYear,
    skills: record.skills as string[],
    internships: record.internships as ResumeData['internships'],
    projects: record.projects as ResumeData['projects'],
    inferredDirection: record.inferredDirection,
    targetCities: record.targetCities as string[],
  };
}

export function toResumeCreateInput(resume: ResumeData, metadata: { rawText?: string | null; sourceFileName?: string | null; sourceFileType?: string | null } = {}): CreateResumeInput {
  if (!resume.name || !resume.school || !resume.major || !resume.graduationYear) {
    throw new HttpError(400, 'INVALID_RESUME', '简历缺少必要字段');
  }
  return { ...resume, rawText: metadata.rawText || null, sourceFileName: metadata.sourceFileName || null, sourceFileType: metadata.sourceFileType || null };
}
```

```ts
// src/server/mappers/assessmentMapper.ts
import type { Assessment } from '@prisma/client';
import type { PersonalityResult } from '../../types';
import type { CreateAssessmentInput } from '../repositories/assessmentsRepository';

export function toPersonalityResult(record: Assessment): PersonalityResult {
  return {
    typeTitle: record.typeTitle,
    description: record.description,
    radarScores: record.radarScores as PersonalityResult['radarScores'],
    industryFit: record.industryFit as PersonalityResult['industryFit'],
    hollandCode: record.hollandCode,
    hollandTags: record.hollandTags as string[],
    deepInterpretation: record.deepInterpretation as PersonalityResult['deepInterpretation'],
  };
}

export function toAssessmentCreateInput(personalityResult: PersonalityResult, scores: unknown = {}): CreateAssessmentInput {
  return { answers: scores || {}, ...personalityResult };
}
```

```ts
// src/server/mappers/positionMapper.ts
import type { Position as PrismaPosition } from '@prisma/client';
import type { Position } from '../../types';

export function toPosition(record: PrismaPosition): Position {
  return {
    id: record.id,
    title: record.title,
    company: record.company,
    city: record.city,
    type: record.type as Position['type'],
    industry: record.industry || undefined,
    category: record.category || undefined,
    subIndustry: record.subIndustry || undefined,
    subCategory: record.subCategory || undefined,
    salaryRange: record.salaryRange || '',
    difficultyRating: Number(record.difficultyRating || 0),
    tags: record.tags as string[],
    summary: record.summary,
    responsibilities: record.responsibilities as string[],
    requirements: record.requirements as string[],
    softSkills: record.softSkills as string[],
    salaryDetail: record.salaryDetail || '',
    careerPath: (record.careerPath || []) as string[],
    fitPersonality: (record.fitPersonality || []) as string[],
    howToPrepare: record.howToPrepare as Position['howToPrepare'],
    relatedJobs: (record.relatedJobs || []) as string[],
    overallMatch: 0,
    resumeMatch: 0,
    personalityMatch: 0,
  };
}
```

- [ ] **Step 5: Implement routes**

Create route modules using `requireAuth(req)` and repository functions. Keep each route small. `meRoutes.ts` must include public user mapping:

```ts
function publicUser(user: { id: string; phone: string; name: string | null; school: string | null; major: string | null; graduationYear: string | null }) {
  return { id: user.id, phone: user.phone, name: user.name, school: user.school, major: user.major, graduationYear: user.graduationYear };
}
```

`POST /api/me/import-local-data` must call:

- `updateLatestResumeByUserId()` then `createResume()` if null.
- `createAssessment()` when assessment exists.
- `addFavorite()` for each id.

`positionRoutes.ts` must parse numeric query safely:

```ts
const page = Number(req.query.page || 1);
const pageSize = Number(req.query.pageSize || 20);
```

`favoriteRoutes.ts` must treat add/remove as idempotent and return:

```json
{ "ok": true }
```

- [ ] **Step 6: Register data routes**

In `src/server/app.ts`:

```ts
registerMeRoutes(app);
registerResumeRoutes(app);
registerAssessmentRoutes(app);
registerPositionRoutes(app);
registerFavoriteRoutes(app);
```

- [ ] **Step 7: Verify Task 4**

Run with configured DB:

```bash
npm run test:api
```

Expected: `authRoutes.test.ts` and `dataRoutes.test.ts` pass.

Run:

```bash
npm run typecheck
npm run build
```

Expected: pass.

- [ ] **Step 8: Commit Task 4**

```bash
git add src/server/mappers src/server/routes src/server/app.ts tests/api/dataRoutes.test.ts tests/api/run-tests.ts
git commit -m "feat: add user data api routes"
```

---

### Task 5: Frontend API Client and userDataStore

**Files:**
- Create: `src/lib/apiClient.ts`
- Create: `src/lib/userDataStore.ts`
- Create: `tests/frontend/apiClient.test.ts`
- Create: `tests/frontend/userDataStore.test.ts`

**Interfaces:**
- Produces `api` object with auth/data/match methods.
- Produces `AppUser` type and data-store functions using `user.id`, not `user.uid`.

- [ ] **Step 1: Write API client helper tests**

Create `tests/frontend/apiClient.test.ts`:

```ts
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
```

Create `tests/frontend/userDataStore.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readGuestJson, writeGuestJson } from '../../src/lib/userDataStore';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

function testGuestJsonRoundTrip() {
  const storage = new MemoryStorage();
  writeGuestJson(storage, 'resume_guest_1', { name: '张三' });
  assert.deepEqual(readGuestJson(storage, 'resume_guest_1'), { name: '张三' });
  assert.equal(readGuestJson(storage, 'missing'), null);
}

const tests = [testGuestJsonRoundTrip];
for (const test of tests) test();
console.log(`userDataStore.test.ts: ${tests.length} tests passed`);
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test:frontend
```

Expected: fails because `apiClient.ts` and `userDataStore.ts` do not exist.

- [ ] **Step 3: Implement apiClient**

Create `src/lib/apiClient.ts` with exports:

```ts
import type { PersonalityResult, Position, ResumeData } from '../types';

export type ApiErrorShape = { status: number; code: string; message: string };

export function parseApiErrorBody(status: number, body: any): ApiErrorShape {
  return { status, code: body?.code || 'HTTP_ERROR', message: body?.error || `请求失败：HTTP ${status}` };
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw parseApiErrorBody(response.status, body);
  return body as T;
}

export const api = {
  getMe: () => requestJson<{ user: any }>('/api/me'),
  requestLoginCode: (phone: string) => requestJson<{ ok: true; devCode?: string; expiresInSeconds: number }>('/api/auth/request-code', { method: 'POST', body: JSON.stringify({ phone, purpose: 'login' }) }),
  verifyLoginCode: (phone: string, code: string) => requestJson<{ user: any }>('/api/auth/verify-code', { method: 'POST', body: JSON.stringify({ phone, code, purpose: 'login' }) }),
  logout: () => requestJson<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  updateMe: (profile: any) => requestJson<{ user: any }>('/api/me', { method: 'PATCH', body: JSON.stringify(profile) }),
  getLatestResume: () => requestJson<{ resume: ResumeData | null }>('/api/resumes/latest'),
  saveResume: (resume: ResumeData, metadata: any = {}) => requestJson<{ resume: ResumeData }>('/api/resumes', { method: 'POST', body: JSON.stringify({ resume, ...metadata }) }),
  getLatestAssessment: () => requestJson<{ assessment: { personalityResult: PersonalityResult; scores: unknown } | null }>('/api/assessments/latest'),
  saveAssessment: (personalityResult: PersonalityResult, scores: unknown = {}) => requestJson<{ assessment: { personalityResult: PersonalityResult; scores: unknown } }>('/api/assessments', { method: 'POST', body: JSON.stringify({ personalityResult, scores }) }),
  listPositions: (filters: Record<string, string | number | undefined> = {}) => requestJson<{ positions: Position[]; total: number; page: number; pageSize: number }>(`/api/positions?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))}`),
  getPosition: (positionId: string) => requestJson<{ position: Position }>(`/api/positions/${encodeURIComponent(positionId)}`),
  getFavorites: () => requestJson<{ positionIds: string[] }>('/api/favorites'),
  addFavorite: (positionId: string) => requestJson<{ ok: true }>(`/api/favorites/${encodeURIComponent(positionId)}`, { method: 'POST' }),
  removeFavorite: (positionId: string) => requestJson<{ ok: true }>(`/api/favorites/${encodeURIComponent(positionId)}`, { method: 'DELETE' }),
  importLocalData: (payload: any) => requestJson<{ imported: { resume: boolean; assessment: boolean; favorites: number } }>('/api/me/import-local-data', { method: 'POST', body: JSON.stringify(payload) }),
  matchPosition: (input: any) => requestJson<any>('/api/match-position', { method: 'POST', body: JSON.stringify(input) }),
};
```

- [ ] **Step 4: Implement userDataStore**

Create `src/lib/userDataStore.ts` with exact user shape:

```ts
import type { PersonalityResult, Position, ResumeData } from '../types';
import { MOCK_POSITIONS } from '../data';
import { api } from './apiClient';

export type AppUser = { id: string; phone: string | null; isGuest: boolean };

export function readGuestJson(storage: Pick<Storage, 'getItem'>, key: string) {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function writeGuestJson(storage: Pick<Storage, 'setItem'>, key: string, value: unknown) {
  storage.setItem(key, JSON.stringify(value));
}

function storage() { return window.localStorage; }

export async function getPositions(): Promise<Position[]> {
  try { return (await api.listPositions({ pageSize: 50 })).positions; } catch { return MOCK_POSITIONS; }
}

export async function getLatestResume(user: AppUser | null): Promise<ResumeData | null> {
  if (!user) return null;
  if (user.isGuest) return readGuestJson(storage(), `resume_${user.id}`) as ResumeData | null;
  return (await api.getLatestResume()).resume;
}

export async function saveResume(user: AppUser | null, data: ResumeData): Promise<void> {
  if (!user) return;
  if (user.isGuest) writeGuestJson(storage(), `resume_${user.id}`, data);
  else await api.saveResume(data);
}

export async function getLatestAssessment(user: AppUser | null): Promise<PersonalityResult | null> {
  if (!user) return null;
  if (user.isGuest) return (readGuestJson(storage(), `assessment_${user.id}`) as any)?.personalityResult || null;
  return (await api.getLatestAssessment()).assessment?.personalityResult || null;
}

export async function saveAssessment(user: AppUser | null, result: PersonalityResult, scores: unknown = {}): Promise<void> {
  if (!user) return;
  if (user.isGuest) writeGuestJson(storage(), `assessment_${user.id}`, { personalityResult: result, scores });
  else await api.saveAssessment(result, scores);
}

export async function getFavorites(user: AppUser | null): Promise<string[]> {
  if (!user) return [];
  if (user.isGuest) return (readGuestJson(storage(), `favorites_${user.id}`) as string[] | null) || [];
  return (await api.getFavorites()).positionIds;
}

export async function toggleFavorite(user: AppUser | null, positionId: string): Promise<boolean> {
  if (!user) return false;
  const current = await getFavorites(user);
  const nextValue = !current.includes(positionId);
  if (user.isGuest) {
    writeGuestJson(storage(), `favorites_${user.id}`, nextValue ? [...current, positionId] : current.filter((id) => id !== positionId));
  } else if (nextValue) await api.addFavorite(positionId);
  else await api.removeFavorite(positionId);
  return nextValue;
}
```

- [ ] **Step 5: Verify Task 5**

Run:

```bash
npm run test:frontend
npm run typecheck
```

Expected: pass.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/lib/apiClient.ts src/lib/userDataStore.ts tests/frontend package.json
git commit -m "feat: add frontend api data store"
```

---

### Task 6: AuthContext and Navbar Phone Login Modal

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/components/Navbar.tsx`

**Interfaces:**
- Consumes `api` and `AppUser` from Task 5.
- Produces context methods: `requestLoginCode`, `verifyLoginCode`, `loginAsGuest`, `logout`, `updateProfile`, `refreshMe`.

- [ ] **Step 1: Replace AuthContext contract**

Edit `src/context/AuthContext.tsx` to remove all Firebase imports. Use this interface:

```ts
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/apiClient';
import type { AppUser } from '../lib/userDataStore';

type UserProfile = { id: string; phone: string | null; name: string | null; school: string | null; major: string | null; graduationYear: string | null };

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  userProfile: UserProfile | null;
  isGuest: boolean;
  requestLoginCode: (phone: string) => Promise<{ devCode?: string }>;
  verifyLoginCode: (phone: string, code: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshMe: () => Promise<void>;
}
```

Startup logic:

```ts
async function refreshMe() {
  try {
    const result = await api.getMe();
    setUser({ id: result.user.id, phone: result.user.phone, isGuest: false });
    setUserProfile(result.user);
  } catch (error: any) {
    if (error?.status !== 401) console.error('Failed to refresh user session:', error);
    const guestUid = localStorage.getItem('guest_uid');
    if (guestUid) {
      setUser({ id: guestUid, phone: null, isGuest: true });
      const localProfile = localStorage.getItem(`profile_${guestUid}`);
      setUserProfile(localProfile ? JSON.parse(localProfile) : { id: guestUid, phone: null, name: '访客学子', school: '未填写学校', major: '未填写专业', graduationYear: '2027' });
    } else {
      setUser(null);
      setUserProfile(null);
    }
  }
}
```

`loginAsGuest()` must create `guest_uid` if missing and set `AppUser` with `isGuest: true`.

`verifyLoginCode()` must call `api.verifyLoginCode(phone, code)`, set server user, and not store token in localStorage.

`logout()` must call `api.logout()` for logged-in users, keep guest localStorage data intact, clear current user state, and not remove `guest_uid` unless the current user is guest and the user explicitly exits guest mode in future work.

- [ ] **Step 2: Update Navbar login behavior**

In `src/components/Navbar.tsx`, replace `loginAnonymously` usage with modal state:

```ts
const { user, logout, userProfile, loginAsGuest, requestLoginCode, verifyLoginCode } = useAuth();
const [loginModalOpen, setLoginModalOpen] = useState(false);
const [phone, setPhone] = useState('13388888888');
const [code, setCode] = useState('');
const [devCode, setDevCode] = useState('');
const [loginError, setLoginError] = useState('');
```

`快捷登录` opens modal:

```ts
const handleLoginClick = () => setLoginModalOpen(true);
```

Modal buttons call:

```ts
const handleRequestCode = async () => {
  setLoginError('');
  const result = await requestLoginCode(phone);
  setDevCode(result.devCode || '');
};

const handleVerifyCode = async () => {
  setLoginError('');
  await verifyLoginCode(phone, code);
  setLoginModalOpen(false);
};

const handleGuest = () => {
  loginAsGuest();
  setLoginModalOpen(false);
};
```

- [ ] **Step 3: Verify no Firebase imports in AuthContext/Navbar**

Run:

```bash
rg "firebase|loginAnonymously|loginWithEmail|registerWithEmail|user.uid" src/context src/components/Navbar.tsx
```

Expected: no matches.

Run:

```bash
npm run typecheck
npm run build
```

Expected: pass or reveal component call sites to migrate in Task 7.

- [ ] **Step 4: Commit Task 6**

```bash
git add src/context/AuthContext.tsx src/components/Navbar.tsx
git commit -m "feat: replace firebase auth context"
```

---

### Task 7: Component Data Store Migration and Profile Text Cleanup

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ResumeUploadPage.tsx`
- Modify: `src/components/AssessmentPage.tsx`
- Modify: `src/components/PositionBrowserPage.tsx`
- Modify: `src/components/MatchResultsPage.tsx`
- Modify: `src/components/ProfilePage.tsx`

**Interfaces:**
- Consumes `AppUser`, `getPositions`, `getLatestResume`, `saveResume`, `getLatestAssessment`, `saveAssessment`, `getFavorites`, `toggleFavorite` from `userDataStore`.
- Produces no Firebase runtime imports in migrated components.

- [ ] **Step 1: Replace imports**

In all listed files, replace:

```ts
import { getLatestResume, getLatestAssessment, getPositions, seedPositionsToFirestore } from './lib/firebaseStore';
import { saveResume, getLatestResume } from '../lib/firebaseStore';
import { saveAssessment } from '../lib/firebaseStore';
import { getPositions, getFavorites, toggleFavorite } from '../lib/firebaseStore';
```

with the matching functions from `../lib/userDataStore` or `./lib/userDataStore`.

- [ ] **Step 2: Replace `user.uid` with `user` argument**

Examples:

```ts
const latestResume = await getLatestResume(user);
await saveResume(user, resumeData);
await saveAssessment(user, result, updatedAnswers);
const dbFavs = await getFavorites(user);
await toggleFavorite(user, id);
```

Do not access `user.uid` anywhere.

- [ ] **Step 3: Remove Firestore seeding path from App**

In `src/App.tsx`, remove `seedPositionsToFirestore`, `seedingStatus`, `seedingError`, and `handleManualSeed` if they are only used for Firestore. Position seeding is now `npm run db:seed`, not a frontend action.

- [ ] **Step 4: Clean ProfilePage unsupported claims**

In `ProfilePage.tsx`:

- Replace “已认证学信网” badge with either “手机号登录” for logged-in users or “游客模式” for guests.
- Replace hardcoded phone text with `user?.phone || '游客模式未绑定手机号'`.
- Remove or disable email/微信 binding rows.
- Change account deletion row to disabled copy:

```text
账号注销功能后续开放。本阶段不会执行数据删除。
```

- [ ] **Step 5: Verify no migrated component uses Firebase names**

Run:

```bash
rg "firebaseStore|Firestore|Firebase|user\.uid|seedPositionsToFirestore|loginWithEmail|registerWithEmail|loginAnonymously" src/App.tsx src/components src/context
```

Expected: no matches except user-facing text explicitly saying Firebase is no longer used in docs, not in runtime components.

Run:

```bash
npm run typecheck
npm run build
```

Expected: pass.

- [ ] **Step 6: Commit Task 7**

```bash
git add src/App.tsx src/components/ResumeUploadPage.tsx src/components/AssessmentPage.tsx src/components/PositionBrowserPage.tsx src/components/MatchResultsPage.tsx src/components/ProfilePage.tsx
git commit -m "refactor: migrate components to api data store"
```

---

### Task 8: Logged-in MatchResult Cache and Guest Compatibility

**Files:**
- Create: `src/server/matching/hash.ts`
- Modify: `src/server/app.ts`
- Modify: `src/components/PositionDetailPage.tsx`
- Create: `tests/api/matchPosition.test.ts`
- Modify: `tests/api/run-tests.ts`

**Interfaces:**
- Consumes latest resume/assessment repositories, positions repository, match results repository, AI service injection from `createApp({ aiService })`.
- Produces dual `/api/match-position` behavior: logged-in `{ positionId }`, guest old body.

- [ ] **Step 1: Write match API tests**

Create `tests/api/matchPosition.test.ts` with fake AI service:

```ts
import assert from 'node:assert/strict';
import { prisma } from '../../src/server/db/prisma';
import { createApp } from '../../src/server/app';
import { mapPositionForSeed } from '../../prisma/seed';
import { MOCK_POSITIONS } from '../../src/data';

const fakeAiService = {
  async parseResume() { throw new Error('not used'); },
  async chatAboutPosition() { return 'not used'; },
  async matchPosition() {
    return { resumeMatch: 88, personalityMatch: 77, overallMatch: 83, resumeMatchExplanation: '简历匹配', personalityMatchExplanation: '性格匹配', whyExcellent: '综合匹配' };
  },
};

// Reuse request/login helpers from dataRoutes by duplicating them here so this file is standalone.

async function testGuestOldBodyDoesNotWriteCache() {
  await prisma.matchResult.deleteMany();
  const app = createApp({ aiService: fakeAiService as any });
  const response = await request(app, '/api/match-position', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resumeData: {}, personalityResult: {}, position: MOCK_POSITIONS[0] }) });
  assert.equal(response.status, 200);
  assert.equal((await prisma.matchResult.count()), 0);
}

async function testLoggedInMatchWritesAndReusesCache() {
  await resetWithUserResumeAssessmentAndPosition();
  const app = createApp({ aiService: fakeAiService as any });
  const cookie = await login(app);
  const first = await request(app, '/api/match-position', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ positionId: MOCK_POSITIONS[0].id }) });
  assert.equal(first.status, 200);
  assert.equal((await first.json()).cached, false);
  const second = await request(app, '/api/match-position', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ positionId: MOCK_POSITIONS[0].id }) });
  assert.equal(second.status, 200);
  assert.equal((await second.json()).cached, true);
  assert.equal((await prisma.matchResult.count()), 1);
}
```

Use concrete helper implementations copied from `dataRoutes.test.ts`; add this file to `tests/api/run-tests.ts` after data routes.

- [ ] **Step 2: Run test to verify it fails**

Run with configured DB:

```bash
npm run test:api
```

Expected before implementation: logged-in `{ positionId }` returns 400 or AI receives missing old body.

- [ ] **Step 3: Implement stable hash**

Create `src/server/matching/hash.ts`:

```ts
import { createHash } from 'node:crypto';

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, normalize(nested)]));
  }
  return value;
}

export function stableJsonHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(normalize(value))).digest('hex');
}
```

- [ ] **Step 4: Update `/api/match-position`**

In `src/server/app.ts`, replace the existing match route with dual behavior:

- Try `getOptionalAuth(req)`.
- If user exists and `req.body.positionId` exists:
  - read latest resume; missing returns 409 `RESUME_REQUIRED`.
  - read latest assessment; missing returns 409 `ASSESSMENT_REQUIRED`.
  - read position; missing returns 404 `POSITION_NOT_FOUND`.
  - map records to frontend shapes.
  - hash resume and assessment frontend shapes.
  - lookup cache.
  - if cached, return `{ cached: true, ...cachedFields }`.
  - else call `aiService.matchPosition({ resumeData, personalityResult, position })`, save cache with `provider: 'unknown'`, `model: 'unknown'`, return `{ cached: false, ...matchResult }`.
- Else use existing guest old body path and do not write DB.

- [ ] **Step 5: Update PositionDetailPage request body**

In `PositionDetailPage.tsx`, get user from `useAuth()` and call:

```ts
const body = user && !user.isGuest
  ? { positionId: position.id }
  : { resumeData, personalityResult, position };
```

Keep sessionStorage UI cache as a client-side optimization, but include user state in cache key:

```ts
const cacheKey = `match_${user?.isGuest ? 'guest' : user?.id || 'none'}_${position.id}_${resumeData?.name || 'guest'}`;
```

- [ ] **Step 6: Verify Task 8**

Run:

```bash
npm run test:api
npm run typecheck
npm run build
```

Expected: pass.

- [ ] **Step 7: Commit Task 8**

```bash
git add src/server/matching/hash.ts src/server/app.ts src/components/PositionDetailPage.tsx tests/api/matchPosition.test.ts tests/api/run-tests.ts
git commit -m "feat: cache logged-in match results"
```

---

### Task 9: Firebase Removal, Docs, and Final Verification

**Files:**
- Delete: `src/lib/firebase.ts`
- Delete: `src/lib/firebaseStore.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-05-careermatch-phone-auth-api-firebase-replacement-design.md` if implementation discoveries changed the design.

**Interfaces:**
- Consumes all previous tasks.
- Produces final Phase 4 acceptance state with no Firebase runtime dependency.

- [ ] **Step 1: Run no-Firebase import check before deletion**

Run:

```bash
rg "firebase/auth|firebase/firestore|../lib/firebase|./firebase|firebaseStore" src tests
```

Expected before deletion: only `src/lib/firebase.ts` and `src/lib/firebaseStore.ts` remain, with no imports from active runtime files.

- [ ] **Step 2: Delete Firebase files and dependency**

Run:

```bash
rm src/lib/firebase.ts src/lib/firebaseStore.ts
npm uninstall firebase
```

Expected: files are deleted, `package.json` and `package-lock.json` no longer include `firebase`.

- [ ] **Step 3: Add auth env documentation**

Append to `.env.example`:

```env
# Auth Session: HttpOnly Cookie 名称。
AUTH_COOKIE_NAME="careermatch_session"

# Auth Session: 默认 7 天。
AUTH_SESSION_TTL_DAYS=7

# SMS Provider: 第四阶段使用开发验证码，不发送真实短信。
SMS_PROVIDER="dev"

# Dev SMS Code: 本地测试固定验证码。
DEV_SMS_CODE="123456"
```

- [ ] **Step 4: Update README**

Add a section named `手机号开发验证码登录` containing:

```md
## 手机号开发验证码登录

第四阶段后，登录用户路径使用本项目后端 API + PostgreSQL，不再使用 Firebase Auth/Firestore。

本地开发默认使用开发验证码，不会发送真实短信：

```env
SMS_PROVIDER="dev"
DEV_SMS_CODE="123456"
```

示例手机号：`13388888888`。示例手机号只用于文档和测试，真实用户可以输入自己的手机号。

登录成功后，服务端设置 HttpOnly Cookie `careermatch_session`，前端不会把 session token 写入 localStorage。

游客仍可继续体验，游客简历、测评和收藏保存在当前浏览器 localStorage。登录后如果检测到游客数据，页面会提示是否同步到手机号账号。
```

Add a guarded-test note:

```md
`TEST_DATABASE_URL` 未配置时，`npm run test:db`、`npm run test:auth`、`npm run test:api` 会跳过 guarded-live 数据库测试并以 0 退出。配置后，这些测试会运行 migration 并真实访问测试数据库。
```

- [ ] **Step 5: Final verification**

Run:

```bash
npm run test:files
npm run test:ai
npm run test:db
npm run test:auth
npm run test:api
npm run test:frontend
npm run typecheck
npm run build
```

Expected:

- `test:files` passes.
- `test:ai` passes.
- `test:db` passes or prints configured skip.
- `test:auth` passes or prints configured skip.
- `test:api` passes or prints configured skip.
- `test:frontend` passes.
- `typecheck` passes.
- `build` passes.

Run no-Firebase check:

```bash
rg "firebase/auth|firebase/firestore|../lib/firebase|./firebase|firebaseStore" src tests package.json
```

Expected: no matches.

- [ ] **Step 6: Commit Task 9**

```bash
git add -A
git commit -m "chore: remove firebase runtime path"
```

---

## Execution Order

1. Task 1 must happen first because later API tests need `createApp()` and runners.
2. Task 2 must happen before Task 3 because routes depend on auth service and cookie helpers.
3. Task 3 must happen before Task 4 because data routes need authenticated user helpers.
4. Task 4 must happen before Task 5/6 frontend work because frontend APIs need stable contracts.
5. Task 5 should happen before Task 6/7 because AuthContext and components depend on `apiClient` and `userDataStore`.
6. Task 8 should happen after data APIs because it depends on latest resume/assessment and position mappers.
7. Task 9 must happen last because Firebase files can only be deleted after runtime imports are gone.

## Self-Review Checklist

- Spec coverage: Tasks cover auth/session, API routes, parse-resume boundary, position-chat boundary, frontend migration, guest localStorage, local import marker, match cache, ProfilePage text cleanup, Firebase removal, env docs, README, and guarded tests.
- Placeholder scan: This plan contains no undefined task labels, no deferred requirements, and no empty implementation slots.
- Type consistency: The frontend user type is consistently `AppUser { id, phone, isGuest }`; component migration uses `user.id` instead of `user.uid`; auth routes return `{ user }`; API client consumes the same shapes.
- Scope check: Phase 4 is large but already split into independently testable tasks with commits. UI redesign, real SMS, account deletion, email/微信/学信网 binding, and PDF export are excluded.
