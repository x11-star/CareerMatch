# CareerMatch PostgreSQL Prisma Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 3 PostgreSQL + Prisma data layer so Phase 4 API/auth work can replace Firebase/localStorage with reusable server-side repositories.

**Architecture:** Add Prisma as the only ORM/data-client entrypoint under `src/server/db/`, define the first PostgreSQL schema/migration for users, auth support tables, private user data, positions, favorites, and match-result caching, then expose all application data access through focused repository modules under `src/server/repositories/`. The current React/Firebase/localStorage business flow remains untouched; this phase only creates backend data access, seed, guarded-live database tests, and documentation.

**Tech Stack:** TypeScript, Node.js, Express/Vite existing runtime, Prisma, PostgreSQL, `tsx`, Node built-in `assert`, existing `npm`/`package-lock.json` workflow.

## Global Constraints

- Use local PostgreSQL only; do not introduce Docker Compose.
- Default development `DATABASE_URL` is `postgresql://postgres:postgres@localhost:5432/careermatch?schema=public`.
- Recommended `TEST_DATABASE_URL` is `postgresql://postgres:postgres@localhost:5432/careermatch_test?schema=public`.
- Add runtime dependency `@prisma/client` and development dependency `prisma`.
- Add scripts: `db:generate`, `db:migrate`, `db:seed`, `db:studio`, `test:db`.
- Keep existing scripts: `test:files`, `test:ai`, `typecheck`, `build`.
- Do not delete Firebase Auth.
- Do not replace frontend login, favorite, resume-save, assessment-save, or static data calls.
- Do not implement phone verification login APIs.
- Do not implement HttpOnly Cookie Session route logic.
- Do not redo UI/UX.
- Do not implement real PDF report export.
- Do not connect real SMS services.
- Prisma Client is backend-only; React frontend code must not import `src/server/db/prisma.ts`.
- All repository reads/writes for private user data must be scoped by `userId`.
- `rawText`, assessment answers, phone numbers, session token hashes, and SMS code hashes are sensitive data.
- `Session.tokenHash` stores only token hashes, never plaintext session tokens.
- `SmsCode.codeHash` stores only code hashes, never plaintext SMS codes.
- Seed writes only the position catalog and no private user data.
- Test database cleanup must only run against `TEST_DATABASE_URL`; it must not delete development data.
- `positionsRepository.listPositions()` must paginate and cap `pageSize` at 50.
- Common position query fields must have indexes: `type`, `industry`, `category`, `city`.
- `favorites` and `match_results` must use unique constraints to prevent duplicate data.
- Repositories must not call AI services or file parsing services.

---

## File Structure

Create these focused files:

- `prisma/schema.prisma` — Prisma datasource/generator plus first data-layer models and indexes.
- `prisma/migrations/<timestamp>_init/migration.sql` — first SQL migration generated from `schema.prisma`.
- `prisma/seed.ts` — imports existing `MOCK_POSITIONS`, maps current frontend `Position` shape to Prisma fields, and idempotently upserts by `company + title + city`.
- `src/server/db/prisma.ts` — backend-only Prisma Client singleton that avoids duplicate dev connections.
- `src/server/db/errors.ts` — normalized database errors and Prisma error mapping helpers.
- `src/server/repositories/usersRepository.ts` — user lookup, create, upsert, profile update, delete.
- `src/server/repositories/resumesRepository.ts` — user-scoped resume create/latest/get/update/delete.
- `src/server/repositories/assessmentsRepository.ts` — user-scoped assessment create/latest/get/delete.
- `src/server/repositories/positionsRepository.ts` — paginated/filterable position catalog reads.
- `src/server/repositories/favoritesRepository.ts` — idempotent user-scoped favorites operations.
- `src/server/repositories/matchResultsRepository.ts` — match-result cache lookup/create.
- `src/server/repositories/smsCodesRepository.ts` — basic SMS-code storage helpers for Phase 4 auth service.
- `src/server/repositories/sessionsRepository.ts` — basic session storage helpers for Phase 4 session service.
- `tests/db/repositories.test.ts` — guarded-live repository integration tests.
- `tests/db/run-tests.ts` — skips safely when `TEST_DATABASE_URL` is absent; otherwise runs repository tests and disconnects Prisma.

Modify existing files:

- `package.json` — add Prisma scripts and dependencies.
- `package-lock.json` — update by running npm install for Prisma dependencies.
- `.env.example` — document development and test PostgreSQL URLs.
- `README.md` — document local PostgreSQL setup, migration, seed, and database tests.

Existing source files used as inputs but not modified:

- `src/data.ts` — seed source through `MOCK_POSITIONS`.
- `src/types.ts` — TypeScript reference for current `Position`, `ResumeData`, and `PersonalityResult` shapes.

---

### Task 1: Prisma Package Setup and Guarded DB Test Runner

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Create: `tests/db/run-tests.ts`
- Create: `tests/db/repositories.test.ts`

**Interfaces:**
- Produces package scripts: `db:generate`, `db:migrate`, `db:seed`, `db:studio`, `test:db`.
- Produces environment variables: `DATABASE_URL`, `TEST_DATABASE_URL`.
- Produces test-runner behavior: if `TEST_DATABASE_URL` is blank, print `test:db skipped: TEST_DATABASE_URL is not configured` and exit 0.

- [ ] **Step 1: Install Prisma dependencies**

Run:

```bash
npm install @prisma/client
npm install --save-dev prisma
```

Expected: `package.json` and `package-lock.json` include `@prisma/client` and `prisma`.

- [ ] **Step 2: Add Prisma and database-test scripts**

Edit `package.json` scripts to include these entries while keeping existing scripts unchanged:

```json
{
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:seed": "tsx prisma/seed.ts",
  "db:studio": "prisma studio",
  "test:db": "tsx tests/db/run-tests.ts"
}
```

Expected: `npm run` lists all five new scripts plus existing `test:files`, `test:ai`, `typecheck`, and `build`.

- [ ] **Step 3: Add PostgreSQL examples to `.env.example`**

Append this exact block after the OCR settings:

```env
# PostgreSQL: 本机开发数据库。
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/careermatch?schema=public"

# PostgreSQL: 数据库测试专用，未配置时 test:db 会跳过 guarded-live 测试。
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/careermatch_test?schema=public"
```

Expected: no real password beyond the documented local default appears in `.env.example`.

