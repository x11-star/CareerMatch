# CareerMatch 第三阶段：PostgreSQL + Prisma 数据层设计

## 1. 背景

CareerMatch 已完成前两阶段：

1. **AI Provider 重构**：Gemini 已移除，后端 AI Service 统一使用智谱首发、DeepSeek 兜底；AI Key 未配置时返回真实配置错误，不再用假数据或随机结果冒充 AI。
2. **文件解析与本地 OCR**：后端已支持 TXT、DOCX、文本 PDF、图片简历和扫描 PDF 的本地解析/OCR；上传格式、8MB 解码后大小限制、PDF 前 3 页 OCR、20,000 字符 AI 输入上限均已落地。

第三阶段目标是建立真实数据层，为下一阶段“认证与数据 API”替换 Firebase/localStorage 打地基。

## 2. 第三阶段目标

本阶段只做：

- 引入 PostgreSQL + Prisma。
- 定义 Prisma schema 和第一版 migration。
- 新建 Prisma Client 入口和数据库错误封装。
- 写岗位 seed 脚本，把现有岗位数据导入 PostgreSQL。
- 新建 Repository Layer，封装用户、简历、测评、岗位、收藏、匹配缓存的数据访问。
- 新增数据库测试脚本和 repository 测试。
- 更新 README 与 `.env.example`，记录本机 PostgreSQL 配置、migration、seed 和测试方式。

本阶段完成后，后端应具备可复用的数据访问能力，但前端业务流仍可暂时沿用现有 Firebase/localStorage/静态数据路径，待第四阶段统一替换。

## 3. 非目标

本阶段不做：

- 不删除 Firebase Auth。
- 不替换前端登录、收藏、简历保存、测评保存等现有调用。
- 不实现手机号验证码登录 API。
- 不设置 HttpOnly Cookie Session 的路由逻辑。
- 不重做 UI/UX。
- 不实现真实 PDF 报告导出。
- 不引入 Docker Compose；本阶段使用用户本机 PostgreSQL。
- 不接入真实短信服务。

这些能力保留到后续阶段：

- 阶段 4：认证与数据 API。
- 阶段 5：UI/UX 重做。
- 阶段 6：报告导出与上线预备。

## 4. 运行方式决策

本阶段使用 **本机 PostgreSQL**。

