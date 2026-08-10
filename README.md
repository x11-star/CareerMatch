# 名企校招岗位匹配与职业规划系统 (AI Career Matcher)

本系统是一款专为高校毕业生、求职者设计的 **AI 驱动的名企校招岗位匹配与职业规划系统**。系统通过科学的双轨测评体系、高精度的简历解析引擎以及犀利务实的 AI 岗位诊断，帮助求职者认清自身软硬实力，提供定制化的校招求职路线。

---

## 🌟 核心功能亮点

1. **📊 大五人格 & 霍兰德双轨职业测评**
   - **分阶段沉浸式答题**：将 40 道精选题拆分为日常习惯、情绪抗压、团队协同、深层驱力 4 大真实场景，减少答题疲劳。
   - **多维雷达图与性格解读**：基于大五人格理论计算各维度百分位雷达分，结合霍兰德职业兴趣代码（RIASEC），全方位剖析您的工作风格、核心优势及发展建议。

2. **📄 AI 智能简历深度解析（支持多格式）**
   - **格式支持**：支持 `.pdf`、`.docx`、`.txt`、`.jpg`、`.png`、`.webp`。
   - **上传限制**：单文件最大 8MB；扫描 PDF 第一版默认处理前 3 页。
   - **本地提取与 OCR**：文本 PDF 和 DOCX 会先在后端本地提取文字；图片简历和扫描版 PDF 会使用本地 OCR 识别文字，再交给智谱/DeepSeek 结构化。
   - **真实错误提示**：OCR 和 AI 都失败时，系统会给出真实错误提示，不会生成模拟简历。
   - **运行提示**：本地 OCR 首次运行可能下载或使用语言数据，速度会慢于纯文本提取。

3. **🎯 双擎岗位智能匹配与求职诊断（拒绝水分）**
   - **去通胀化评分**：真实、直白、不客套。针对无相关实习、专业跨度极大（如人文社科竞聘航天飞行器设计）的候选人，系统会硬性扣分，真实揭示初筛淘汰率。
   - **名企岗位库**：内置覆盖“央国企”与“互联网大厂”的多样校招岗位模型，将候选人的简历硬性条件（专业、技术栈、实习）与大五人格软性特质进行交叉分析。
   - **求职导师犀利诊断**：一针见血地指出简历硬伤，并提供极其务实的补救建议或转投策略。

4. **💬 AI 专属岗位顾问实时 Q&A**
   - 针对每一个特定岗位，配备了专属的 AI 校招顾问（大厂/国企 HR 专家口吻）。
   - 候选人可就岗位备考重点、面试真题、薪资福利、晋升通道及日常生态等进行 1 选 1 深度咨询，获取极具干货的备战方案。

---

## 🛠️ 技术栈

- **前端 (Frontend)**: React 19, Vite, TypeScript, Tailwind CSS, Recharts (动态雷达图/柱状图), Framer Motion (页面转场与卡片动效), Lucide Icons (高质感矢量图标).
- **后端 (Backend)**: Node.js, Express (整合 Vite 中间件热重载开发模式), esbuild (高效生产环境服务打包), `mammoth` (Word 解析), `pdf-parse` (PDF 提取), `pdfjs-dist` + `canvas` (扫描 PDF 页面渲染), `tesseract.js` (本地 OCR).
- **AI 服务**: 智谱 AI（主引擎） + DeepSeek（兜底），通过后端 Provider 模块统一调用。
- **云端服务**: 登录用户路径使用本项目后端 API + PostgreSQL，服务端通过 HttpOnly Cookie 维护会话；游客数据继续保存在浏览器 localStorage。

---

## 🚀 脱离 Google AI Studio：本地运行与独立部署指南

如果您希望在本地独立运行此项目，或者将其部署到您自己的服务器/云平台上，可以按照以下步骤操作：

### 1. 导出项目源码
在 Google AI Studio 界面中，点击右上角设置菜单（齿轮图标），选择 **"Export to GitHub"** 或 **"Export as ZIP"**，将项目完整的代码包下载到您的本地。

### 2. 本地环境初始化
确保您的本地电脑已安装 **Node.js**（推荐 v18 或更高版本）。
打开终端（Terminal）进入项目根目录，运行以下命令安装全部依赖：
```bash
npm install
```

### 3. 配置环境变量
在项目根目录下，您会发现一个 `.env.example` 文件。请在本地复制并重命名为 `.env`：
```bash
cp .env.example .env
```
用编辑器打开 `.env` 文件，根据您的需求配置 API Key：
```env
ZHIPU_API_KEY=your_zhipu_api_key_here
ZHIPU_MODEL=glm-4-flash
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-chat
OCR_PROVIDER=local
```