- [ ] **Step 4: Write the initial guarded-live runner**

Create `tests/db/run-tests.ts`:

```ts
if (!process.env.TEST_DATABASE_URL) {
  console.log('test:db skipped: TEST_DATABASE_URL is not configured');
  process.exit(0);
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

try {
  await import('./repositories.test');
} finally {
  const { prisma } = await import('../../src/server/db/prisma');
  await prisma.$disconnect();
}
```

- [ ] **Step 5: Write a temporary failing repository-test placeholder**

Create `tests/db/repositories.test.ts`:

```ts
import assert from 'node:assert/strict';
import { prisma } from '../../src/server/db/prisma';

async function testDatabaseIsReachable() {
  const result = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;
  assert.equal(Number(result[0]?.ok), 1);
}

const tests = [testDatabaseIsReachable];

for (const test of tests) {
  await test();
}

console.log(`repositories.test.ts: ${tests.length} tests passed`);
```

This test is allowed to fail before Task 3 because `src/server/db/prisma.ts` does not exist yet.

- [ ] **Step 6: Verify skip behavior without test DB**

Run with no `TEST_DATABASE_URL` in the shell:

```bash
npm run test:db
```

Expected output:

```text
test:db skipped: TEST_DATABASE_URL is not configured
```

Expected exit code: 0.

- [ ] **Step 7: Commit Task 1**

```bash
git add package.json package-lock.json .env.example tests/db/run-tests.ts tests/db/repositories.test.ts
git commit -m "chore: add prisma db test scaffolding"
```

---

### Task 2: Prisma Schema and First Migration

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_init/migration.sql`

**Interfaces:**
- Produces Prisma models: `User`, `SmsCode`, `Session`, `Resume`, `Assessment`, `Position`, `Favorite`, `MatchResult`.
- Produces relation behavior: deleting a `User` cascades their sessions, resumes, assessments, favorites, and match results.
- Produces unique keys: `Position(company, title, city)`, `Favorite(userId, positionId)`, `MatchResult(userId, resumeId, assessmentId, positionId, resumeHash, assessmentHash)`, `Session.tokenHash`, `User.phone`.

- [ ] **Step 1: Create the Prisma schema**

Create `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id             String        @id @default(cuid())
  phone          String        @unique
  name           String?
  school         String?
  major          String?
  graduationYear String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  resumes        Resume[]
  assessments    Assessment[]
  sessions       Session[]
  favorites      Favorite[]
  matchResults   MatchResult[]
}

model SmsCode {
  id         String    @id @default(cuid())
  phone      String
  codeHash   String
  purpose    String
  expiresAt  DateTime
  consumedAt DateTime?
  attempts   Int       @default(0)
  createdAt  DateTime  @default(now())

  @@index([phone, createdAt])
}

model Session {
  id         String    @id @default(cuid())
  userId     String
  tokenHash  String    @unique
  expiresAt  DateTime
  createdAt  DateTime  @default(now())
  lastSeenAt DateTime?
  userAgent  String?
  ipAddress  String?
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
}

model Resume {
  id                String   @id @default(cuid())
  userId            String
  name              String
  school            String
  major             String
  graduationYear    String
  skills            Json
  internships       Json
  projects          Json
  inferredDirection String
  targetCities      Json
  rawText           String?
  sourceFileName    String?
  sourceFileType    String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  matchResults      MatchResult[]

  @@index([userId, updatedAt])
}

model Assessment {
  id                 String   @id @default(cuid())
  userId             String
  answers            Json
  typeTitle          String
  description        String
  radarScores        Json
  industryFit        Json
  hollandCode        String
  hollandTags        Json
  deepInterpretation Json
  createdAt          DateTime @default(now())
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  matchResults       MatchResult[]

  @@index([userId, createdAt])
}

model Position {
  id               String        @id @default(cuid())
  title            String
  company          String
  city             String
  type             String
  industry         String?
  category         String?
  subIndustry      String?
  subCategory      String?
  salaryRange      String?
  difficultyRating String?
  tags             Json
  summary          String
  responsibilities Json
  requirements     Json
  softSkills       Json
  salaryDetail     String?
  careerPath       Json?
  fitPersonality   Json?
  howToPrepare     Json?
  relatedJobs      Json?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  favorites        Favorite[]
  matchResults     MatchResult[]

  @@unique([company, title, city])
  @@index([type])
  @@index([industry])
  @@index([category])
  @@index([city])
}

model Favorite {
  id         String   @id @default(cuid())
  userId     String
  positionId String
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  position   Position @relation(fields: [positionId], references: [id], onDelete: Cascade)

  @@unique([userId, positionId])
  @@index([userId])
  @@index([positionId])
}

model MatchResult {
  id                          String     @id @default(cuid())
  userId                      String
  resumeId                    String
  assessmentId                String
  positionId                  String
  resumeHash                  String
  assessmentHash              String
  resumeMatch                 Int
  personalityMatch            Int
  overallMatch                Int
  resumeMatchExplanation      String
  personalityMatchExplanation String
  whyExcellent                String
  provider                    String
  model                       String
  createdAt                   DateTime   @default(now())
  user                        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  resume                      Resume     @relation(fields: [resumeId], references: [id], onDelete: Cascade)
  assessment                  Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  position                    Position   @relation(fields: [positionId], references: [id], onDelete: Cascade)

  @@unique([userId, resumeId, assessmentId, positionId, resumeHash, assessmentHash])
  @@index([userId, positionId, resumeId, assessmentId])
}
```

- [ ] **Step 2: Format the schema**

Run:

```bash
npx prisma format
```

Expected: `prisma/schema.prisma` is formatted and still contains all eight models.

- [ ] **Step 3: Generate Prisma Client**

Run:

```bash
npm run db:generate
```

Expected: Prisma Client is generated successfully.

- [ ] **Step 4: Create the first migration**

Run against a local development database:

```bash
npm run db:migrate -- --name init
```

Expected: a new directory like `prisma/migrations/20260805000000_init/` exists with `migration.sql`.

If the local `careermatch` database does not exist, create it first with either:

```bash
createdb careermatch
```

or:

```sql
CREATE DATABASE careermatch;
```

- [ ] **Step 5: Verify migration contains required constraints**

Open `prisma/migrations/<timestamp>_init/migration.sql` and confirm it contains SQL for:

```sql
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "Position_company_title_city_key" ON "Position"("company", "title", "city");
CREATE UNIQUE INDEX "Favorite_userId_positionId_key" ON "Favorite"("userId", "positionId");
CREATE UNIQUE INDEX "MatchResult_userId_resumeId_assessmentId_positionId_resumeHash_assessmentHash_key" ON "MatchResult"("userId", "resumeId", "assessmentId", "positionId", "resumeHash", "assessmentHash");
```

The exact index names may differ if Prisma shortens a long name; the columns must match.

- [ ] **Step 6: Commit Task 2**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add prisma postgres schema"
```