默认开发数据库：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/careermatch?schema=public"
```

推荐测试数据库：

```env
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/careermatch_test?schema=public"
```

说明：

- `DATABASE_URL` 用于开发 migration、seed 和本地运行。
- `TEST_DATABASE_URL` 用于数据库测试，避免污染开发数据。
- 如果本机 PostgreSQL 用户名、密码或端口不同，开发者应在本地 `.env` 中调整。
- `.env.example` 只提供默认参考值，不包含真实密码。

## 5. package 与脚本设计

新增依赖：

```text
@prisma/client
```

新增开发依赖：

```text
prisma
```

新增 scripts：

```json
{
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:seed": "tsx prisma/seed.ts",
  "db:studio": "prisma studio",
  "test:db": "tsx tests/db/run-tests.ts"
}
```

保留现有脚本：

- `test:files`
- `test:ai`
- `typecheck`
- `build`

## 6. Prisma schema 设计

新增：

```text
prisma/schema.prisma
```

数据库 provider：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### 6.1 User

用途：未来手机号登录后的用户主体。

字段：

```text
id              String   @id @default(cuid())
phone           String   @unique
name            String?
school          String?
major           String?
graduationYear  String?
createdAt       DateTime @default(now())
updatedAt       DateTime @updatedAt
```

关系：

- 一个用户有多个 `Resume`。
- 一个用户有多个 `Assessment`。
- 一个用户有多个 `Session`。
- 一个用户有多个 `Favorite`。
- 一个用户有多个 `MatchResult`。

### 6.2 SmsCode

用途：第四阶段开发模式手机号验证码。第三阶段只建表和 repository，不实现认证路由。

字段：

```text
id          String    @id @default(cuid())
phone       String
codeHash    String
purpose     String
expiresAt   DateTime
consumedAt  DateTime?
attempts    Int       @default(0)
createdAt   DateTime  @default(now())
```

索引：

```text
@@index([phone, createdAt])
```

约束意图：

- 验证码有效期 5 分钟。
- 最大尝试次数 5 次。
- 同手机号发送间隔 60 秒。

这些业务规则在第四阶段 Auth Service 中实现；第三阶段可在 repository 测试中验证基本创建、查询和消费字段。

### 6.3 Session

用途：第四阶段 HttpOnly Cookie Session 的服务端存储。

字段：

```text
id          String    @id @default(cuid())
userId      String
tokenHash   String    @unique
expiresAt   DateTime
createdAt   DateTime  @default(now())
lastSeenAt  DateTime?
userAgent   String?
ipAddress   String?
```

索引：

```text
@@index([userId])
@@index([tokenHash])
```

关系：

- `Session.userId` 关联 `User.id`。
- 删除用户时级联删除 sessions。

### 6.4 Resume

用途：保存 AI 结构化后的简历与必要的原始文本。

字段：

```text
id                 String   @id @default(cuid())
userId             String
name               String
school             String
major              String
graduationYear     String
skills             Json
internships        Json
projects           Json
inferredDirection  String
targetCities       Json
rawText            String?
sourceFileName     String?
sourceFileType     String?
createdAt          DateTime @default(now())
updatedAt          DateTime @updatedAt
```

索引：

```text
@@index([userId, updatedAt])
```

隐私边界：

- `rawText` 可能包含完整简历文本，属于敏感数据。
- 本阶段 repository 必须所有读取都支持按 `userId` 范围查询。
- 第四阶段 API 必须基于 session 限制只能访问自己的简历。

### 6.5 Assessment

用途：保存职业测评答案和结果。

字段：

```text
id                  String   @id @default(cuid())
userId              String
answers             Json
typeTitle           String
description         String
radarScores         Json
industryFit         Json
hollandCode         String
hollandTags         Json
deepInterpretation  Json
createdAt           DateTime @default(now())
```

索引：

```text
@@index([userId, createdAt])
```

### 6.6 Position

用途：岗位库主表。

字段：

```text
id                String   @id @default(cuid())
title             String
company           String
city              String
type              String
industry          String?
category          String?
subIndustry       String?
subCategory       String?
salaryRange       String?
difficultyRating  String?
tags              Json
summary           String
responsibilities  Json
requirements      Json
softSkills        Json
salaryDetail      String?
careerPath        Json?
fitPersonality    Json?
howToPrepare      Json?
relatedJobs       Json?
createdAt         DateTime @default(now())
updatedAt         DateTime @updatedAt
```

唯一约束：

```text
@@unique([company, title, city])
```

索引：

```text
@@index([type])
@@index([industry])
@@index([category])
@@index([city])
```

说明：

- `company + title + city` 作为 seed 的稳定 upsert key。
- 如果现有岗位数据存在同公司、同岗位、同城市但不同批次的情况，实施时应在 seed 阶段补充更稳定的 slug。当前设计先按现有数据结构处理。

### 6.7 Favorite

用途：用户收藏岗位。

字段：

```text
id          String   @id @default(cuid())
userId      String
positionId  String
createdAt   DateTime @default(now())
```

唯一约束：

```text
@@unique([userId, positionId])
```

索引：

```text
@@index([userId])
@@index([positionId])
```

### 6.8 MatchResult

用途：缓存 AI 匹配结果，减少重复调用 AI。

字段：

```text
id                            String   @id @default(cuid())
userId                        String
resumeId                      String
assessmentId                  String
positionId                    String
resumeHash                    String
assessmentHash                String
resumeMatch                   Int
personalityMatch              Int
overallMatch                  Int
resumeMatchExplanation        String
personalityMatchExplanation   String
whyExcellent                  String
provider                      String
model                         String
createdAt                     DateTime @default(now())
```

唯一约束：

```text
@@unique([userId, resumeId, assessmentId, positionId, resumeHash, assessmentHash])
```

索引：

```text
@@index([userId, positionId, resumeId, assessmentId])
```

说明：

- `resumeHash` 和 `assessmentHash` 用于判断同一条简历/测评内容是否变化。
- 哈希生成逻辑可在第四阶段 Match API 中实现；第三阶段只保存字段和 repository 查询能力。

## 7. Migration

执行：

```bash
npm run db:migrate
```

应生成第一版 migration：

```text
prisma/migrations/<timestamp>_init/migration.sql
```

验收：

- migration 能在本机 PostgreSQL 的 `careermatch` 数据库成功执行。
- `npm run db:generate` 能生成 Prisma Client。

## 8. Prisma Client 入口

新增：

```text
src/server/db/prisma.ts
```

职责：

- 创建 Prisma Client。
- 开发环境避免热更新重复创建连接。
- 导出 `prisma` 供 repositories 使用。

设计：

```text
src/server/db/prisma.ts
  -> export const prisma
