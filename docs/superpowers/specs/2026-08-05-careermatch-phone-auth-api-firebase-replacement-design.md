# CareerMatch 第四阶段：手机号开发验证码认证 + API 替换 Firebase 设计

## 1. 背景

CareerMatch 前三阶段已经完成：

1. AI Provider 重构：后端 AI Service 使用智谱首发、DeepSeek 兜底；AI Key 缺失时返回真实配置错误。
2. 文件解析与本地 OCR：后端支持 TXT、DOCX、文本 PDF、图片简历和扫描 PDF 的本地解析/OCR。
3. PostgreSQL + Prisma 数据层：已经定义用户、验证码、session、简历、测评、岗位、收藏、匹配缓存等模型，并提供 repository layer 和 guarded-live 数据库测试。

第四阶段目标是把登录用户的数据路径从 Firebase Auth/Firestore 迁移到本项目后端 API + PostgreSQL，同时保留游客模式的 localStorage 体验。

## 2. 第四阶段目标

本阶段做：

- 实现手机号开发验证码登录。
- 使用 HttpOnly Cookie Session 替换 Firebase Auth。
- 新增登录用户数据 API：`/api/me`、`/api/resumes`、`/api/assessments`、`/api/positions`、`/api/favorites`。
- 新增游客 localStorage 数据迁移 API：`/api/me/import-local-data`。
- 登录用户的 `/api/match-position` 改为服务端读取最新简历/测评，并使用 `MatchResult` 缓存。
- 游客模式继续可用 localStorage；游客匹配继续支持旧 body，不写匹配缓存。
- 前端登录用户路径不再 import Firebase Auth/Firestore。
- 移除 `firebase` npm dependency。
- 更新 README 与 `.env.example`。
- 新增 auth/API 测试。

## 3. 非目标

本阶段不做：

- 不接入真实短信服务。
- 不做阿里云/腾讯云短信配置。
- 不做生产级风控、图形验证码、设备指纹或黑名单。
- 不做多设备 session 管理 UI。
- 不做找回账号、注销账号或账号合并流程。
- 不迁移历史 Firebase 数据。
- 不重做整体 UI/UX。
- 不实现真实 PDF 报告导出。

## 4. 关键产品决策

- 手机号开发验证码认证使用可替换 `SmsSender` 接口。
- 第一版 `SmsSender` 为开发实现，不发送真实短信。
- 测试手机号示例统一使用 `13388888888`。
- 示例手机号仅用于文档和测试；真实用户以输入手机号为准。
- 首次手机号登录只创建 `User.phone`；`name`、`school`、`major`、`graduationYear` 不写死默认值，后续由用户在个人中心补充。
- Session 使用 HttpOnly Cookie，有效期 7 天。
- 保留游客模式。游客继续使用 localStorage，不要求登录。
- 登录后如果检测到游客 localStorage 数据，提示用户是否同步到当前手机号账号。
- API 替换范围为完整替换 Firebase Auth + Firestore 登录用户路径。
- 登录用户匹配岗位时，后端从 PostgreSQL 读取最新简历/测评并使用匹配缓存。

## 5. 后端认证与 Session 设计

### 5.1 模块结构

新增：

```text
src/server/auth/hash.ts
src/server/auth/smsSender.ts
src/server/auth/authService.ts
src/server/http/cookies.ts
src/server/http/errors.ts
src/server/http/authMiddleware.ts
```

职责：

- `hash.ts`：验证码 hash、session token hash、稳定 token 生成。
- `smsSender.ts`：定义 `SmsSender` 接口和开发 sender。
- `authService.ts`：验证码请求、验证码校验、session 创建、session 校验、登出。
- `cookies.ts`：读写 HttpOnly session cookie。
- `errors.ts`：统一 HTTP error body。
- `authMiddleware.ts`：`requireAuth()` 和 `getOptionalAuth()`。

### 5.2 SmsSender

接口：

```ts
export interface SmsSender {
  sendSmsCode(input: {
    phone: string;
    code: string;
    purpose: 'login';
  }): Promise<{ devCode?: string }>;
}
```

开发 sender：