---

### Task 3: Prisma Client Singleton and Database Error Mapping

**Files:**
- Create: `src/server/db/prisma.ts`
- Create: `src/server/db/errors.ts`
- Modify: `tests/db/repositories.test.ts`

**Interfaces:**
- Produces `prisma: PrismaClient` from `src/server/db/prisma.ts`.
- Produces errors: `DatabaseError`, `UniqueConstraintError`, `RecordNotFoundError`.
- Produces helpers: `mapPrismaError(error: unknown): DatabaseError`, `runDb<T>(operation: () => Promise<T>): Promise<T>`.
- Consumes Prisma generated types from `@prisma/client`.

- [ ] **Step 1: Create backend-only Prisma Client singleton**

Create `src/server/db/prisma.ts`:

```ts
import { PrismaClient } from '@prisma/client';

type PrismaGlobal = typeof globalThis & {
  __careerMatchPrisma?: PrismaClient;
};

const prismaGlobal = globalThis as PrismaGlobal;

export const prisma = prismaGlobal.__careerMatchPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  prismaGlobal.__careerMatchPrisma = prisma;
}
```

- [ ] **Step 2: Create normalized database errors**

Create `src/server/db/errors.ts`:

```ts
import { Prisma } from '@prisma/client';

export class DatabaseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class UniqueConstraintError extends DatabaseError {
  constructor(public readonly target: string[], cause?: unknown) {
    super(`Unique constraint failed: ${target.join(', ')}`, cause);
    this.name = 'UniqueConstraintError';
  }
}

export class RecordNotFoundError extends DatabaseError {
  constructor(message = 'Record not found', cause?: unknown) {
    super(message, cause);
    this.name = 'RecordNotFoundError';
  }
}

function getTarget(error: Prisma.PrismaClientKnownRequestError): string[] {
  const target = error.meta?.target;
  return Array.isArray(target) ? target.map(String) : [];
}

export function mapPrismaError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new UniqueConstraintError(getTarget(error), error);
    }

    if (error.code === 'P2025') {
      return new RecordNotFoundError('Record not found', error);
    }
  }

  return new DatabaseError('Database operation failed', error);
}

export async function runDb<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapPrismaError(error);
  }
}
```

- [ ] **Step 3: Extend DB tests for error mapping**

Replace `tests/db/repositories.test.ts` with:

```ts
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { mapPrismaError, UniqueConstraintError } from '../../src/server/db/errors';
import { prisma } from '../../src/server/db/prisma';

async function testDatabaseIsReachable() {
  const result = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;
  assert.equal(Number(result[0]?.ok), 1);
}

function testUniqueConstraintErrorMapping() {
  const error = new Prisma.PrismaClientKnownRequestError('Unique failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['phone'] },
  });
  const mapped = mapPrismaError(error);
  assert.ok(mapped instanceof UniqueConstraintError);
  assert.deepEqual(mapped.target, ['phone']);
}

const tests = [
  testDatabaseIsReachable,
  testUniqueConstraintErrorMapping,
];

for (const test of tests) {
  await test();
}

console.log(`repositories.test.ts: ${tests.length} tests passed`);
```

- [ ] **Step 4: Verify guarded skip still works**

Run without `TEST_DATABASE_URL`:

```bash
npm run test:db
```

Expected:

```text
test:db skipped: TEST_DATABASE_URL is not configured
```

- [ ] **Step 5: Verify typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/server/db/prisma.ts src/server/db/errors.ts tests/db/repositories.test.ts
git commit -m "feat: add prisma client and db errors"
```

---

### Task 4: Position Seed Script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `tests/db/repositories.test.ts`

**Interfaces:**
- Consumes `MOCK_POSITIONS: Position[]` from `src/data.ts`.
- Produces `mapPositionForSeed(position)` with fields accepted by `prisma.position.upsert()`.
- Produces idempotent `seedPositions()` that returns `{ created: number; updated: number }`.

- [ ] **Step 1: Write seed mapping test first**

Add this import to `tests/db/repositories.test.ts`:

```ts
import { mapPositionForSeed } from '../../prisma/seed';
```

Add this test function:

```ts
function testPositionSeedMappingKeepsStableUpsertKey() {
  const mapped = mapPositionForSeed({
    id: 'pos-0001',
    title: '后端开发工程师',
    company: '示例科技',
    city: '北京',
    type: 'internet',
    industry: '互联网',
    category: '技术类',
    subIndustry: '工具与SaaS',
    subCategory: '开发 (Java/C++/Go/前端)',
    overallMatch: 90,
    resumeMatch: 88,
    personalityMatch: 92,
    salaryRange: '20-30k',
    difficultyRating: 4,
    tags: ['校招'],
    summary: '负责后端服务开发。',
    responsibilities: ['开发 API'],
    requirements: ['TypeScript', 'SQL'],
    softSkills: ['沟通协作'],
    salaryDetail: '20-30k',
    careerPath: ['工程师', '高级工程师'],
    fitPersonality: ['尽责性高'],
    howToPrepare: { timeline: ['9月网申'], exam: '技术笔试', interview: '项目深挖' },
    relatedJobs: [],
  });

  assert.equal(mapped.where.company_title_city.company, '示例科技');
  assert.equal(mapped.where.company_title_city.title, '后端开发工程师');
  assert.equal(mapped.where.company_title_city.city, '北京');
  assert.equal(mapped.create.difficultyRating, '4');
}
```

Add `testPositionSeedMappingKeepsStableUpsertKey` to the `tests` array.

Run:

```bash
npm run test:db
```

Expected with no `TEST_DATABASE_URL`: skip. Expected with `TEST_DATABASE_URL`: FAIL because `prisma/seed.ts` does not exist yet.

- [ ] **Step 2: Implement seed script**

Create `prisma/seed.ts`:

```ts
import { Prisma } from '@prisma/client';
import { MOCK_POSITIONS } from '../src/data';
import type { Position } from '../src/types';
import { prisma } from '../src/server/db/prisma';

