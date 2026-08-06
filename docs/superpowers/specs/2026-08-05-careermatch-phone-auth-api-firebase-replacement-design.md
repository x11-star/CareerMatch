# CareerMatch 第四阶段：手机号开发验证码认证 + API 替换 Firebase 设计

## 1. 背景

CareerMatch 前三阶段已经完成：

1. AI Provider 重构：后端 AI Service 使用智谱首发、DeepSeek 兜底；AI Key 缺失时返回真实配置错误。
2. 文件解析与本地 OCR：后端支持 TXT、DOCX、文本 PDF、图片简历和扫描 PDF 的本地解析/OCR。
3. PostgreSQL + Prisma 数据层：已经定义用户、验证码、session、简历、测评、岗位、收藏、匹配缓存等模型，并提供 repository layer 和 guarded-live 数据库测试。

第四阶段目标是把登录用户的数据路径从 Firebase Auth/Firestore 迁移到本项目后端 API + PostgreSQL，同时保留游客模式的 localStorage 体验。

本阶段是后端/API 迁移阶段，不做整体 UI/UX 重做。视觉和体验重做留给第五阶段。

## 2. 第四阶段目标

本阶段做：

- 实现手机号开发验证码登录。
- 登录入口改为“手机号验证码登录 + 游客体验”，不再保留邮箱登录、邮箱注册或 Firebase 匿名登录。
- 使用 HttpOnly Cookie Session 替换 Firebase Auth。
- 新增登录用户数据 API：`/api/me`、`/api/resumes`、`/api/assessments`、`/api/positions`、`/api/favorites`。
- 新增游客 localStorage 数据迁移 API：`/api/me/import-local-data`。
- 登录用户的 `/api/match-position` 改为服务端读取最新简历/测评，并使用 `MatchResult` 缓存。
- 游客模式继续可用 localStorage；游客匹配继续支持旧 body，不写匹配缓存。
- `/api/parse-resume` 继续只负责解析简历，不自动保存简历。
- `/api/position-chat` 继续保持游客兼容，不强制登录，不写 DB。
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
- 不做整体 UI/UX 重做。
- 不实现真实 PDF 报告导出。
- 不做学信网认证、微信绑定或邮箱绑定。
- 不把岗位库全部筛选逻辑一次性迁到服务端；复杂前端筛选可继续在已加载列表上执行。

## 4. 子阶段拆分

第四阶段按四个可独立验证的子阶段开发。

### Phase 4A：后端认证基础

目标：建立 Express app 可测试结构、手机号验证码认证、Cookie session、auth middleware。

交付：

- `src/server/app.ts`：导出 `createApp()`，便于 API 测试直接构造 app。
- `server.ts`：只负责加载 env、调用 `createApp()`、挂载 Vite/static、监听端口。
- `src/server/auth/*`：验证码 hash、session token、SmsSender、AuthService。
- `src/server/http/*`：cookie、HTTP error、auth middleware。
- `src/server/routes/authRoutes.ts`：`request-code`、`verify-code`、`logout`。
- `tests/auth/*` 与 `tests/api/authRoutes.test.ts`。

### Phase 4B：登录用户数据 API

目标：用阶段 3 repository layer 暴露 User/Profile/Resume/Assessment/Position/Favorite API。

交付：

- `src/server/mappers/resumeMapper.ts`
- `src/server/mappers/assessmentMapper.ts`
- `src/server/mappers/positionMapper.ts`
- `src/server/routes/meRoutes.ts`
- `src/server/routes/resumeRoutes.ts`
- `src/server/routes/assessmentRoutes.ts`
- `src/server/routes/positionRoutes.ts`
- `src/server/routes/favoriteRoutes.ts`
- `tests/api/dataRoutes.test.ts`

### Phase 4C：前端 API client 与 Firebase store 迁移

目标：前端通过后端 API + localStorage 游客模式读取数据，不再依赖 Firebase Auth/Firestore。

交付：

- `src/lib/apiClient.ts`：统一 fetch wrapper。
- `src/context/AuthContext.tsx`：替换 Firebase User，改成 `AppUser`。
- `src/lib/userDataStore.ts`：替换 `firebaseStore.ts` 的业务能力。
- `src/components/Navbar.tsx`：最小手机号验证码登录弹窗。
- `src/App.tsx`、`ResumeUploadPage.tsx`、`AssessmentPage.tsx`、`PositionBrowserPage.tsx`、`MatchResultsPage.tsx`、`PositionDetailPage.tsx`、`ProfilePage.tsx`：按新 store 与 user shape 做最小调用迁移。

### Phase 4D：匹配缓存、Firebase 清理与文档验收