- `SMS_PROVIDER="dev"` 时启用。
- 不接真实短信服务。
- 返回 `devCode`，便于前端开发提示。
- 可通过 `DEV_SMS_CODE="123456"` 固定验证码；未配置时生成随机 6 位码并返回。
- `NODE_ENV=production` 且没有真实短信 sender 时，返回 `AUTH_CONFIGURATION_ERROR`，避免假装发送短信。

### 5.3 Auth Service

`requestLoginCode(phone)`：

- 校验中国大陆手机号格式：`/^1\d{10}$/`。
- `purpose` 第一版只支持 `login`。
- 对同手机号 + purpose 执行 60 秒发送间隔。
- 生成 6 位验证码。
- 只保存 `SmsCode.codeHash`，不保存明文验证码。
- 验证码 5 分钟有效。
- 调用 `SmsSender.sendSmsCode()`。
- 开发模式返回 `{ devCode, expiresInSeconds: 300 }`。

`verifyLoginCode(phone, code)`：

- 查询该手机号最新未消费验证码。
- 验证过期时间。
- 最多允许 5 次尝试。
- 错误验证码增加 attempts。
- 正确验证码标记 `consumedAt`。
- `upsertUserByPhone({ phone })`。
- 生成 session token 明文。
- 保存 `Session.tokenHash`，有效期 7 天。
- 明文 session token 只返回给路由设置 HttpOnly Cookie，不写 localStorage。

`getSessionUser(sessionToken)`：

- hash token。
- 查询 session。
- 检查是否过期。
- 返回 user。
- 更新 `lastSeenAt`。

`logout(sessionToken)`：

- hash token。
- 删除 session。

### 5.4 Cookie

Cookie 名：

```text
careermatch_session
```

属性：

```text
HttpOnly
SameSite=Lax
Path=/
Max-Age=604800
```

`NODE_ENV=production` 时加：

```text
Secure
```

本地开发不强制 `Secure`。

### 5.5 Auth 错误

统一错误：

```json
{ "code": "UNAUTHORIZED", "error": "请先登录" }
```

```json
{ "code": "INVALID_PHONE", "error": "请输入有效的手机号" }
```

```json
{ "code": "INVALID_SMS_CODE", "error": "验证码错误或已过期" }
```

```json
{ "code": "SMS_CODE_RATE_LIMITED", "error": "验证码发送太频繁，请稍后再试" }
```

```json
{ "code": "AUTH_CONFIGURATION_ERROR", "error": "认证服务未正确配置" }
```

## 6. API 路由设计

为避免 `server.ts` 继续膨胀，新增 route modules：

```text
src/server/routes/authRoutes.ts
src/server/routes/meRoutes.ts
src/server/routes/resumeRoutes.ts
src/server/routes/assessmentRoutes.ts
src/server/routes/positionRoutes.ts
src/server/routes/favoriteRoutes.ts
```

如果测试需要直接构造 Express app，则拆分：

```text
src/server/app.ts
```

`server.ts` 只负责调用 `createApp()` 并监听端口。

### 6.1 Auth API

#### `POST /api/auth/request-code`

请求：

```json
{
  "phone": "13388888888",
  "purpose": "login"
}
```

开发响应：

```json
{
  "ok": true,
  "devCode": "123456",
  "expiresInSeconds": 300
}
```

#### `POST /api/auth/verify-code`

请求：

```json
{
  "phone": "13388888888",
  "code": "123456",
  "purpose": "login"
}
```

行为：

- 校验验证码。
- upsert user。
- 创建 7 天 session。
- 设置 `careermatch_session` HttpOnly Cookie。

响应：

```json
{
  "user": {
    "id": "cm_user_01",
    "phone": "13388888888",
    "name": null,
    "school": null,
    "major": null,
    "graduationYear": null
  }
}
```

#### `POST /api/auth/logout`

行为：

- 删除当前 session。
- 清除 cookie。

响应：

```json
{ "ok": true }
```

### 6.2 User/Profile API

#### `GET /api/me`

- 未登录返回 401。
- 已登录返回当前用户资料。

#### `PATCH /api/me`

请求：

```json
{
  "name": "张三",
  "school": "南京大学",
  "major": "软件工程",
  "graduationYear": "2027"
}
```

返回更新后的 user。

### 6.3 Resume API

#### `GET /api/resumes/latest`

返回：

```json
{ "resume": null }
```

或：

```json
{ "resume": { "name": "张三" } }
```