export function mapPositionForSeed(position: Position): Prisma.PositionUpsertArgs {
  const data = {
    title: position.title,
    company: position.company,
    city: position.city,
    type: position.type,
    industry: position.industry ?? null,
    category: position.category ?? null,
    subIndustry: position.subIndustry ?? null,
    subCategory: position.subCategory ?? null,
    salaryRange: position.salaryRange ?? null,
    difficultyRating: String(position.difficultyRating ?? ''),
    tags: position.tags,
    summary: position.summary,
    responsibilities: position.responsibilities,
    requirements: position.requirements,
    softSkills: position.softSkills,
    salaryDetail: position.salaryDetail ?? null,
    careerPath: position.careerPath,
    fitPersonality: position.fitPersonality,
    howToPrepare: position.howToPrepare,
    relatedJobs: position.relatedJobs,
  } satisfies Prisma.PositionUncheckedCreateInput;

  return {
    where: {
      company_title_city: {
        company: position.company,
        title: position.title,
        city: position.city,
      },
    },
    create: data,
    update: data,
  };
}

export async function seedPositions(): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const position of MOCK_POSITIONS) {
    const existing = await prisma.position.findUnique({
      where: {
        company_title_city: {
          company: position.company,
          title: position.title,
          city: position.city,
        },
      },
      select: { id: true },
    });

    await prisma.position.upsert(mapPositionForSeed(position));

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  return { created, updated };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await seedPositions();
    console.log(`Seeded positions: created ${result.created}, updated ${result.updated}`);
  } finally {
    await prisma.$disconnect();
  }
}
```

- [ ] **Step 3: Run mapping/type tests**

Run:

```bash
npm run typecheck
npm run test:db
```

Expected: `typecheck` PASS. `test:db` skips without `TEST_DATABASE_URL` or passes with a migrated test database.

- [ ] **Step 4: Run seed against development DB**

Run:

```bash
npm run db:seed
```

Expected example output:

```text
Seeded positions: created 346, updated 0
```

Run it a second time:

```bash
npm run db:seed
```

Expected example output:

```text
Seeded positions: created 0, updated 346
```

The exact count should match `MOCK_POSITIONS.length`.

- [ ] **Step 5: Commit Task 4**

```bash
git add prisma/seed.ts tests/db/repositories.test.ts
git commit -m "feat: seed positions into postgres"
```

---

### Task 5: User, SMS, and Session Repositories

**Files:**
- Create: `src/server/repositories/usersRepository.ts`
- Create: `src/server/repositories/smsCodesRepository.ts`
- Create: `src/server/repositories/sessionsRepository.ts`
- Modify: `tests/db/repositories.test.ts`

**Interfaces:**
- Produces `findUserByPhone(phone: string)`, `findUserById(userId: string)`, `createUser(input)`, `upsertUserByPhone(input)`, `updateUserProfile(userId, input)`, `deleteUser(userId)`.
- Produces `createSmsCode(input)`, `findLatestSmsCode(phone, purpose)`, `markSmsCodeConsumed(id)`, `incrementSmsCodeAttempts(id)`.
- Produces `createSession(input)`, `findSessionByTokenHash(tokenHash)`, `touchSession(tokenHash, seenAt)`, `deleteSessionByTokenHash(tokenHash)`, `deleteExpiredSessions(now)`.

- [ ] **Step 1: Add repository tests first**

Add imports:

```ts
import { createSmsCode, findLatestSmsCode, incrementSmsCodeAttempts, markSmsCodeConsumed } from '../../src/server/repositories/smsCodesRepository';
import { createSession, deleteSessionByTokenHash, findSessionByTokenHash, touchSession } from '../../src/server/repositories/sessionsRepository';
import { createUser, deleteUser, findUserByPhone, updateUserProfile, upsertUserByPhone } from '../../src/server/repositories/usersRepository';
```

Add cleanup helper:

```ts
async function cleanDatabase() {
  await prisma.matchResult.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.position.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.session.deleteMany();
  await prisma.smsCode.deleteMany();
  await prisma.user.deleteMany();
}
```

Call `await cleanDatabase();` before repository integration tests that write data.

Add tests:

```ts
async function testUsersRepositoryCreatesFindsAndUpsertsUsers() {
  await cleanDatabase();

  const created = await createUser({
    phone: '13800138000',
    name: '张三',
    school: '南京大学',
    major: '软件工程',
    graduationYear: '2027',
  });
  assert.equal(created.phone, '13800138000');

  const found = await findUserByPhone('13800138000');
  assert.equal(found?.id, created.id);

  const upserted = await upsertUserByPhone({
    phone: '13800138000',
    name: '张三更新',
  });
  assert.equal(upserted.id, created.id);
  assert.equal(upserted.name, '张三更新');

  const updated = await updateUserProfile(created.id, { school: '复旦大学' });
  assert.equal(updated.school, '复旦大学');

  await deleteUser(created.id);
  assert.equal(await findUserByPhone('13800138000'), null);
}

async function testSmsCodeRepositoryStoresAndConsumesHashOnly() {
  await cleanDatabase();

  const code = await createSmsCode({
    phone: '13800138001',
    codeHash: 'hashed-code',
    purpose: 'login',
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
  });
  assert.equal(code.codeHash, 'hashed-code');

  const latest = await findLatestSmsCode('13800138001', 'login');
  assert.equal(latest?.id, code.id);

  const attempted = await incrementSmsCodeAttempts(code.id);
  assert.equal(attempted.attempts, 1);

  const consumed = await markSmsCodeConsumed(code.id);
  assert.ok(consumed.consumedAt);
}