```

不要在 React 前端代码中导入该模块。Prisma 只允许后端使用。

## 9. 数据库错误封装

新增：

```text
src/server/db/errors.ts
```

职责：

- 识别 Prisma 唯一约束冲突。
- 识别 record not found。
- 提供可被第四阶段 API 层映射的错误类型。

建议错误：

```text
DatabaseError
UniqueConstraintError
RecordNotFoundError
```

第三阶段不要求完整 HTTP 映射，但 repository 应避免把 Prisma 原始错误直接泄漏给未来 API 层。

## 10. Seed 设计

新增：

```text
prisma/seed.ts
```

目标：把现有岗位数据导入 PostgreSQL。

数据来源：优先读取当前项目中的岗位静态数据文件，实施时先定位 `src/data.ts` 或等价文件中的岗位数组。

Seed 行为：

1. 读取现有岗位数据。
2. 映射到 `Position` 字段。
3. 使用 `company + title + city` upsert。
4. 支持重复运行，不产生重复岗位。
5. 输出导入数量和更新数量。

命令：

```bash
npm run db:seed
```

验收输出示例：

```text
Seeded positions: created 42, updated 0
```

如果现有岗位数据字段和 Prisma schema 不完全一致，seed 脚本负责做兼容映射，不修改前端数据结构。

## 11. Repository Layer

新增：

```text
src/server/repositories/
```

### 11.1 usersRepository.ts

职责：用户资料数据访问。

接口：

```text
findUserByPhone(phone)
findUserById(userId)
createUser(input)
upsertUserByPhone(input)
updateUserProfile(userId, input)
deleteUser(userId)
```

### 11.2 resumesRepository.ts

职责：简历数据访问。

接口：

```text
createResume(userId, input)
getLatestResumeByUserId(userId)
getResumeByIdForUser(userId, resumeId)
updateLatestResumeByUserId(userId, input)
deleteLatestResumeByUserId(userId)
```

所有读取和写入必须带 `userId` 范围，避免未来 API 层误用。

### 11.3 assessmentsRepository.ts

职责：测评数据访问。

接口：

```text
createAssessment(userId, input)
getLatestAssessmentByUserId(userId)
getAssessmentByIdForUser(userId, assessmentId)
deleteLatestAssessmentByUserId(userId)
```

### 11.4 positionsRepository.ts

职责：岗位库查询。

接口：

```text
listPositions(filters)
countPositions(filters)
getPositionById(positionId)
```

`listPositions` 支持：

```text
q
type
industry
category
city
page
pageSize
```

约束：

- `page` 最小为 1。
- `pageSize` 应设置上限，例如 50，避免一次性返回全量岗位。
- 列表查询可以返回完整 `Position` 对象；第四阶段 API 再决定摘要字段裁剪。

### 11.5 favoritesRepository.ts

职责：收藏数据访问。

接口：

```text
listFavoritesByUserId(userId)
addFavorite(userId, positionId)
removeFavorite(userId, positionId)
isFavorite(userId, positionId)
```

约束：

- `addFavorite` 对重复收藏应幂等，不能抛出用户不可理解的唯一约束错误。

### 11.6 matchResultsRepository.ts

职责：匹配结果缓存。

接口：

```text
findCachedMatchResult(input)
createMatchResult(input)
```

`findCachedMatchResult` 使用：

```text
userId
resumeId
assessmentId
positionId
resumeHash
assessmentHash
```

## 12. 数据库测试设计

新增：

```text
tests/db/run-tests.ts
tests/db/repositories.test.ts
```

脚本：

```json
"test:db": "tsx tests/db/run-tests.ts"
```

### 12.1 数据库缺失时的行为

如果没有配置 `TEST_DATABASE_URL`，`test:db` 应跳过 guarded-live 测试，并输出：

```text
test:db skipped: TEST_DATABASE_URL is not configured
```

这保证没有本机 PostgreSQL 的环境仍能跑普通测试，不阻塞 AI 和文件解析开发。

### 12.2 配置测试数据库时的行为

如果配置了 `TEST_DATABASE_URL`：

1. 测试脚本使用 `TEST_DATABASE_URL` 覆盖 Prisma datasource。
2. 测试前清理相关表。
3. 按顺序测试 repository。
4. 测试结束后断开 Prisma 连接。

测试覆盖：

- 创建用户并按手机号查询。
- phone 唯一约束或 upsert 行为。
- 创建简历并获取 latest resume。
- 创建测评并获取 latest assessment。
- 创建岗位并分页查询。
- 收藏同一岗位两次不产生重复记录。
- 创建并查询匹配缓存。

说明：

- 第三阶段测试 repository，不测试 Express API。
- Express API 接入在第四阶段测试。

## 13. README 与环境变量文档

`.env.example` 新增：

```env
# PostgreSQL: 本机开发数据库。
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/careermatch?schema=public"

# PostgreSQL: 数据库测试专用，未配置时 test:db 会跳过 guarded-live 测试。
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/careermatch_test?schema=public"
```

README 新增本机 PostgreSQL 步骤：

```bash
# 方式一：psql / createdb 可用时
createdb careermatch
createdb careermatch_test