`resume` shape 对齐前端 `ResumeData`。

#### `POST /api/resumes`

请求：

```json
{
  "resume": { "name": "张三" },
  "rawText": "张三，南京大学软件工程，熟悉 TypeScript 和 PostgreSQL。",
  "sourceFileName": "resume.pdf",
  "sourceFileType": "pdf"
}
```

行为：创建一条当前用户简历。

#### `PUT /api/resumes/latest`

行为：覆盖当前用户最新简历；如果没有简历，则创建一条。

### 6.4 Assessment API

#### `GET /api/assessments/latest`

返回：

```json
{
  "assessment": {
    "personalityResult": {},
    "scores": {}
  }
}
```

无测评时：

```json
{ "assessment": null }
```

#### `POST /api/assessments`

请求：

```json
{
  "personalityResult": {},
  "scores": {}
}
```

行为：保存当前用户测评。

### 6.5 Position API

#### `GET /api/positions`

query：

```text
q
type
industry
category
city
page
pageSize
```

返回：

```json
{
  "positions": [],
  "total": 346,
  "page": 1,
  "pageSize": 50
}
```

#### `GET /api/positions/:id`

返回岗位详情。

### 6.6 Favorite API

#### `GET /api/favorites`

返回：

```json
{ "positionIds": ["pos-0001"] }
```

#### `POST /api/favorites/:positionId`

添加收藏，幂等。

#### `DELETE /api/favorites/:positionId`

取消收藏，幂等。

### 6.7 Local Data Import API

#### `POST /api/me/import-local-data`

请求：

```json
{
  "resume": null,
  "assessment": {
    "personalityResult": {},
    "scores": {}
  },
  "favoritePositionIds": ["pos-0001", "pos-0002"]
}
```

行为：

- 只允许登录用户。
- 有 resume 就创建/覆盖 latest resume。
- 有 assessment 就创建新 assessment。
- favorite ids 逐个幂等添加。
- 不导入 localStorage profile；profile 只通过 `/api/me` 编辑。

响应：

```json
{
  "imported": {
    "resume": true,
    "assessment": true,
    "favorites": 2
  }
}
```

## 7. 数据映射设计

新增 mapper：

```text
src/server/mappers/resumeMapper.ts
src/server/mappers/assessmentMapper.ts
src/server/mappers/positionMapper.ts
```

### 7.1 Resume Mapper

接口：

```ts
toResumeData(record): ResumeData
toResumeCreateInput(resumeData, metadata): CreateResumeInput
```

职责：

- Prisma JSON 字段转回数组/object。
- `rawText`、`sourceFileName`、`sourceFileType` 仅服务端保存，不返回给前端默认视图，除非 API 明确需要。

### 7.2 Assessment Mapper

接口：

```ts
toPersonalityResult(record): PersonalityResult
toAssessmentCreateInput(personalityResult, scores): CreateAssessmentInput
```

职责：

- Prisma 展开字段和前端 `PersonalityResult` 之间转换。
- `scores` 写入 `answers` 字段；如果 scores 为空，则存 `{}` 或 `[]`，实现时统一一个格式。

### 7.3 Position Mapper

接口：

```ts
toPosition(record): Position
```

职责：

- `difficultyRating: String?` 转成前端 number。
- JSON 字段转成数组/object。
- 保持前端 `Position` shape 不变。

## 8. 前端迁移设计

### 8.1 API Client

新增：

```text
src/lib/apiClient.ts
```

职责：

- 统一 `fetch()`。
- `credentials: "include"`。
- 解析 JSON。
- 非 2xx 时抛出 `{ status, code, message }`。

暴露：

```ts
api.getMe()
api.requestLoginCode(phone)
api.verifyLoginCode(phone, code)
api.logout()
api.updateMe(profile)
api.getLatestResume()
api.saveResume(resume)
api.getLatestAssessment()
api.saveAssessment(personalityResult, scores)
api.listPositions(filters)
api.getPosition(positionId)
api.getFavorites()
api.addFavorite(positionId)
api.removeFavorite(positionId)
api.importLocalData(payload)
```

### 8.2 AuthContext

改造：

```text
src/context/AuthContext.tsx
```

不再依赖 Firebase `User`。

新 shape：

```ts
type AppUser = {
  id: string;
  phone?: string;
  isGuest: boolean;
};
```