async function testSessionRepositoryStoresTokenHashAndTouch() {
  await cleanDatabase();

  const user = await createUser({ phone: '13800138002' });
  const session = await createSession({
    userId: user.id,
    tokenHash: 'hashed-token',
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    userAgent: 'tests',
    ipAddress: '127.0.0.1',
  });
  assert.equal(session.tokenHash, 'hashed-token');

  const found = await findSessionByTokenHash('hashed-token');
  assert.equal(found?.id, session.id);

  const touched = await touchSession('hashed-token', new Date('2030-01-01T00:01:00.000Z'));
  assert.equal(touched.lastSeenAt?.toISOString(), '2030-01-01T00:01:00.000Z');

  await deleteSessionByTokenHash('hashed-token');
  assert.equal(await findSessionByTokenHash('hashed-token'), null);
}
```

Add these three test functions to the `tests` array.

- [ ] **Step 2: Run tests to see missing modules fail**

Run with `TEST_DATABASE_URL` configured and migrated:

```bash
npm run test:db
```

Expected: FAIL because repository modules are missing.

- [ ] **Step 3: Implement users repository**

Create `src/server/repositories/usersRepository.ts`:

```ts
import type { Prisma } from '@prisma/client';
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type CreateUserInput = Pick<Prisma.UserCreateInput, 'phone' | 'name' | 'school' | 'major' | 'graduationYear'>;
export type UpdateUserProfileInput = Pick<Prisma.UserUpdateInput, 'name' | 'school' | 'major' | 'graduationYear'>;

export function findUserByPhone(phone: string) {
  return runDb(() => prisma.user.findUnique({ where: { phone } }));
}

export function findUserById(userId: string) {
  return runDb(() => prisma.user.findUnique({ where: { id: userId } }));
}

export function createUser(input: CreateUserInput) {
  return runDb(() => prisma.user.create({ data: input }));
}

export function upsertUserByPhone(input: CreateUserInput) {
  return runDb(() => prisma.user.upsert({
    where: { phone: input.phone },
    create: input,
    update: {
      name: input.name,
      school: input.school,
      major: input.major,
      graduationYear: input.graduationYear,
    },
  }));
}

export function updateUserProfile(userId: string, input: UpdateUserProfileInput) {
  return runDb(() => prisma.user.update({ where: { id: userId }, data: input }));
}

export function deleteUser(userId: string) {
  return runDb(() => prisma.user.delete({ where: { id: userId } }));
}
```

- [ ] **Step 4: Implement SMS-code repository**

Create `src/server/repositories/smsCodesRepository.ts`:

```ts
import type { Prisma } from '@prisma/client';
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type CreateSmsCodeInput = Pick<Prisma.SmsCodeCreateInput, 'phone' | 'codeHash' | 'purpose' | 'expiresAt'>;

export function createSmsCode(input: CreateSmsCodeInput) {
  return runDb(() => prisma.smsCode.create({ data: input }));
}

export function findLatestSmsCode(phone: string, purpose: string) {
  return runDb(() => prisma.smsCode.findFirst({
    where: { phone, purpose },
    orderBy: { createdAt: 'desc' },
  }));
}

export function markSmsCodeConsumed(id: string) {
  return runDb(() => prisma.smsCode.update({
    where: { id },
    data: { consumedAt: new Date() },
  }));
}

export function incrementSmsCodeAttempts(id: string) {
  return runDb(() => prisma.smsCode.update({
    where: { id },
    data: { attempts: { increment: 1 } },
  }));
}
```

- [ ] **Step 5: Implement sessions repository**

Create `src/server/repositories/sessionsRepository.ts`:

```ts
import type { Prisma } from '@prisma/client';
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type CreateSessionInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export function createSession(input: CreateSessionInput) {
  return runDb(() => prisma.session.create({ data: input }));
}

export function findSessionByTokenHash(tokenHash: string) {
  return runDb(() => prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  }));
}

export function touchSession(tokenHash: string, seenAt = new Date()) {
  return runDb(() => prisma.session.update({
    where: { tokenHash },
    data: { lastSeenAt: seenAt },
  }));
}

export function deleteSessionByTokenHash(tokenHash: string) {
  return runDb(() => prisma.session.delete({ where: { tokenHash } }));
}

export function deleteExpiredSessions(now = new Date()) {
  return runDb(() => prisma.session.deleteMany({
    where: { expiresAt: { lt: now } },
  }));
}
```

- [ ] **Step 6: Run DB tests and typecheck**

Run:

```bash
npm run test:db
npm run typecheck
```

Expected: guarded skip without `TEST_DATABASE_URL`, or all current repository tests PASS with a migrated test DB; typecheck PASS.

- [ ] **Step 7: Commit Task 5**

```bash
git add src/server/repositories/usersRepository.ts src/server/repositories/smsCodesRepository.ts src/server/repositories/sessionsRepository.ts tests/db/repositories.test.ts
git commit -m "feat: add user auth support repositories"
```

---

### Task 6: Private User Data Repositories

**Files:**
- Create: `src/server/repositories/resumesRepository.ts`
- Create: `src/server/repositories/assessmentsRepository.ts`
- Create: `src/server/repositories/matchResultsRepository.ts`
- Modify: `tests/db/repositories.test.ts`

**Interfaces:**
- Produces `createResume(userId, input)`, `getLatestResumeByUserId(userId)`, `getResumeByIdForUser(userId, resumeId)`, `updateLatestResumeByUserId(userId, input)`, `deleteLatestResumeByUserId(userId)`.
- Produces `createAssessment(userId, input)`, `getLatestAssessmentByUserId(userId)`, `getAssessmentByIdForUser(userId, assessmentId)`, `deleteLatestAssessmentByUserId(userId)`.
- Produces `findCachedMatchResult(input)`, `createMatchResult(input)`.
- All functions require `userId` for private user data access.

- [ ] **Step 1: Add tests for user-scoped resume/assessment/match cache**

Add imports:

```ts
import { createAssessment, getAssessmentByIdForUser, getLatestAssessmentByUserId } from '../../src/server/repositories/assessmentsRepository';
import { createMatchResult, findCachedMatchResult } from '../../src/server/repositories/matchResultsRepository';
import { createResume, getLatestResumeByUserId, getResumeByIdForUser, updateLatestResumeByUserId } from '../../src/server/repositories/resumesRepository';
```

Add tests:

```ts
async function testResumeRepositoryRequiresUserScope() {
  await cleanDatabase();

  const owner = await createUser({ phone: '13800138100' });
  const other = await createUser({ phone: '13800138101' });
  const resume = await createResume(owner.id, {
    name: '李四',
    school: '浙江大学',
    major: '计算机科学',
    graduationYear: '2027',
    skills: ['TypeScript', 'PostgreSQL'],
    internships: [],
    projects: [],
    inferredDirection: '后端开发',
    targetCities: ['杭州'],
    rawText: '完整简历文本',
    sourceFileName: 'resume.txt',
    sourceFileType: 'text',
  });

  const latest = await getLatestResumeByUserId(owner.id);
  assert.equal(latest?.id, resume.id);

  const crossUserRead = await getResumeByIdForUser(other.id, resume.id);
  assert.equal(crossUserRead, null);

  const updated = await updateLatestResumeByUserId(owner.id, { inferredDirection: '平台研发' });
  assert.equal(updated?.inferredDirection, '平台研发');
}