目标：登录用户匹配使用服务端最新简历/测评和 `MatchResult` 缓存；游客继续旧 body；最终移除 Firebase dependency。

交付：

- `src/server/matching/hash.ts`
- `/api/match-position` 登录用户缓存路径。
- `src/lib/firebase.ts`、`src/lib/firebaseStore.ts` 删除或停止引用。
- `package.json` / `package-lock.json` 移除 `firebase`。
- README 与 `.env.example` 更新。
- no-Firebase import 验证。

## 5. 关键产品决策

- 手机号开发验证码认证使用可替换 `SmsSender` 接口。
- 第一版 `SmsSender` 为开发实现，不发送真实短信。
- 测试手机号示例统一使用 `13388888888`。
- 示例手机号仅用于文档和测试；真实用户以输入手机号为准。
- 首次手机号登录只创建 `User.phone`；`name`、`school`、`major`、`graduationYear` 不写死默认值，后续由用户在个人中心补充。
- Session 使用 HttpOnly Cookie，有效期 7 天。
- 登录入口只保留“手机号验证码登录”和“游客体验”。
- 游客模式完全基于 localStorage，不再调用 Firebase anonymous auth。
- 登录后如果检测到游客 localStorage 数据，提示用户是否同步到当前手机号账号。
- API 替换范围为完整替换 Firebase Auth + Firestore 登录用户路径。
- 登录用户匹配岗位时，后端从 PostgreSQL 读取最新简历/测评并使用缓存。
- 个人中心不得继续声称“学信网已认证”“微信已绑定”“邮箱已绑定”，除非这些能力已经真实实现。本阶段只显示当前绑定手机号。

## 6. 后端认证与 Session 设计

### 6.1 模块结构

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

### 6.2 SmsSender

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

### 6.3 Auth Service

`requestLoginCode(phone, purpose = 'login')`：

- 校验中国大陆手机号格式：`/^1\d{10}$/`。
- `purpose` 第一版只支持 `login`。
- 对同手机号 + purpose 执行 60 秒发送间隔。
- 生成 6 位验证码。
- 只保存 `SmsCode.codeHash`，不保存明文验证码。
- 验证码 5 分钟有效。
- 调用 `SmsSender.sendSmsCode()`。
- 开发模式返回 `{ devCode, expiresInSeconds: 300 }`。

`verifyLoginCode(phone, code, purpose = 'login')`：

- 查询该手机号最新未消费验证码。
- 验证过期时间。
- 最多允许 5 次尝试。
- 错误验证码增加 attempts。
- 正确验证码标记 `consumedAt`。
- `upsertUserByPhone({ phone })`，不写默认姓名、学校、专业或届数。
- 生成 session token 明文。
- 保存 `Session.tokenHash`，有效期 7 天。
- 明文 session token 只返回给 route 设置 HttpOnly Cookie，不写 localStorage。

`getSessionUser(sessionToken)`：

- hash token。
- 查询 session。
- 检查是否过期。
- 返回 user。
- 更新 `lastSeenAt`。

`logout(sessionToken)`：

- hash token。
- 删除 session；如果 session 已不存在，也返回 `{ ok: true }`。

### 6.4 Cookie

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

### 6.5 Auth 错误

统一错误 body 使用：

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

## 7. API 路由设计

为避免 `server.ts` 继续膨胀，新增 route modules：

```text
src/server/routes/authRoutes.ts
src/server/routes/meRoutes.ts
src/server/routes/resumeRoutes.ts
src/server/routes/assessmentRoutes.ts
src/server/routes/positionRoutes.ts
src/server/routes/favoriteRoutes.ts
```

新增：

```text
src/server/app.ts
```

`server.ts` 只负责调用 `createApp()`、挂载 Vite/static、监听端口。

### 7.1 Auth API

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

### 7.2 User/Profile API

#### `GET /api/me`

- 未登录返回 401。
- 已登录返回当前用户资料。

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

### 7.3 Resume API

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

### 7.4 Assessment API

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

### 7.5 Position API

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

第一版只承诺基础服务端筛选。当前前端的 `subIndustry`、`subCategory`、`salary`、`difficulty` 可继续在已加载列表上本地筛选，避免本阶段扩成岗位搜索系统重构。

#### `GET /api/positions/:id`

返回岗位详情。

### 7.6 Favorite API

#### `GET /api/favorites`

返回：

```json
{ "positionIds": ["pos-0001"] }
```

#### `POST /api/favorites/:positionId`

添加收藏，幂等。

#### `DELETE /api/favorites/:positionId`

取消收藏，幂等。

