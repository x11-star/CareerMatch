# CareerMatch 第五阶段：UI/UX 重做设计

## 0. 给下一个对话的执行提示

你正在接手精准职达 CareerMatch 的阶段 5：UI/UX 重做。本文件已经完成阶段 5 的设计细化，implementation plan 也应已在同一阶段目录下生成。下个对话的职责是读取现有 spec 和 implementation plan，按计划执行、验证和审核；不要重复做 UI 方向 brainstorm，不要重新写同一份设计方案，也不要无故重写 implementation plan。

1. 定位仓库和工作区：项目在 `D:\大学学习资料\宜信科创\CareerMatch`，阶段 5 worktree 已创建在 `D:\大学学习资料\宜信科创\CareerMatch\.worktrees\careermatch-ui-redesign`，分支为 `careermatch-ui-redesign`。
2. 进入或使用该 worktree 前，先确认 `git status --short --branch`，确认分支基于最新 `origin/main`，且包含 PR #3 merge commit `238a9d9`。PR #3 是阶段 4 的实现，已完成手机号认证、Cookie session、PostgreSQL API、Firebase runtime 删除。
3. 先读取本文件、worktree 根目录下的 `PRODUCT.md` 和 `DESIGN.md`，再读取 `docs/superpowers/plans/2026-08-07-careermatch-ui-redesign.md`。
4. 如果 implementation plan 存在且覆盖本 spec 的 5 个任务，就直接使用 `superpowers:executing-plans` 按计划执行。不要重复写计划。
5. 如果 implementation plan 缺失或明显不完整，先向用户说明缺口并请求确认后再补计划。
6. 执行时不要使用实现子代理，因为此前环境里子代理模型映射不可用且会失败。
7. 实现时遵守 TDD/验证原则。每个任务应有清楚的验证命令，至少运行 `npm run typecheck` 和 `npm run build`。涉及可测试纯函数或状态文案时，优先补轻量测试。
8. 阶段完成后先由 Claude 做代码/任务审核，再交给用户审核。双方通过后再 PR/merge。
9. 本阶段是 UI/UX 重做，不新增后端能力，不实现真实 PDF 导出，不接入真实短信、第三方 OCR、Docker 或部署能力。

## 1. 背景

阶段 4 已通过 PR #3 合入 `main`，完成手机号开发验证码登录、HttpOnly Cookie session、PostgreSQL API、登录用户数据迁移、MatchResult 缓存和 Firebase runtime 删除。阶段 5 基于最新 `origin/main` 的 `careermatch-ui-redesign` 分支继续。

当前产品已具备真实数据和认证路径，但界面仍保留较强的演示项目和蓝白 AI SaaS 模板特征：渐变 hero、装饰性卡片、无真实统计支撑的宣传数据、部分流程文案偏营销、状态和边界说明不够统一。阶段 5 的目标是把精准职达重做为可信、克制、专业的大学生求职诊断工具。

## 2. 目标

阶段 5 不新增后端能力，不实现真实 PDF 导出，不引入大型 UI 框架。目标是重做 6 个核心前端流程的信息架构、视觉语言、交互状态和真实边界文案：

1. 首页。
2. 简历上传页。
3. 测评页。
4. 匹配结果页。
5. 岗位详情页。
6. 个人中心。

最终界面应围绕这条诊断链路展开：

```text
上传简历 → 完成测评 → 获得岗位诊断报告 → 根据差距补救
```

## 3. 设计方向

采用“求职诊断档案”方向。

精准职达应像一份不断生成的求职诊断档案，而不是营销型 AI 推荐网站。核心隐喻是：

```text
材料采集 → 能力画像 → 岗位诊断 → 行动建议 → 数据归档
```

设计语气应像认真负责的职业规划顾问，清楚说明判断依据、能力边界和下一步行动。它可以温和，但不能夸张；可以鼓励，但不能假装已实现未落地能力。

## 4. 设计原则

