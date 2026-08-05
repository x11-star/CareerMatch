# 精准职达上线预备版重构设计

## 1. 背景与目标

当前项目是一个 React + Express + Firebase + Gemini/DeepSeek 的 AI 求职匹配应用，已具备首页、简历解析、职业测评、岗位库、岗位详情、匹配报告、收藏和个人中心等核心页面。但现有实现仍有明显的演示项目特征：Firebase 在大陆环境不稳定，Firestore 岗位库写权限过宽，部分账号与下载/分享功能为模拟，AI 调用分散且依赖 Gemini，简历和测评数据落在 localStorage，UI 风格偏模板化。

本次重构目标不是立即付费公网部署，而是把项目改造成“低成本上线预备版”：默认本地运行，不购买云服务器、短信服务或第三方 OCR 服务；但架构、数据边界、安全、隐私、文件解析、认证、AI 调用和 UI 都按真实上线标准设计。后续如果需要真正上线，可以平滑迁移到云服务器、真实短信服务、正式 OCR Provider 和生产数据库。

## 2. 设计原则

1. **真实能力优先**：不使用假数据、随机分或 setTimeout 冒充 AI、PDF、认证等真实功能。
2. **低成本默认**：本地 PostgreSQL、本地 OCR、开发模式验证码，默认不产生云服务器、短信或 OCR 成本。
3. **AI Key 是正式能力前提**：用户会配置智谱和 DeepSeek API Key。未配置时，页面明确提示缺少配置，不返回模拟 AI 结果。
4. **后端掌控边界**：前端不直接访问数据库、AI Provider、短信服务或 OCR Provider；所有敏感能力经 Express API。
5. **隐私优先**：完整简历、测评、手机号、session token 不存 localStorage。简历处理过程和第三方 AI 调用要有明确隐私说明。
6. **上线可迁移**：本地 Docker Compose 优先，但保留云服务器 Docker Compose、真实短信、第三方 OCR、HTTPS 和域名部署路径。

## 3. 目标架构

```text
React/Vite 前端
  ↓ HTTP API
Express 后端
  ├─ Auth Service：手机号开发验证码，预留真实短信
  ├─ AI Service：智谱首发，DeepSeek 兜底
  ├─ File Parse Service：PDF/DOCX/图片/扫描 PDF
  ├─ OCR Service：local 优先，预留第三方 Provider
  ├─ Report Service：真实 PDF 报告导出
  └─ Repository Layer：PostgreSQL + Prisma
       ↓
PostgreSQL
```

默认本地运行：

```text
Docker Compose
  ├─ app: React 静态资源 + Express API
  └─ postgres: PostgreSQL
```

未来真实上线时，同一结构可迁移到云服务器 Docker Compose，并补充 nginx、HTTPS、域名、真实短信和备份策略。

## 4. AI 模块设计

### 4.1 目标

将当前散落在 server.ts 中的 Gemini、DeepSeek 和本地随机规则逻辑收敛为独立后端 AI 模块。删除 Gemini，保留智谱为主、DeepSeek 为兜底。

### 4.2 模块结构

建议新增：

```text
src/server/ai/
  aiService.ts
  zhipuClient.ts
  deepseekClient.ts
  prompts.ts
  schemas.ts
  errors.ts
```

如果当前项目暂时保持较浅目录，也可以放在：

```text
server/ai/
```

但不再把 AI 调用直接写在主路由文件中。

### 4.3 环境变量

```env
ZHIPU_API_KEY=""
ZHIPU_MODEL="glm-4-flash"
DEEPSEEK_API_KEY=""
DEEPSEEK_MODEL="deepseek-chat"
```

删除：

```env
GEMINI_API_KEY
```

并移除 `@google/genai`、Gemini 初始化和 Gemini 测试脚本。

### 4.4 调用顺序

所有 AI 能力统一走：

```text
智谱 glm-4-flash
  ↓ 失败
DeepSeek deepseek-chat
  ↓ 失败
返回明确错误，不伪造 AI 结果
```

适用能力：

- 简历结构化解析
- 岗位匹配分析
- 岗位顾问问答

### 4.5 未配置 API Key 的行为