### 7.7 Local Data Import API

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
- 不删除本地游客数据，由前端写入 imported marker 防重复提示。

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

### 7.8 Parse Resume API 保持解析职责

`POST /api/parse-resume` 继续保持当前职责：

- 接收文本或文件内容。
- 本地解析/OCR。
- 调用 AI parse resume。
- 返回 `ResumeData`。

它不读取 session，不要求登录，也不自动保存简历。前端用户确认后再通过 `POST /api/resumes` 或 `PUT /api/resumes/latest` 保存。

### 7.9 Position Chat API 保持兼容

`POST /api/position-chat` 继续保持当前职责：

- 接收 `position`、`messages`、`resumeData`。
- 调用 AI 生成岗位问答。
- 不要求登录。
- 不写 DB。

## 8. 数据映射设计

新增 mapper：

```text
src/server/mappers/resumeMapper.ts
src/server/mappers/assessmentMapper.ts
src/server/mappers/positionMapper.ts
```

### 8.1 Resume Mapper

接口：

```ts
toResumeData(record): ResumeData
toResumeCreateInput(resumeData, metadata): CreateResumeInput
```

职责：

- Prisma JSON 字段转回数组/object。
- `rawText`、`sourceFileName`、`sourceFileType` 仅服务端保存，不返回给前端默认视图，除非 API 明确需要。
- 对 `ResumeData` 必填字段执行最小校验；缺少 `name/school/major/graduationYear` 时返回 400。

### 8.2 Assessment Mapper

接口：

```ts
toPersonalityResult(record): PersonalityResult
toAssessmentCreateInput(personalityResult, scores): CreateAssessmentInput
```

职责：

- Prisma 展开字段和前端 `PersonalityResult` 之间转换。
- `scores` 写入 `answers` 字段。
- 如果 scores 为空，统一存 `{}`。

### 8.3 Position Mapper

接口：

```ts
toPosition(record): Position
```

职责：

- `difficultyRating: String?` 转成前端 number。
- JSON 字段转成数组/object。
- 保持前端 `Position` shape 不变。

## 9. 前端迁移设计