async function testAssessmentRepositoryRequiresUserScope() {
  await cleanDatabase();

  const owner = await createUser({ phone: '13800138102' });
  const other = await createUser({ phone: '13800138103' });
  const assessment = await createAssessment(owner.id, {
    answers: [{ id: 1, score: 5 }],
    typeTitle: '尽责稳定型',
    description: '适合长期复杂任务。',
    radarScores: [{ dimension: 'C', score: 90, avg: 65 }],
    industryFit: { stateOwned: 80, internet: 75 },
    hollandCode: 'RCI',
    hollandTags: ['现实型', '常规型', '研究型'],
    deepInterpretation: { summary: '稳定', advantages: ['可靠'] },
  });

  const latest = await getLatestAssessmentByUserId(owner.id);
  assert.equal(latest?.id, assessment.id);

  const crossUserRead = await getAssessmentByIdForUser(other.id, assessment.id);
  assert.equal(crossUserRead, null);
}

async function testMatchResultRepositoryCachesByHashes() {
  await cleanDatabase();

  const user = await createUser({ phone: '13800138104' });
  const resume = await createResume(user.id, {
    name: '王五',
    school: '上海交通大学',
    major: '软件工程',
    graduationYear: '2027',
    skills: ['Node.js'],
    internships: [],
    projects: [],
    inferredDirection: '后端开发',
    targetCities: ['上海'],
  });
  const assessment = await createAssessment(user.id, {
    answers: [],
    typeTitle: '探索执行型',
    description: '学习快。',
    radarScores: [],
    industryFit: { stateOwned: 70, internet: 85 },
    hollandCode: 'IRC',
    hollandTags: ['研究型'],
    deepInterpretation: { summary: '探索', advantages: [] },
  });
  const position = await prisma.position.create({
    data: {
      title: '后端开发工程师',
      company: '示例科技',
      city: '上海',
      type: 'internet',
      tags: ['校招'],
      summary: '负责后端服务。',
      responsibilities: ['开发 API'],
      requirements: ['Node.js'],
      softSkills: ['协作'],
    },
  });

  await createMatchResult({
    userId: user.id,
    resumeId: resume.id,
    assessmentId: assessment.id,
    positionId: position.id,
    resumeHash: 'resume-hash',
    assessmentHash: 'assessment-hash',
    resumeMatch: 82,
    personalityMatch: 76,
    overallMatch: 80,
    resumeMatchExplanation: '技能匹配。',
    personalityMatchExplanation: '性格匹配。',
    whyExcellent: '基础扎实。',
    provider: 'zhipu',
    model: 'glm-4-flash',
  });

  const cached = await findCachedMatchResult({
    userId: user.id,
    resumeId: resume.id,
    assessmentId: assessment.id,
    positionId: position.id,
    resumeHash: 'resume-hash',
    assessmentHash: 'assessment-hash',
  });
  assert.equal(cached?.overallMatch, 80);
}
```

Add all three tests to the `tests` array.

- [ ] **Step 2: Run tests to see missing modules fail**

Run with `TEST_DATABASE_URL` configured:

```bash
npm run test:db
```

Expected: FAIL because repository modules are missing.

- [ ] **Step 3: Implement resumes repository**

Create `src/server/repositories/resumesRepository.ts`:

```ts
import type { Prisma } from '@prisma/client';
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type CreateResumeInput = Omit<Prisma.ResumeUncheckedCreateInput, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type UpdateResumeInput = Partial<CreateResumeInput>;

export function createResume(userId: string, input: CreateResumeInput) {
  return runDb(() => prisma.resume.create({ data: { ...input, userId } }));
}

export function getLatestResumeByUserId(userId: string) {
  return runDb(() => prisma.resume.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  }));
}

export function getResumeByIdForUser(userId: string, resumeId: string) {
  return runDb(() => prisma.resume.findFirst({
    where: { id: resumeId, userId },
  }));
}

export async function updateLatestResumeByUserId(userId: string, input: UpdateResumeInput) {
  const latest = await getLatestResumeByUserId(userId);
  if (!latest) {
    return null;
  }
  return runDb(() => prisma.resume.update({
    where: { id: latest.id },
    data: input,
  }));
}

export async function deleteLatestResumeByUserId(userId: string) {
  const latest = await getLatestResumeByUserId(userId);
  if (!latest) {
    return null;
  }
  return runDb(() => prisma.resume.delete({ where: { id: latest.id } }));
}
```

- [ ] **Step 4: Implement assessments repository**

Create `src/server/repositories/assessmentsRepository.ts`:

```ts
import type { Prisma } from '@prisma/client';
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type CreateAssessmentInput = Omit<Prisma.AssessmentUncheckedCreateInput, 'id' | 'userId' | 'createdAt'>;

export function createAssessment(userId: string, input: CreateAssessmentInput) {
  return runDb(() => prisma.assessment.create({ data: { ...input, userId } }));
}

export function getLatestAssessmentByUserId(userId: string) {
  return runDb(() => prisma.assessment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  }));
}

export function getAssessmentByIdForUser(userId: string, assessmentId: string) {
  return runDb(() => prisma.assessment.findFirst({
    where: { id: assessmentId, userId },
  }));
}

export async function deleteLatestAssessmentByUserId(userId: string) {
  const latest = await getLatestAssessmentByUserId(userId);
  if (!latest) {
    return null;
  }
  return runDb(() => prisma.assessment.delete({ where: { id: latest.id } }));
}
```

- [ ] **Step 5: Implement match-results repository**

Create `src/server/repositories/matchResultsRepository.ts`:

```ts
import type { Prisma } from '@prisma/client';
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type CachedMatchResultInput = {
  userId: string;
  resumeId: string;
  assessmentId: string;
  positionId: string;
  resumeHash: string;
  assessmentHash: string;
};