> 💡 **双引擎 AI 调用设计机制（重要）**：
> - **智谱首发**：系统后端在处理“简历解析”“求职岗位匹配”和“岗位顾问问答”时，会首先检查 `.env` 中是否配置了 `ZHIPU_API_KEY`。默认模型为 `glm-4-flash`。
> - **DeepSeek 兜底**：如果智谱接口遇到网络、额度或服务报错，系统会自动降级调用 `DEEPSEEK_API_KEY`，默认模型为 `deepseek-chat`。
> - **不伪造 AI 结果**：如果两个 AI Key 都未配置，简历解析、岗位匹配和岗位问答会返回明确的“AI 服务未配置”提示，不会使用假数据、随机评分或模板话术模拟 AI 结果。

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

### PDF 诊断报告导出（第六阶段）

第六阶段起，岗位诊断报告页支持导出真实 PDF（不再有"假下载成功"提示）。

- **接口**：`POST /api/reports/export`，请求体 `{ "positionId": string }`，返回 `application/pdf` 或 JSON 错误。
- **必须登录**：未登录返回 401（游客没有持久化简历/测评，无法导出）。
- **只读缓存匹配**：导出不会调用 AI，只读取 `findCachedMatchResult` 缓存的匹配结果。如果还没生成匹配结果，返回 409 `MATCH_NOT_CACHED`，提示"请先打开岗位诊断页生成匹配结果"。
- **依赖 Playwright Chromium**：后端用 Playwright 把自包含 HTML 渲染成 PDF。首次导出会自动下载 Chromium；离线/受限网络环境请预先执行 `npx playwright install chromium`，或设置 `PLAYWRIGHT_BROWSERS_PATH` 指向已安装目录。
- **报告范围**：报告数据限本人 `userId`（简历、测评、匹配结果均按用户隔离），内容镜像岗位诊断页（结论 / 证据 / 行动建议），纯数据、不含营销文案。

报告模块测试（无需数据库、不启动真实浏览器，使用可注入的 fake renderer）：

```bash
npm run test:reports
```

### 手机号开发验证码登录

第四阶段后，登录用户路径使用本项目后端 API + PostgreSQL，不再使用 Firebase Auth/Firestore。

本地开发默认使用开发验证码，不会发送真实短信：

```env
SMS_PROVIDER="dev"
DEV_SMS_CODE="123456"
```

示例手机号：`13388888888`。示例手机号只用于文档和测试，真实用户可以输入自己的手机号。

登录成功后，服务端设置 HttpOnly Cookie `careermatch_session`，前端不会把 session token 写入 localStorage。

游客仍可继续体验，游客简历、测评和收藏保存在当前浏览器 localStorage。登录后如果检测到游客数据，页面会提示是否同步到手机号账号。

`TEST_DATABASE_URL` 未配置时，`npm run test:db`、`npm run test:auth`、`npm run test:api` 会跳过 guarded-live 数据库测试并以 0 退出。配置后，这些测试会运行 migration 并真实访问测试数据库。

### 4. 运行与构建命令

- **本地开发模式**：
  ```bash
  npm run dev
  ```
  该命令会同时启动 Vite 前端热更新服务以及 Express 后端 API 服务，默认运行在端口 `3000`（浏览器打开 `http://localhost:3000` 即可）。

- **生产打包构建**：
  ```bash
  npm run build
  ```
  本命令将把前端打包进 `dist/`，同时使用 `esbuild` 将后端 `server.ts` 及其相对依赖打包进 `dist/server.cjs`（单文件 CJS 格式，完美避开了 ES Module 运行时复杂的相对路径路径校验）。

- **生产启动运行**：
  ```bash
  npm run start
  ```
  直接运行打包编译好的生产服务（监听 `3000` 端口）。

---

## 🇨🇳 中国大陆开发者求职落地方案

本项目 AI 调用默认使用国内更友好的服务组合：

### 1. 首选智谱 AI
- **推荐配置**：在 `.env` 中填写 `ZHIPU_API_KEY`，默认模型为 `glm-4-flash`。
- **适用能力**：简历结构化解析、岗位匹配分析、岗位顾问问答。

### 2. DeepSeek 作为兜底
- **兜底配置**：在 `.env` 中填写 `DEEPSEEK_API_KEY`，默认模型为 `deepseek-chat`。
- **触发条件**：智谱接口失败时自动尝试 DeepSeek。

### 3. 未配置 Key 时的行为
如果 `ZHIPU_API_KEY` 和 `DEEPSEEK_API_KEY` 都为空，AI 相关接口会返回配置缺失提示。系统不会用随机分数、默认简历或模板话术冒充 AI 结果。


## 📄 许可证

本项目完全属于开源测试项目。您可以自由地修改、二次开发并在本地或云端进行非商业用途的求职演示。祝各位同学拿到心仪的校招 Offer！