1. **可信优先**：不展示无真实来源的数据宣称，不使用假成功、假认证、假绑定或假下载。
2. **诊断优先**：岗位推荐要解释证据、差距和补救建议，分数不是主角。
3. **状态清楚**：未登录、未上传、未测评、AI Key 未配置、OCR 中、解析失败、保存失败等状态必须有可操作文案。
4. **隐私清楚**：简历、测评、手机号、session 和 AI 处理边界要在关键流程中说明。
5. **克制专业**：减少渐变、阴影、装饰卡片和模板感，用排版、留白、分隔和状态语言建立质感。
6. **移动可用**：移动端保留完整流程，不为了桌面布局牺牲小屏可继续性。

## 5. 视觉语言

### 5.1 主题场景

主要使用场景是学生在宿舍、图书馆或自习室用笔记本准备简历和校招申请，白天或晚上都可能使用。用户通常带着不确定和轻度焦虑，希望快速知道自己适合哪些方向，以及哪里需要补。默认采用明亮、低眩光、纸面感的浅色界面。

### 5.2 色彩策略

使用 `Restrained` 色彩策略。中性色承担大部分界面，主色只用于主行动、当前选择和关键状态。状态色低饱和，避免高亮刺激。

建议后续实现为 CSS variables 或 Tailwind token：

```text
background: oklch(0.975 0.006 245)
surface: oklch(0.992 0.004 245)
surface-muted: oklch(0.955 0.008 245)
ink: oklch(0.22 0.018 250)
muted: oklch(0.48 0.018 250)
line: oklch(0.88 0.01 250)
primary: oklch(0.48 0.09 225)
primary-soft: oklch(0.93 0.025 225)
success: oklch(0.55 0.075 155)
success-soft: oklch(0.94 0.025 155)
warning: oklch(0.62 0.09 75)
warning-soft: oklch(0.95 0.035 75)
danger: oklch(0.55 0.09 25)
danger-soft: oklch(0.95 0.03 25)
```

不得使用纯黑 `#000` 或纯白 `#fff`。中性色应带轻微色相倾向。

### 5.3 排版

- 正文行长控制在 65 到 75ch。
- 标题通过字号、字重和空间形成层级，不使用渐变文字。
- 产品 UI 可继续使用 Inter / 系统 sans；中文阅读优先。
- 标签、表单、状态文案保持清楚，不使用 display font。

### 5.4 布局

六个流程共享同一信息结构：

```text
PageHeader
  当前页面名称
  当前阶段说明
  主行动

ContextStrip
  用户状态
  资料完整度
  当前流程进度
  风险或限制提示

MainSurface
  当前页面核心任务

SupportRail 或 Inline Support
  隐私说明
  下一步
  未完成项
  错误与空状态
```

移动端收敛为：

```text
Header
Status
Main
Next Action
Secondary Info
```

## 6. 全局禁止项

阶段 5 不得引入或保留这些表现：

- 渐变文字。
- 玻璃拟态默认卡片。
- 无真实来源的“已有 N 位用户”等宣传数字。
- 假微信、假 QQ、假长图、假 PDF 成功提示。
- 假学信网认证、假微信绑定、假邮箱绑定、假手机号。
- 默认“清华大学 · 计算机”等伪资料。
- 装饰性粗侧边框强调。
- 大数字 hero metric 模板。
- 没有下一步的错误或空状态。

## 7. 核心流程设计

### 7.1 首页

#### 目标

让新用户 10 秒内理解：先上传简历，再完成测评，最后得到岗位诊断报告。

#### 结构

```text
顶栏
  精准职达
  上传简历
  测评
  岗位库
  我的档案
  游客或手机号状态

Hero：求职诊断路径
  标题：把简历和测评变成一份岗位诊断报告
  副文案：上传简历，完成职业测评，系统会基于岗位要求生成匹配结论、差距清单和补救建议。
  主行动：开始诊断
  次行动：先浏览岗位库

三步路径
  01 上传简历：识别教育背景、技能、项目和目标城市
  02 完成测评：补充工作偏好、协作方式和职业兴趣
  03 获得诊断：查看推荐方向、岗位匹配、差距和准备建议

可信边界
  真实 AI 才出结果
  隐私说明
  低成本本地优先

诊断报告预览
  结论
  硬条件
  性格适配
  差距清单
  补救建议

岗位范围
  央国企
  互联网
  岗位数量来自真实岗位库
```