Context 暴露：

```ts
user: AppUser | null
loading: boolean
userProfile: UserProfile | null
isGuest: boolean
requestLoginCode(phone): Promise<{ devCode?: string }>
verifyLoginCode(phone, code): Promise<void>
loginAsGuest(): void
logout(): Promise<void>
updateProfile(data): Promise<void>
refreshMe(): Promise<void>
```

启动时：

1. 调用 `GET /api/me`。
2. 如果 200，设置登录用户。
3. 如果 401，检查 localStorage `guest_uid`。
4. 有 `guest_uid` 则恢复游客。
5. 无 `guest_uid` 则保持未登录。

### 8.3 登录 UI

最小 UI 改造，不做整体重做：

- Navbar 的“快捷登录”打开手机号验证码登录弹窗。
- 登录弹窗字段：手机号、验证码。
- 按钮：获取验证码、登录、暂不登录游客体验。
- 开发模式显示 `devCode`：

```text
开发环境验证码：123456
```

### 8.4 用户数据 Store

替换 `firebaseStore.ts` 为：

```text
src/lib/userDataStore.ts
```

对现有组件暴露相似函数：

```ts
getPositions()
getLatestResume(user)
saveResume(user, data)
getLatestAssessment(user)
saveAssessment(user, result, scores)
getFavorites(user)
toggleFavorite(user, positionId)
```

内部：

- `user?.isGuest === true`：localStorage。
- `user?.isGuest === false`：API。
- 无 user：岗位可读；私有数据返回 null/[]。

### 8.5 本地数据迁移提示

登录成功后检测：

```text
guest_uid
resume_${guestUid}
assessment_${guestUid}
favorites_${guestUid}
```

如果存在且未迁移过，显示提示：

```text
检测到你在游客模式下保存过简历/测评/收藏，是否同步到当前手机号账号？
```

按钮：

- 同步到账号
- 暂不同步

同步成功后记录：

```text
local_imported_${user.id}_${guestUid}=true
```

避免重复提示。

### 8.6 Firebase 删除边界

第四阶段完成后：

- 前端不再 import `firebase/auth` 或 `firebase/firestore`。
- 删除或停止使用：
  - `src/lib/firebase.ts`
  - `src/lib/firebaseStore.ts`
- 移除 `firebase` npm dependency。
- localStorage 只用于游客模式和迁移提示。

## 9. 匹配缓存与游客兼容

### 9.1 `POST /api/match-position`

登录用户请求：

```json
{ "positionId": "pos-0001" }
```

后端行为：

1. 通过 Cookie 获取用户。
2. 读取最新 resume。
3. 读取最新 assessment。
4. 读取 position。
5. 计算 `resumeHash` 和 `assessmentHash`。
6. 查询 `MatchResult` 缓存。
7. 命中则返回 `{ cached: true, ...result }`。
8. 未命中则调用 AI，保存缓存，返回 `{ cached: false, ...result }`。

游客请求继续支持旧 body：

```json
{
  "resumeData": {},
  "personalityResult": {},
  "position": {}
}
```

游客行为：

- 不要求登录。
- 不查 DB。
- 不写 `MatchResult`。
- 直接调用 AI。

### 9.2 Hash

新增：

```text
src/server/matching/hash.ts
```

接口：

```ts
stableJsonHash(value: unknown): string
```

要求：

- 稳定 JSON stringify。
- SHA-256。
- 不把 `rawText` 纳入默认匹配 hash，除非匹配 prompt 明确使用 rawText。

Resume hash 字段：

```text
name
school
major
graduationYear
skills
internships
projects
inferredDirection
targetCities
```

Assessment hash 字段：

```text
typeTitle
description
radarScores
industryFit
hollandCode
hollandTags
deepInterpretation
```

### 9.3 匹配错误

登录用户：

```json
409 { "code": "RESUME_REQUIRED", "error": "请先上传并确认简历" }
```

```json
409 { "code": "ASSESSMENT_REQUIRED", "error": "请先完成职业测评" }
```

```json
404 { "code": "POSITION_NOT_FOUND", "error": "岗位不存在" }
```

游客：

- 缺少 `resumeData/personalityResult/position` 返回 400。
- AI 错误沿用现有 AI error mapping。