export type CreateMatchResultInput = Omit<Prisma.MatchResultUncheckedCreateInput, 'id' | 'createdAt'>;

export function findCachedMatchResult(input: CachedMatchResultInput) {
  return runDb(() => prisma.matchResult.findUnique({
    where: {
      userId_resumeId_assessmentId_positionId_resumeHash_assessmentHash: input,
    },
  }));
}

export function createMatchResult(input: CreateMatchResultInput) {
  return runDb(() => prisma.matchResult.create({ data: input }));
}
```

- [ ] **Step 6: Run DB tests and typecheck**

Run:

```bash
npm run test:db
npm run typecheck
```

Expected: guarded skip without `TEST_DATABASE_URL`, or all current repository tests PASS with a migrated test DB; typecheck PASS.

- [ ] **Step 7: Commit Task 6**

```bash
git add src/server/repositories/resumesRepository.ts src/server/repositories/assessmentsRepository.ts src/server/repositories/matchResultsRepository.ts tests/db/repositories.test.ts
git commit -m "feat: add private data repositories"
```

---

### Task 7: Position and Favorite Repositories

**Files:**
- Create: `src/server/repositories/positionsRepository.ts`
- Create: `src/server/repositories/favoritesRepository.ts`
- Modify: `tests/db/repositories.test.ts`

**Interfaces:**
- Produces `listPositions(filters)`, `countPositions(filters)`, `getPositionById(positionId)`.
- Produces `listFavoritesByUserId(userId)`, `addFavorite(userId, positionId)`, `removeFavorite(userId, positionId)`, `isFavorite(userId, positionId)`.
- `listPositions` accepts `{ q?: string; type?: string; industry?: string; category?: string; city?: string; page?: number; pageSize?: number }`.
- `listPositions` normalizes `page` to at least 1 and caps `pageSize` at 50.
- `addFavorite` is idempotent for duplicate favorites.

- [ ] **Step 1: Add position/favorite repository tests first**

Add imports:

```ts
import { addFavorite, isFavorite, listFavoritesByUserId, removeFavorite } from '../../src/server/repositories/favoritesRepository';
import { countPositions, getPositionById, listPositions } from '../../src/server/repositories/positionsRepository';
```

Add tests:

```ts
async function createTestPosition(overrides: Partial<Parameters<typeof prisma.position.create>[0]['data']> = {}) {
  return prisma.position.create({
    data: {
      title: 'AI产品经理',
      company: `示例公司${Math.random().toString(36).slice(2)}`,
      city: '北京',
      type: 'internet',
      industry: '互联网',
      category: '产品类',
      tags: ['校招'],
      summary: '负责 AI 产品。',
      responsibilities: ['需求分析'],
      requirements: ['SQL'],
      softSkills: ['沟通'],
      ...overrides,
    },
  });
}

async function testPositionsRepositoryFiltersAndPaginates() {
  await cleanDatabase();

  const first = await createTestPosition({ title: 'AI产品经理', city: '北京' });
  await createTestPosition({ title: '后端开发工程师', city: '上海', category: '技术类' });

  const positions = await listPositions({ q: 'AI', city: '北京', page: 1, pageSize: 100 });
  assert.equal(positions.length, 1);
  assert.equal(positions[0].id, first.id);

  const count = await countPositions({ city: '北京' });
  assert.equal(count, 1);

  const byId = await getPositionById(first.id);
  assert.equal(byId?.title, 'AI产品经理');
}

async function testFavoritesRepositoryIsIdempotent() {
  await cleanDatabase();

  const user = await createUser({ phone: '13800138200' });
  const position = await createTestPosition({ company: '收藏测试公司' });

  await addFavorite(user.id, position.id);
  await addFavorite(user.id, position.id);

  const favorites = await listFavoritesByUserId(user.id);
  assert.equal(favorites.length, 1);
  assert.equal(await isFavorite(user.id, position.id), true);

  await removeFavorite(user.id, position.id);
  assert.equal(await isFavorite(user.id, position.id), false);
}
```

Replace the `Math.random()` helper with deterministic unique company names before committing:

```ts
let positionCounter = 0;
async function createTestPosition(overrides: Partial<Parameters<typeof prisma.position.create>[0]['data']> = {}) {
  positionCounter += 1;
  return prisma.position.create({
    data: {
      title: 'AI产品经理',
      company: `示例公司${positionCounter}`,
      city: '北京',
      type: 'internet',
      industry: '互联网',
      category: '产品类',
      tags: ['校招'],
      summary: '负责 AI 产品。',
      responsibilities: ['需求分析'],
      requirements: ['SQL'],
      softSkills: ['沟通'],
      ...overrides,
    },
  });
}
```

Add both tests to the `tests` array.

- [ ] **Step 2: Run tests to see missing modules fail**

Run with `TEST_DATABASE_URL` configured:

```bash
npm run test:db
```

Expected: FAIL because `positionsRepository.ts` and `favoritesRepository.ts` are missing.

- [ ] **Step 3: Implement positions repository**

Create `src/server/repositories/positionsRepository.ts`:

```ts
import type { Prisma } from '@prisma/client';
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type PositionFilters = {
  q?: string;
  type?: string;
  industry?: string;
  category?: string;
  city?: string;
  page?: number;
  pageSize?: number;
};

const MAX_PAGE_SIZE = 50;

function normalizePage(page?: number) {
  return Math.max(1, Math.floor(page || 1));
}

function normalizePageSize(pageSize?: number) {
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize || 20)));
}