#### 必改项

删除无真实统计支撑的文案，例如“已有 2,348 位高校同学通过本平台找到了求职方向”。如果显示岗位数量，必须来自真实岗位数据。

### 7.2 简历上传页

#### 目标

让用户明确知道可以上传什么、系统如何处理、失败后怎么办、解析结果能否修改。

#### 结构

```text
PageHeader
  上传简历
  先建立你的求职材料档案。系统会识别教育背景、技能、项目和目标方向。

Status Strip
  支持 PDF / DOCX / TXT / JPG / PNG / WebP
  单文件不超过 8MB
  扫描 PDF 默认识别前 3 页
  登录用户保存到账号，游客保存在本机

Main：上传与粘贴
  上传文件区域
  粘贴文本入口

Support Rail
  文件先在后端解析
  文本交给 AI 结构化
  登录后保存简历档案
  未配置 AI Key 时不会生成假结果

Processing Timeline
  文件校验
  OCR 识别
  AI 解析
  结构化结果

Editable Resume Result
  基本信息
  技能
  实习
  项目
  推断方向
  目标城市

Bottom Action
  确认简历，进入测评
```

#### 状态文案

文件过大：

```text
文件超过 8MB。请压缩后重新上传，或粘贴简历文本。
```

AI Key 未配置：

```text
AI 服务未配置。请在 .env 中填写 ZHIPU_API_KEY 或 DEEPSEEK_API_KEY 后重启服务。
```

OCR 中：

```text
正在识别图片或扫描 PDF，通常需要几十秒。
```

字段缺失：

```text
部分字段未识别，请补充后继续。
```

### 7.3 测评页

#### 目标

把测评从娱乐化测试改成岗位适配判断依据。

#### 结构

```text
PageHeader
  完成职业测评
  这部分用于判断岗位环境、协作方式和职业兴趣是否匹配。

Progress
  第 1 组 工作偏好
  第 2 组 协作方式
  第 3 组 压力与稳定性
  第 4 组 职业兴趣

Question Panel
  题目
  说明
  选项：非常不同意 / 不同意 / 不确定 / 同意 / 非常同意

Support Rail
  为什么问这些？
  保存方式

Action
  上一题
  下一题
  提交测评
```

#### 必改项

- 生产界面不显示自动填充入口。
- 减少娱乐化和装饰性表达。
- 未登录时提示游客可体验，登录后保存到账号。

#### 状态文案

未登录：

```text
你可以游客完成测评。登录手机号后，结果会保存到账号。
```

保存失败：

```text
测评结果保存失败。你可以重试，或先继续查看本机结果。
```

### 7.4 匹配结果页

#### 目标

让用户先理解自己的求职画像，再查看哪些岗位值得深入诊断。

#### 结构

```text
PageHeader
  岗位匹配结果
  基于你的简历和测评，生成推荐方向和岗位摘要。

Profile Summary
  推断方向
  主要技能
  性格关键词
  目标城市
  资料完整度

Recommendation Directions
  方向名
  推荐理由
  适合岗位类型
  当前短板

Filters
  岗位类型：全部 / 央国企 / 互联网
  城市
  难度
  薪资
  匹配度
  收藏状态
  排序：综合匹配 / 硬条件 / 性格适配 / 最新

Position Summary List
  公司
  岗位
  城市
  类型
  摘要
  匹配结论
  主要差距
  收藏
  查看诊断
```

#### 空状态

没有简历：

```text
还没有简历档案。上传简历后才能生成岗位匹配。
```

没有测评：

```text
还没有职业测评。完成测评后才能判断性格适配。
```