未配置 `ZHIPU_API_KEY` 和 `DEEPSEEK_API_KEY` 时：

- 简历解析接口返回配置缺失错误。
- 岗位匹配接口返回配置缺失错误。
- 岗位问答接口返回配置缺失错误。
- 前端展示“AI 服务未配置，请在 .env 中填写 ZHIPU_API_KEY 或 DEEPSEEK_API_KEY”。
- 不返回默认简历、不返回随机匹配分、不返回模板话术冒充 AI。

### 4.6 输出校验

AI 返回 JSON 后，后端必须做结构校验。建议用 Zod 或等价 schema：

- `ResumeDataSchema`
- `MatchResultSchema`
- `ChatResponseSchema`

校验失败时，允许尝试一次修复提示；仍失败则返回错误，提示用户重试或检查简历内容。

## 5. 文件解析与 OCR 设计

### 5.1 支持格式

第一版支持：

- PDF，文本版和扫描版
- DOCX
- TXT
- JPG
- PNG
- WebP

### 5.2 文件大小与处理限制

为了避免浏览器卡顿和后端资源耗尽，建议限制：

- 单文件最大 8MB。
- PDF 默认处理前 3 页，后续可在设置中扩展。
- OCR 后文本最长传入 AI 的字符数设上限，例如 20,000 字符。
- 前端上传前检查文件大小和格式，后端再次检查。

### 5.3 解析流程

```text
上传文件
  ↓
后端识别 mimeType 和扩展名
  ↓
DOCX: mammoth 提取文本
PDF: pdf-parse 先提取文本
  ↓ 如果 PDF 文本为空或过短
PDF 页面转图片
  ↓
图片或扫描 PDF 页面进入 OCR
  ↓
OCR 文本交给 AI Service 结构化
```

### 5.4 OCR Provider

环境变量：

```env
OCR_PROVIDER="local"
```

第一版实现：

```text
LocalOcrProvider
```

预留：

```text
TencentOcrProvider
BaiduOcrProvider
AliyunOcrProvider
```

第一版不调用第三方 OCR，因此不产生 OCR 费用。后续如果本地 OCR 中文效果不够，可切换 Provider。

### 5.5 隐私说明

上传页必须明确提示：

- 简历文件会在本地后端提取文字。
- 结构化解析会调用配置的智谱/DeepSeek API。
- 当前本地部署时数据存放在本机 PostgreSQL。
- 用户可删除简历、测评和账号数据。

## 6. 数据库设计

### 6.1 技术选择

使用：

```text
PostgreSQL + Prisma
```

目的：

- 移除 Firebase 和 Firestore。
- 本地运行成本为 0。
- 类型和迁移清晰。
- 未来可迁移到云服务器或云数据库。

### 6.2 表设计

#### users

```text
id
phone
name
school
major
graduation_year
created_at
updated_at
```

`phone` 唯一。

#### sms_codes

```text
id
phone
code_hash
purpose
expires_at
consumed_at
attempts
created_at
```

规则：

- 验证码有效期 5 分钟。
- 最大尝试次数 5 次。
- 同手机号发送间隔 60 秒。
- 开发模式不调用短信服务，但仍记录验证码生命周期。

#### sessions

```text
id
user_id
token_hash
expires_at
created_at
last_seen_at
user_agent
ip_address
```

使用 HttpOnly Cookie，不把 session token 存 localStorage。

#### resumes

```text
id
user_id
name
school
major
graduation_year
skills JSONB
internships JSONB
projects JSONB
inferred_direction
target_cities JSONB
raw_text
source_file_name
source_file_type
created_at
updated_at
```

#### assessments

```text
id
user_id
answers JSONB
type_title
description
radar_scores JSONB
industry_fit JSONB
holland_code
holland_tags JSONB
deep_interpretation JSONB
created_at
```

#### positions

```text
id
title
company
city
type
industry
category
sub_industry
sub_category
salary_range
difficulty_rating
tags JSONB
summary
responsibilities JSONB
requirements JSONB
soft_skills JSONB
salary_detail
career_path JSONB
fit_personality JSONB
how_to_prepare JSONB
related_jobs JSONB
created_at
updated_at
```

#### favorites

```text
id
user_id
position_id
created_at
```

唯一约束：