## 10. 测试设计

### 10.1 Auth Service 测试

新增：

```text
tests/auth/authService.test.ts
tests/auth/run-tests.ts
```

覆盖：

- 手机号格式校验。
- `requestLoginCode()` 创建 hash，不保存明文验证码。
- 60 秒内重复请求返回 rate limit。
- 验证码 5 分钟后过期。
- 错误验证码增加 attempts。
- attempts 超过 5 次后拒绝。
- 正确验证码 consume code、upsert user、create session。
- `getSessionUser()` 正常返回 user、过期返回未登录、更新 `lastSeenAt`。
- `logout()` 删除 session。

### 10.2 API 集成测试

新增：

```text
tests/api/authRoutes.test.ts
tests/api/dataRoutes.test.ts
tests/api/matchPosition.test.ts
tests/api/run-tests.ts
```

覆盖：

- `POST /api/auth/request-code`。
- `POST /api/auth/verify-code` 设置 cookie。
- `GET /api/me` 使用 cookie 返回用户。
- `PATCH /api/me`。
- `POST /api/resumes` + `GET /api/resumes/latest`。
- `POST /api/assessments` + `GET /api/assessments/latest`。
- `GET /api/positions`。
- favorites add/list/remove。
- `POST /api/me/import-local-data`。
- 登录用户 `POST /api/match-position`：无简历、无测评、首次 AI、二次缓存。
- 游客 `POST /api/match-position`：旧 body 可用，不写缓存。

AI API 测试不调用真实 AI，使用 fixture provider 或测试注入。

### 10.3 前端测试与手动验收

新增轻量测试：

- API client 错误解析。
- AuthContext helper 或 reducer 的纯函数测试。

手动验收：

- 游客进入网站，上传简历、测评、收藏岗位，刷新仍保留。
- 手机号 `13388888888` 获取开发验证码并登录。
- 登录后看到迁移提示。
- 同步本地数据后，刷新页面仍从服务端读到简历/测评/收藏。
- 退出登录后回到未登录/游客状态。
- 再次登录 `13388888888`，服务端数据仍存在。

### 10.4 Scripts

新增：

```json
{
  "test:auth": "tsx tests/auth/run-tests.ts",
  "test:api": "tsx tests/api/run-tests.ts"
}
```

最终验证：

```bash
npm run test:files
npm run test:ai
npm run test:db
npm run test:auth
npm run test:api
npm run typecheck
npm run build
```

如果 `TEST_DATABASE_URL` 未配置：

- `test:db` / `test:auth` / `test:api` 都 skip 并 exit 0。

如果 `TEST_DATABASE_URL` 已配置：

- 三者都必须真实执行并通过。

## 11. 环境变量与文档

`.env.example` 新增：

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

README 新增：

- 手机号开发验证码登录流程。
- `13388888888` 作为文档和测试手机号示例。
- 开发验证码不会发送真实短信。
- 游客数据迁移提示。
- 登录用户数据已迁移到 PostgreSQL。
- Firebase Auth/Firestore 不再用于当前登录用户路径。

## 12. 阶段完成标准

第四阶段完成时必须满足：

- 前端登录用户路径不再 import Firebase Auth/Firestore。
- `firebase` npm dependency 已移除。
- 游客模式仍可用 localStorage。
- 手机号 `13388888888` 可用开发验证码登录。
- 登录成功使用 HttpOnly Cookie Session，不把 token 存 localStorage。
- 用户资料、简历、测评、收藏走 PostgreSQL API。
- 岗位列表走 `/api/positions`。
- 登录用户匹配走服务端最新简历/测评 + `MatchResult` 缓存。
- 游客匹配旧 body 仍可用，不写缓存。
- 登录后检测游客 localStorage 数据并提示迁移。
- 不接真实短信服务。
- 不做 UI 重做，只做登录/迁移所需最小 UI。
- 不做 PDF 报告导出。
- 最终验证命令通过。

## 13. 第五阶段衔接

第五阶段 UI/UX 重做可以基于本阶段继续：

- 重新设计手机号登录弹窗。
- 重新设计游客数据迁移提示。
- 优化岗位列表服务端分页体验。
- 优化个人中心资料完整度展示。
- 报告导出入口可以继续保留占位，真实 PDF 导出留到第六阶段。