无筛选结果：

```text
当前筛选条件下没有岗位。尝试放宽城市、类型或难度。
```

#### 设计要求

列表使用摘要数据，不加载详情长字段。分数可以存在，但不做最大视觉元素。推荐结论和主要差距比匹配分更重要。

### 7.5 岗位详情页

#### 目标

把岗位详情页改成真正的岗位诊断报告。

#### 结构

```text
Report Header
  岗位诊断报告
  公司 · 岗位 · 城市 · 类型
  结论：推荐 / 谨慎 / 不建议
  一句话判断
  操作：收藏 / 复制分享链接 / 导出报告状态

Evidence Summary
  硬条件匹配
  性格适配
  当前差距
  准备优先级

硬条件匹配
  已满足
  部分满足
  缺失

性格适配
  适配点
  风险点

差距清单
  技能差距
  经历差距
  表达差距
  行业理解差距

补救建议
  7 天可做
  30 天可做
  投递前必须补

面试准备
  可能被问的问题
  项目复盘重点
  笔试或面试准备
```

#### 结论文案

推荐：

```text
推荐投递，但建议补充项目证明。
```

谨慎：

```text
可以尝试，但需要先补齐关键差距。
```

不建议：

```text
当前匹配度较低，建议优先考虑更贴近背景的岗位。
```

#### 导出和分享

复制链接是真功能，可以保留。微信、QQ、长图如果未实现，显示“暂未接入”。PDF 导出属于阶段 6，阶段 5 显示“第六阶段开放”或隐藏入口，不能显示假成功。

### 7.6 个人中心

#### 目标

从假账号页改成真实账户和数据中心。

#### 结构

```text
PageHeader
  我的档案
  管理你的资料、简历、测评、收藏和隐私设置。

Account Summary
  手机号登录 / 游客模式
  手机号：133****8888 或 游客模式未绑定手机号
  资料完整度
  最近更新

我的资料
  姓名
  学校
  专业
  毕业年份
  未填写显示“未完善”
  编辑资料

我的简历
  最近上传时间
  简历摘要
  重新上传
  查看结构化结果

我的测评
  最近完成时间
  测评类型
  重新测评

我的收藏
  收藏岗位数量
  最近收藏
  查看全部

数据与隐私
  游客数据保存在本机
  登录数据保存在账号
  清除本机缓存
  AI 处理说明

账号安全
  手机号登录
  Session 有效期说明
  退出登录
  账号注销功能后续开放
```

#### 必删项

- 已认证学信网。
- 微信已绑定。
- 邮箱已绑定。
- 默认清华大学。
- 默认计算机。
- 假账号注销。

## 8. 全局状态规范

阶段 5 应统一状态组件和文案模式。建议使用一个 `StatusBanner` 体系，语义包括：

```text
info：说明
warning：未配置、未完成
error：失败
success：完成
pending：处理中
```

每个状态必须说明三件事：

```text
发生了什么
为什么影响当前流程
用户下一步能做什么
```

空状态不能只写“暂无数据”。示例：

```text
暂无收藏。你可以在岗位诊断页收藏感兴趣的岗位，之后会在这里集中查看。
```

加载状态优先使用 skeleton。长任务如 OCR 和 AI 解析使用 timeline，不使用整页居中 spinner。

## 9. 组件建议

阶段 5 可以新增少量 UI 层组件，但不做大型 design system。优先提取：

```text
src/components/ui/PageHeader.tsx
src/components/ui/StatusBanner.tsx
src/components/ui/SectionPanel.tsx
src/components/ui/EmptyState.tsx
src/components/ui/DiagnosticBlock.tsx
```

如果实现过程中确实需要，再补充：

```text
src/components/ui/FlowStepper.tsx
src/components/ui/EvidenceList.tsx
src/components/ui/ActionRail.tsx
src/components/ui/LoadingTimeline.tsx
```

所有组件必须有一致的 default、hover、focus、disabled、loading 或 error 语义，具体取决于组件类型。