```text
unique(user_id, position_id)
```

#### match_results

```text
id
user_id
resume_id
assessment_id
position_id
resume_hash
assessment_hash
resume_match
personality_match
overall_match
resume_match_explanation
personality_match_explanation
why_excellent
provider
model
created_at
```

用途：缓存 AI 匹配结果，避免重复调用 API 和重复产生费用。

#### position_chat_messages

可选，第一版可不落库。如果落库：

```text
id
user_id
position_id
sender
message
provider
model
created_at
```

#### report_exports

```text
id
user_id
resume_id
assessment_id
status
created_at
```

第一版可直接生成 PDF 并返回，不一定保存文件。

### 6.3 索引

建议：

```text
users(phone)
sms_codes(phone, created_at)
sessions(token_hash)
resumes(user_id, updated_at)
assessments(user_id, created_at)
positions(type)
positions(industry)
positions(category)
positions(city)
favorites(user_id)
favorites(user_id, position_id)
match_results(user_id, position_id, resume_id, assessment_id)
```

## 7. 认证设计

### 7.1 删除邮箱登录

移除 Firebase 邮箱登录、注册、匿名登录逻辑。第一版不保留邮箱密码账号。

### 7.2 手机号开发验证码

第一版使用开发模式验证码，不调用短信服务商，不产生短信费用。

发送验证码：

```text
POST /api/auth/sms/send
```

请求：

```json
{ "phone": "13388888888" }
```

开发环境响应：

```json
{
  "ok": true,
  "devCode": "123456",
  "message": "开发模式验证码已生成"
}
```

生产环境未来响应：

```json
{
  "ok": true,
  "message": "验证码已发送"
}
```

校验验证码：

```text
POST /api/auth/sms/verify
```

请求：

```json
{ "phone": "13388888888", "code": "123456" }
```

成功后：

- 创建或读取用户。
- 写入 session。
- 设置 HttpOnly Cookie。
- 返回用户摘要。

### 7.3 未来短信 Provider

预留：

```text
SmsProvider
  DevSmsProvider
  TencentSmsProvider
  AliyunSmsProvider
```

环境变量：

```env
SMS_PROVIDER="dev"
```

第一版只实现 `dev`。

## 8. API 设计

### 8.1 Auth

```text
POST /api/auth/sms/send
POST /api/auth/sms/verify
POST /api/auth/logout
GET  /api/me
PUT  /api/me
DELETE /api/me
```

`DELETE /api/me` 删除账号及相关数据，用于真实替代当前假“账号注销”。

### 8.2 Resume

```text
POST /api/resumes/parse
GET  /api/resumes/latest
PUT  /api/resumes/latest
DELETE /api/resumes/latest
```

`POST /api/resumes/parse` 同时完成文件解析、AI 结构化和入库。

### 8.3 Assessment

```text
POST /api/assessments
GET  /api/assessments/latest
DELETE /api/assessments/latest
```

测评计算可以在前端完成，也可以后端复算。正式建议后端复算，避免前端数据被篡改。

### 8.4 Positions

```text
GET /api/positions
GET /api/positions/:id
```

`GET /api/positions` 支持：

```text
q
type
industry
category
city
salaryRange
difficulty
page
pageSize
```

列表接口只返回摘要字段；详情接口返回完整岗位信息。

### 8.5 Favorites

```text
GET    /api/favorites
POST   /api/favorites/:positionId
DELETE /api/favorites/:positionId
```

### 8.6 Match

```text
POST /api/match-position
```

流程：

1. 校验用户已登录。
2. 读取用户最新简历和测评，或使用请求中指定 ID。
3. 根据 `resume_id + assessment_id + position_id + hash` 查缓存。
4. 无缓存则调用 AI Service。
5. 保存 `match_results`。
6. 返回匹配结果。

### 8.7 Chat

```text
POST /api/position-chat
```

未配置 AI Key 时，返回明确错误，不返回模板假回答。

### 8.8 Report

```text
POST /api/reports/export
```

生成真实 PDF。失败时返回明确错误。

## 9. Firebase 移除计划

移除或废弃：

```text
src/lib/firebase.ts
src/lib/firebaseStore.ts
firestore.rules
firebase-applet-config.json
firebase-blueprint.json
firebase dependency
```