function buildWhere(filters: PositionFilters): Prisma.PositionWhereInput {
  const where: Prisma.PositionWhereInput = {};

  if (filters.q?.trim()) {
    const query = filters.q.trim();
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { company: { contains: query, mode: 'insensitive' } },
      { summary: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (filters.type) where.type = filters.type;
  if (filters.industry) where.industry = filters.industry;
  if (filters.category) where.category = filters.category;
  if (filters.city) where.city = filters.city;

  return where;
}

export function listPositions(filters: PositionFilters = {}) {
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);

  return runDb(() => prisma.position.findMany({
    where: buildWhere(filters),
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  }));
}

export function countPositions(filters: PositionFilters = {}) {
  return runDb(() => prisma.position.count({ where: buildWhere(filters) }));
}

export function getPositionById(positionId: string) {
  return runDb(() => prisma.position.findUnique({ where: { id: positionId } }));
}
```

- [ ] **Step 4: Implement favorites repository**

Create `src/server/repositories/favoritesRepository.ts`:

```ts
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export function listFavoritesByUserId(userId: string) {
  return runDb(() => prisma.favorite.findMany({
    where: { userId },
    include: { position: true },
    orderBy: { createdAt: 'desc' },
  }));
}

export function addFavorite(userId: string, positionId: string) {
  return runDb(() => prisma.favorite.upsert({
    where: { userId_positionId: { userId, positionId } },
    create: { userId, positionId },
    update: {},
  }));
}

export function removeFavorite(userId: string, positionId: string) {
  return runDb(() => prisma.favorite.deleteMany({
    where: { userId, positionId },
  }));
}

export async function isFavorite(userId: string, positionId: string) {
  const favorite = await runDb(() => prisma.favorite.findUnique({
    where: { userId_positionId: { userId, positionId } },
    select: { id: true },
  }));
  return Boolean(favorite);
}
```

- [ ] **Step 5: Run DB tests and typecheck**

Run:

```bash
npm run test:db
npm run typecheck
```

Expected: guarded skip without `TEST_DATABASE_URL`, or all repository tests PASS with a migrated test DB; typecheck PASS.

- [ ] **Step 6: Commit Task 7**

```bash
git add src/server/repositories/positionsRepository.ts src/server/repositories/favoritesRepository.ts tests/db/repositories.test.ts
git commit -m "feat: add position and favorite repositories"
```

---

### Task 8: Full Guarded-Live Repository Test Cleanup and Documentation

**Files:**
- Modify: `tests/db/run-tests.ts`
- Modify: `tests/db/repositories.test.ts`
- Modify: `README.md`

**Interfaces:**
- `npm run test:db` exits 0 and prints skip message if `TEST_DATABASE_URL` is not configured.
- With `TEST_DATABASE_URL`, `npm run test:db` uses the test database only, cleans tables, runs all repository tests, and disconnects Prisma.
- README documents local PostgreSQL creation, Prisma generation, migration, seed, and tests.

- [ ] **Step 1: Harden test runner against accidental dev DB cleanup**

Update `tests/db/run-tests.ts`:

```ts
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  console.log('test:db skipped: TEST_DATABASE_URL is not configured');
  process.exit(0);
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL === testDatabaseUrl) {
  console.error('test:db refused: TEST_DATABASE_URL must be separate from DATABASE_URL');
  process.exit(1);
}

process.env.DATABASE_URL = testDatabaseUrl;

try {
  await import('./repositories.test');
} finally {
  const { prisma } = await import('../../src/server/db/prisma');
  await prisma.$disconnect();
}
```

- [ ] **Step 2: Ensure repository tests clean tables in dependency-safe order**

Keep this helper in `tests/db/repositories.test.ts` and call it before each integration test that writes data:

```ts
async function cleanDatabase() {
  await prisma.matchResult.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.position.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.session.deleteMany();
  await prisma.smsCode.deleteMany();
  await prisma.user.deleteMany();
}
```

- [ ] **Step 3: Add PostgreSQL setup docs to README**

Add a new section after local environment variable setup:

```md
### PostgreSQL + Prisma 数据层（第三阶段）

第三阶段使用本机 PostgreSQL，不引入 Docker Compose。默认开发数据库和测试数据库可参考 `.env.example`：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/careermatch?schema=public"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/careermatch_test?schema=public"
```

如果本机可使用 `createdb`：

```bash
createdb careermatch
createdb careermatch_test
```

Windows 上如果没有 `createdb` 命令，可以用 pgAdmin 或 `psql` 手动执行：

```sql
CREATE DATABASE careermatch;
CREATE DATABASE careermatch_test;
```

初始化 Prisma：

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

数据库测试：

```bash
npm run test:db
```

未配置 `TEST_DATABASE_URL` 时，`test:db` 会输出 `test:db skipped: TEST_DATABASE_URL is not configured` 并以 0 退出，避免没有本机 PostgreSQL 的环境被阻塞。配置 `TEST_DATABASE_URL` 后，测试脚本会把 Prisma datasource 指向测试库并清理测试表；不要把 `TEST_DATABASE_URL` 配成开发库。
```

- [ ] **Step 4: Run final verification commands**

Run:

```bash
npm run test:files
npm run test:ai
npm run test:db
npm run typecheck
npm run build
```

Expected:

- `test:files`: PASS.
- `test:ai`: PASS.
- `test:db`: PASS with configured `TEST_DATABASE_URL`, or skipped with exit 0 when not configured.
- `typecheck`: PASS.
- `build`: PASS.

- [ ] **Step 5: Confirm non-goals were respected**

Inspect changed files and confirm:

```bash
git diff --name-only HEAD~8..HEAD
```

Expected: changes are limited to Prisma/data-layer/test/docs/package files. There are no UI redesign changes, no Firebase deletion, and no auth API route implementation.

- [ ] **Step 6: Commit Task 8**

```bash
git add tests/db/run-tests.ts tests/db/repositories.test.ts README.md
git commit -m "docs: document postgres prisma data layer"
```

---

## Self-Review Notes

**Spec coverage:**
- PostgreSQL + Prisma dependencies and scripts: Task 1.
- Prisma schema and first migration: Task 2.
- Prisma Client singleton and database error wrapper: Task 3.
- Position seed from existing static data with idempotent upsert: Task 4.
- User, resume, assessment, position, favorite, match-cache repositories: Tasks 5-7.
- SmsCode and Session tables plus basic repositories for Phase 4: Tasks 2 and 5.
- Guarded-live database test behavior: Tasks 1 and 8.
- README and `.env.example`: Tasks 1 and 8.
- Security/privacy/performance constraints: Global Constraints plus Tasks 2, 6, 7, 8.
- Final verification commands: Task 8.

**Placeholder scan:** no `TBD`, `TODO`, `implement later`, or placeholder error-handling instructions are left in this plan. Each task names concrete files, interfaces, tests, commands, and expected outcomes.

**Type consistency:** repository function names match the spec and are used consistently across tests and implementation snippets. Prisma compound unique names used by repositories match the model definitions: `company_title_city`, `userId_positionId`, and `userId_resumeId_assessmentId_positionId_resumeHash_assessmentHash`.