# 初始化 Prisma
npm run db:generate
npm run db:migrate
npm run db:seed

# 数据库测试
npm run test:db
```

Windows 上如果没有 `createdb` 命令，README 应说明可以用 pgAdmin 或 psql 手动创建：

```sql
CREATE DATABASE careermatch;
CREATE DATABASE careermatch_test;
```

## 14. 验证命令

第三阶段最终验证：

```bash
npm run test:files
npm run test:ai
npm run test:db
npm run typecheck
npm run build
```

如果 `TEST_DATABASE_URL` 未配置，`npm run test:db` 可以显示 skipped，但必须退出 0。

如果配置了 `TEST_DATABASE_URL`，`npm run test:db` 必须执行真实 repository 测试并通过。

## 15. 安全与隐私要求

- Prisma Client 只允许后端导入，不能被 React 前端导入。
- Repository 中所有用户私有数据读取都必须带 `userId`。
- `rawText`、测评答案、手机号、session token hash 都视为敏感数据。
- `Session.tokenHash` 只保存 hash，不保存明文 token。
- `SmsCode.codeHash` 只保存 hash，不保存明文验证码。
- Seed 脚本只写岗位库，不写用户私有数据。
- 测试数据库清理只能作用于 `TEST_DATABASE_URL`，不能误删开发数据库。

## 16. 性能要求

- `positionsRepository.listPositions()` 必须分页。
- `pageSize` 必须有上限，建议 50。
- 常用查询字段需要索引：`type`、`industry`、`category`、`city`。
- `favorites` 和 `match_results` 使用唯一约束避免重复数据。
- Repository 不做 AI 调用，也不做文件解析；重任务留在已有 AI/File Parse Service。

## 17. 推荐实施任务

### Task 1：Prisma 基础配置

- 安装 `prisma` 和 `@prisma/client`。
- 创建 `prisma/schema.prisma`。
- 添加 `DATABASE_URL`、`TEST_DATABASE_URL` 到 `.env.example`。
- 添加 `db:*` 和 `test:db` scripts。

### Task 2：数据模型与 migration

- 添加 User、SmsCode、Session、Resume、Assessment、Position、Favorite、MatchResult models。
- 生成第一版 migration。
- 运行 `npm run db:generate` 和 `npm run db:migrate`。

### Task 3：Prisma Client 与数据库错误封装

- 新建 `src/server/db/prisma.ts`。
- 新建 `src/server/db/errors.ts`。
- 添加基础测试或类型检查覆盖。

### Task 4：岗位 seed

- 定位现有岗位数据源。
- 新建 `prisma/seed.ts`。
- 实现可重复 upsert。
- 运行 `npm run db:seed` 验证。

### Task 5：Repository Layer

- 新建 users、resumes、assessments、positions、favorites、matchResults repositories。
- 所有用户私有数据方法都带 `userId`。
- 岗位列表支持分页和基础筛选。

### Task 6：数据库测试

- 新建 `tests/db/run-tests.ts`。
- 新建 repository guarded-live tests。
- 未配置 `TEST_DATABASE_URL` 时跳过并退出 0。
- 配置测试数据库时执行真实读写测试。

### Task 7：文档和最终验证

- 更新 README。
- 运行最终验证命令。
- 确认本阶段没有 UI 重做、Firebase 删除或 Auth API 接入。

## 18. 阶段完成标准

本阶段完成时必须满足：

- `prisma/schema.prisma` 定义完整数据模型。
- 第一版 migration 可在本机 PostgreSQL 执行。
- Prisma Client 可生成。
- 岗位 seed 可重复执行且不重复插入。
- Repository Layer 可被第四阶段 API 直接复用。
- `test:db` 在未配置测试数据库时安全跳过；在配置测试数据库时通过真实数据库测试。
- `test:files`、`test:ai`、`typecheck`、`build` 仍通过。
- README 和 `.env.example` 说明本机 PostgreSQL 使用方法。
- 不引入 Docker Compose。
- 不删除 Firebase。
- 不重做 UI。

## 19. 第四阶段衔接

第四阶段可以基于本阶段产物继续：

- 删除 Firebase Auth。
- 实现手机号开发验证码。
- 实现 HttpOnly Session。
- 新增 `/api/me`、`/api/resumes`、`/api/assessments`、`/api/positions`、`/api/favorites`。
- `POST /api/match-position` 改为读取最新简历/测评，并使用 `matchResultsRepository` 缓存 AI 匹配结果。
- 前端从 Firebase/localStorage 逐步迁移到 Express API。