前端所有数据读写改为调用 Express API。

岗位 seed 改为开发脚本：

```text
npm run db:seed
```

seed 读取现有岗位数据，写入 PostgreSQL，不暴露给用户界面。

## 10. localStorage 策略

禁止 localStorage 保存：

- 完整简历
- 测评答案和结果
- 手机号
- session token
- API Key

允许保存：

- 非敏感 UI 状态
- 最近打开的 tab
- 是否看过引导提示

用户中心增加“清除本机缓存”能力，清理非敏感 UI 缓存。

## 11. 前端 UI/UX 重做方向

### 11.1 产品定位

精准职达应从“蓝白 AI SaaS 模板”调整为“可信、克制、专业的大学生求职诊断工具”。视觉应服务可信度，而不是堆叠渐变、阴影和卡片。

UI 风格需要大幅重做，但当前不提前锁死具体视觉方向。进入阶段 5 的 UI/UX 重做前，应先调用 `frontend-design-polish` 相关设计能力，让它基于产品定位、现有页面和用户反馈提出多套视觉/交互方向，再由用户确认最终风格后实施。UI 不在阶段 1-4 中零散修补，除非是为解除功能阻塞或删除假功能文案。

### 11.2 首页

首页突出三步：

```text
上传简历 → 完成测评 → 获得岗位诊断报告
```

删除未经真实支撑的数据宣称，例如“已有 2,348 位高校同学”。如果保留数据，必须来自真实统计。

### 11.3 简历上传页

必须包含：

- 支持格式和大小说明。
- AI Key 未配置提示。
- 隐私说明。
- OCR 识别中、AI 解析中、解析失败等状态。
- 解析完成后的可编辑结构化结果。

### 11.4 测评页

- 生产界面不显示自动填充。
- 分阶段进度保留，但减少装饰感。
- 提交后保存到数据库。
- 未登录时引导手机号登录。

### 11.5 匹配结果页

建议结构：

```text
求职画像摘要
推荐方向
岗位筛选与排序
岗位摘要列表
```

列表使用摘要数据，不加载详情长字段。

### 11.6 岗位详情页

改为“岗位诊断报告”结构：

```text
结论：推荐 / 谨慎 / 不建议
硬条件匹配
性格适配
差距清单
补救建议
面试准备
收藏与导出
```

### 11.7 个人中心

删除假认证状态、假手机号、假微信、假邮箱。改为：

```text
我的资料
我的简历
我的测评
我的收藏
数据与隐私
账号安全
```

未填写资料时显示“未完善”，不能默认“清华大学 · 计算机”。

### 11.8 分享功能

复制链接保留为真实功能。微信、QQ、长图如果未实现，应显示“暂未接入”或“后续开放”，不能 alert 假装已调起系统接口。

## 12. 真实 PDF 报告

当前 DownloadModal 的 setTimeout 模拟成功必须删除。

第一版目标：

```text
POST /api/reports/export
  ↓
后端读取用户最新简历、测评、匹配结果
  ↓
生成报告 HTML
  ↓
Playwright/Puppeteer 渲染 PDF
  ↓
返回文件下载
```

如果第一阶段暂不实现 PDF，也必须把按钮文案改为“报告导出暂未开放”，不能显示“PDF 已下载”。

## 13. 错误状态与空状态

必须覆盖：

- 未登录
- 未上传简历
- 未完成测评
- AI Key 未配置
- AI 解析失败
- OCR 识别失败
- 文件过大
- 文件格式不支持
- 数据库连接失败
- 岗位库为空
- 匹配结果生成失败
- PDF 生成失败

这些状态要有可操作文案，例如“检查 .env 中的 ZHIPU_API_KEY”或“请上传清晰的 PDF/图片”。

## 14. 数据隐私与安全

必须新增数据与隐私说明，至少覆盖：

- 简历文件如何被处理。
- 哪些内容会发送给智谱/DeepSeek。
- 数据默认存储在本机 PostgreSQL。
- localStorage 不保存完整简历和测评。
- 用户如何删除自己的数据。
- 如果未来接入第三方 OCR，需要更新隐私说明。

安全边界：