## 10. 实施拆分建议

后续 implementation plan 建议拆成 5 个任务：

1. 设计 token 和基础 UI primitives。
2. 首页和全局导航。
3. 简历上传和测评流程。
4. 匹配结果和岗位详情报告。
5. 个人中心、分享/导出真实边界和 final polish。

每个任务都应包含类型检查和构建验证。涉及行为状态的页面应优先增加轻量测试或可复用纯函数测试；若没有现成前端测试框架，至少保留 `npm run typecheck` 和 `npm run build` 作为合并前硬门槛。

## 11. 验收标准

阶段 5 完成后必须满足：

- 首页突出“上传简历 → 完成测评 → 获得岗位诊断报告”。
- 首页无未支撑统计数字和渐变文字。
- 简历上传页展示格式、大小、隐私、AI Key、OCR/AI 处理状态和可编辑结果。
- 测评页生产界面不显示自动填充入口。
- 匹配结果页包含求职画像摘要、推荐方向、筛选排序和岗位摘要列表。
- 岗位详情页是岗位诊断报告结构，包含结论、硬条件、性格适配、差距、补救、面试准备。
- 个人中心不显示假认证、假绑定、假学校、假专业或假注销。
- 未登录、未上传、未测评、AI Key 未配置、空收藏、API 失败等状态都有可操作文案。
- 微信、QQ、长图、PDF 导出等未实现能力不显示假成功。
- `npm run typecheck` 通过。
- `npm run build` 通过。

## 12. 非目标

阶段 5 不做：

- 真实 PDF 报告导出。
- Docker Compose 或上线部署。
- 真实短信服务商接入。
- 第三方 OCR 接入。
- 管理员后台。
- 大型 design system 抽象。
- 付费、分享海报、微信/QQ SDK 接入。

这些能力留到阶段 6 或后续独立阶段。

## 13. 下个对话的建议提示词

如果把本文件交给新的 Claude Code 对话，建议直接使用下面这段提示词：

```text
精准职达 / CareerMatch / 阶段 5 UI/UX 重做，继续执行。

请先定位到阶段 5 worktree：D:\大学学习资料\宜信科创\CareerMatch\.worktrees\careermatch-ui-redesign。

implementation plan 已经写好，不要重新做 UI 方向设计，也不要重新写计划。请按以下顺序执行：
1. 读取并遵守记忆中的 CareerMatch 阶段流程：先确认工作区和远端基线。
2. 检查 git status、当前分支、upstream/ahead-behind，确认分支是 careermatch-ui-redesign，基于最新 origin/main，并包含 PR #3 merge commit 238a9d9。
3. 读取 PRODUCT.md、DESIGN.md、docs/superpowers/specs/2026-08-06-careermatch-ui-redesign-design.md，以及 docs/superpowers/plans/2026-08-07-careermatch-ui-redesign.md。
4. 如果 plan 文件存在且覆盖 5 个任务，直接使用 superpowers:executing-plans 按计划执行，不使用实现子代理。
5. 执行时每个任务都要按计划验证，至少运行 npm run typecheck 和 npm run build。不要新增后端能力，不实现 PDF 导出，不接入真实短信或第三方 OCR。
6. 完成后先做 Claude 代码/任务审核，再交给我审核。未经我明确同意，不要 push、开 PR 或 merge。
```

## 14. 下个对话必须避免的错误

- 不要回到阶段 4 的 phone auth/API 计划。阶段 4 已由 PR #3 合入 `main`。
- 不要在旧分支 `careermatch-phone-auth-api-design` 上工作。
- 不要在未确认 worktree 和远端基线前写计划或改代码。
- 不要因为看到 `frontend-design-polish` 就直接改 UI；也不要重复设计。先读取既有 implementation plan，然后按计划执行。
- 不要做全新后端能力、PDF 导出、Docker、真实短信、第三方 OCR。
- 不要把未实现能力包装成已完成能力。
- 不要保留假认证、假绑定、假统计数字、假下载成功。