### 9.1 API Client

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
api.saveResume(resume, metadata?)
api.getLatestAssessment()
api.saveAssessment(personalityResult, scores)
api.listPositions(filters)
api.getPosition(positionId)
api.getFavorites()
api.addFavorite(positionId)
api.removeFavorite(positionId)
api.importLocalData(payload)
api.matchPosition(input)
```

### 9.2 AuthContext

改造：

```text
src/context/AuthContext.tsx
```

不再依赖 Firebase `User`。

新 shape：

```ts
type AppUser = {
  id: string;
  phone: string | null;
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

所有旧的 `user.uid` 调用迁移为 `user.id`。

游客 user：

```ts
{
  id: guestUid,
  phone: null,
  isGuest: true,
}
```

登录 user：

```ts
{
  id: serverUser.id,
  phone: serverUser.phone,
  isGuest: false,
}
```

### 9.3 登录 UI

最小 UI 改造，不做整体重做：

- Navbar 的“快捷登录”打开手机号验证码登录弹窗。
- 登录弹窗字段：手机号、验证码。
- 按钮：获取验证码、登录、暂不登录游客体验。
- 不再出现邮箱登录、邮箱注册、Firebase 匿名登录。
- 开发模式显示 `devCode`：

```text
开发环境验证码：123456
```

### 9.4 用户数据 Store

替换 `firebaseStore.ts` 为：

```text
src/lib/userDataStore.ts
```

对现有组件暴露相似函数：

```ts
getPositions(filters?)
getLatestResume(user)
saveResume(user, data, metadata?)
getLatestAssessment(user)
saveAssessment(user, result, scores)
getFavorites(user)
toggleFavorite(user, positionId)
```

内部：

- `user?.isGuest === true`：localStorage。
- `user?.isGuest === false`：API。
- 无 user：岗位可读；私有数据返回 null/[]。

### 9.5 localStorage key 兼容

保留现有游客 key：

```text
guest_uid
profile_${guestUid}
resume_${guestUid}
assessment_${guestUid}
favorites_${guestUid}
```

登录用户数据不再以 `profile_${serverUserId}`、`resume_${serverUserId}`、`assessment_${serverUserId}`、`favorites_${serverUserId}` 作为主存储。

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

### 9.6 ProfilePage 文案降级

`ProfilePage` 中与真实能力不匹配的文案需要降级：

- 不显示“已认证学信网”。
- 不显示“已微信授权登陆”。
- 不显示虚假邮箱绑定。
- 账号安全设置只展示当前手机号；游客模式展示“游客模式，本地数据仅保存在当前浏览器”。
- 注销账号按钮不做真实账号注销；如保留入口，应标记为“后续开放”并禁用。

这是避免误导用户，不属于第五阶段 UI 重做。

### 9.7 Firebase 删除边界

第四阶段完成后：

- 前端不再 import `firebase/auth` 或 `firebase/firestore`。
- 删除或停止使用：
  - `src/lib/firebase.ts`
  - `src/lib/firebaseStore.ts`
- 移除 `firebase` npm dependency。
- localStorage 只用于游客模式和迁移提示。

## 10. 匹配缓存与游客兼容

### 10.1 `POST /api/match-position`

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

判断逻辑：

- 如果 Cookie session 有效且 body 包含 `positionId`，走登录用户路径。
- 如果没有有效 Cookie 且 body 包含 `resumeData/personalityResult/position`，走游客路径。
- 如果两套输入都不完整，返回 400。

### 10.2 Hash

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

### 10.3 MatchResult provider/model

当前 `defaultAiService.matchPosition()` 返回前端展示字段，不一定返回 provider/model。保存 `MatchResult` 时采用以下规则：

- 如果 AI service 已能返回 provider/model，使用真实值。
- 如果本阶段未扩展 AI service 返回 provider/model，则保存：
  - `provider: "unknown"`
  - `model: "unknown"`

不得为了缓存强行改变前端展示 contract。

### 10.4 匹配错误

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

## 11. 测试设计

### 11.1 Auth Service 测试

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

### 11.2 API 集成测试

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

### 11.3 前端测试与手动验收

新增轻量测试：

- API client 错误解析。
- AuthContext helper 或 reducer 的纯函数测试。
- userDataStore 对 guest/localStorage 和 logged-in/API 分支的最小测试。

手动验收：

- 游客进入网站，上传简历、测评、收藏岗位，刷新仍保留。
- 点击“快捷登录”，出现手机号验证码登录弹窗。
- 手机号 `13388888888` 获取开发验证码并登录。
- 登录后看到迁移提示。
- 同步本地数据后，刷新页面仍从服务端读到简历/测评/收藏。
- 退出登录后不再带服务端 session。
- 再次登录 `13388888888`，服务端数据仍存在。
- 游客继续可用，不要求登录。
- ProfilePage 不再显示虚假的学信网、微信、邮箱绑定成功状态。

### 11.4 Scripts

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

### 11.5 Firebase 移除验证

最终必须执行 no-Firebase import 检查：

```bash
rg "firebase/auth|firebase/firestore|../lib/firebase|./firebase|firebaseStore" src tests
```

期望：没有前端运行时代码引用 Firebase Auth/Firestore 或 `firebaseStore`。

如果保留 Firebase 历史配置文件用于归档，必须在 README 中说明它们不再参与当前运行路径。

## 12. 环境变量与文档

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
- `TEST_DATABASE_URL` 未配置时数据库/API guarded-live 测试会跳过；配置后必须真实通过。

## 13. 阶段完成标准

第四阶段完成时必须满足：

- 前端登录用户路径不再 import Firebase Auth/Firestore。
- `firebase` npm dependency 已移除。
- 游客模式仍可用 localStorage。
- 手机号 `13388888888` 可用开发验证码登录。
- 登录成功使用 HttpOnly Cookie Session，不把 token 存 localStorage。
- 登录入口为手机号验证码登录 + 游客体验，不再使用邮箱登录/注册或 Firebase 匿名登录。
- 用户资料、简历、测评、收藏走 PostgreSQL API。
- 岗位列表走 `/api/positions`。
- `/api/parse-resume` 继续只解析，不自动保存。
- `/api/position-chat` 继续游客兼容，不写 DB。
- 登录用户匹配走服务端最新简历/测评 + `MatchResult` 缓存。
- 游客匹配旧 body 仍可用，不写缓存。
- 登录后检测游客 localStorage 数据并提示迁移。
- ProfilePage 不显示未实现的学信网、微信、邮箱绑定成功状态。
- 不接真实短信服务。
- 不做整体 UI 重做，只做登录/迁移所需最小 UI。
- 不做 PDF 报告导出。
- 最终验证命令通过或按 guarded-live 策略明确 skip。

## 14. 第五阶段衔接

第五阶段 UI/UX 重做可以基于本阶段继续：

- 重新设计手机号登录弹窗。
- 重新设计游客数据迁移提示。
- 优化岗位列表服务端分页体验。
- 优化个人中心资料完整度展示。
- 补充真实账号安全页面。
- 报告导出入口可以继续保留占位，真实 PDF 导出留到第六阶段。