- 前端不持有 AI Key。
- session 使用 HttpOnly Cookie。
- 手机验证码只保存 hash。
- API 需要根据 session 识别用户。
- 用户只能读取和修改自己的简历、测评、收藏和报告。
- 岗位写入只允许开发 seed 脚本或未来管理员能力。

## 15. 性能设计

1. 岗位列表分页，不全量加载完整岗位。
2. 岗位摘要和详情拆分。
3. AI 匹配结果入库缓存，避免重复调用。
4. 前端使用统一 API Client，可引入 React Query 或轻量缓存。
5. 文件上传前做大小和格式检查。
6. OCR 和 PDF 生成属于重任务，必要时可改为异步任务，但第一版可同步实现并限制文件大小。

## 16. 测试与验收

最低验收：

- `npm run typecheck` 通过。
- `npm run build` 通过。
- `npm audit` 检查 high severity vulnerability 并处理或记录原因。
- AI Key 未配置时，简历解析、岗位匹配、岗位问答显示真实配置错误。
- 配置智谱 Key 后，文本简历可解析。
- 配置 DeepSeek Key 且智谱失败时，DeepSeek 可兜底。
- PDF、DOCX、图片至少各一份样例可解析。
- 扫描 PDF 可走 OCR 路径。
- 手机号开发验证码可登录。
- PostgreSQL 中能保存用户、简历、测评、收藏和匹配结果。
- 岗位列表分页和详情正常。
- PDF 下载不再是假成功。
- 个人中心没有假认证、假手机号、假微信、假邮箱。

## 17. package 与文档清理

需要同步：

- README 技术栈改为 React 19、Vite、Express、PostgreSQL、Prisma、智谱、DeepSeek、本地 OCR。
- 删除 Gemini 说明。
- 删除 Firebase 作为核心存储的说明。
- `lint` 脚本如仍为 `tsc --noEmit`，改名为 `typecheck`。
- 如需真正 lint，另行引入 ESLint。
- 处理 `npm install` 发现的 high severity vulnerability。

## 18. 分阶段实施计划

### 阶段 1：AI 模块化与 Gemini 移除

- 新增 AI Service。
- 接入智谱和 DeepSeek。
- 删除 Gemini。
- API Key 未配置时返回真实错误。
- 删除随机评分冒充 AI 的行为。

### 阶段 2：文件解析与 OCR

- 统一上传解析模块。
- PDF/DOCX/TXT 文本提取。
- 图片本地 OCR。
- 扫描 PDF 转图片后 OCR。
- 文件大小和格式限制。

### 阶段 3：PostgreSQL + Prisma

- 新建 Prisma schema。
- 新建 migration。
- 写 seed 脚本导入岗位。
- 新建 Repository Layer。

### 阶段 4：认证与数据 API

- 删除 Firebase Auth。
- 手机号开发验证码。
- HttpOnly session。
- 简历、测评、岗位、收藏、匹配 API。

### 阶段 5：UI/UX 重做

- 首页、上传、测评、匹配列表、岗位详情、个人中心重构。
- 删除假功能和假文案。
- 补齐错误和空状态。

### 阶段 6：报告导出与上线预备

- 真实 PDF 报告。
- Docker Compose。
- README 和环境变量文档。
- npm audit 和构建检查。
- 数据隐私说明。

## 19. 非目标

第一版不做：

- 真实短信服务商发送。
- 公网云服务器部署。
- 付费第三方 OCR。
- 管理员后台。
- 多租户企业版权限。
- 在线支付。

但上述能力应保留扩展边界，不能把代码写死为只能本地演示。

## 20. 决策记录

已确认：

- AI 做后端独立模块。
- `ZHIPU_MODEL=glm-4-flash`。
- 删除 Gemini。
- 智谱首发，DeepSeek 兜底。
- 图片和 PDF 必须支持。
- OCR 两者都预留，第一版先本地 OCR。
- 删除真实邮箱登录。
- 认证采用手机号登录，第一版开发模式验证码。
- UI 需要重做。
- 目标为真实上线预备版，但默认不产生额外云服务成本。
- 用户会填写智谱和 DeepSeek API Key，因此未配置时不使用假数据伪造 AI 结果。
