# CareerMatch UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task in the current session. Do not use implementation subagents for this project; previous sessions found subagent model mapping unavailable in this environment. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Handoff note for the next conversation:** This implementation plan is already written and approved as the execution handoff. The next conversation should not redo UI brainstorming, should not rewrite this plan unless it is clearly incomplete, and should not switch back to the Phase 4 phone-auth/API plan. Start by verifying the worktree and then execute this plan with `superpowers:executing-plans`, including task-level verification and review.

**Goal:** Rework CareerMatch Phase 5 UI/UX into a high-fidelity, restrained, trustworthy student job-diagnosis product across the six core flows: landing, resume upload, assessment, match results, position diagnosis detail, and profile/data center.

**Architecture:** Keep the existing React 19 + Tailwind CSS + Vite structure. Add a small set of focused UI primitives and design tokens, then migrate each page to the “求职诊断档案” information architecture without adding backend capabilities. Preserve the Phase 4 phone-auth/API data paths and guest compatibility.

**Tech Stack:** TypeScript, React 19, Tailwind CSS v4, Vite, lucide-react, existing `motion` package where state transitions already exist, Node/tsx test scripts, existing npm/package-lock workflow.

## Global Constraints

- Work in `D:\大学学习资料\宜信科创\CareerMatch\.worktrees\careermatch-ui-redesign` on branch `careermatch-ui-redesign`.
- Confirm the branch is based on latest `origin/main` and contains PR #3 merge commit `238a9d9` before editing.
- Read and follow `PRODUCT.md`, `DESIGN.md`, and `docs/superpowers/specs/2026-08-06-careermatch-ui-redesign-design.md`.
- This is Phase 5 UI/UX redesign only.
- Do not add backend capabilities.
- Do not implement real PDF export.
- Do not add Docker, deployment, real SMS, third-party OCR, payment, admin, or sharing SDK integrations.
- Do not reintroduce Firebase runtime dependencies or `firebaseStore`.
- Do not display fake stats, fake authentication, fake bindings, fake phone numbers, fake schools/majors, fake PDF success, fake WeChat/QQ/long-image sharing, or any unimplemented capability as complete.
- Do not use gradient text, decorative glassmorphism, thick side-stripe card borders, or hero metric templates.
- Use a restrained, paper-like, trustworthy visual style with tinted neutrals and OKLCH-capable tokens.
- Every major empty, loading, error, not-configured, not-logged-in, not-uploaded, and not-assessed state needs actionable copy.
- Minimum verification for every implementation task: `npm run typecheck` and `npm run build` unless the task only writes docs. Run `npm run test:frontend` when changing helper functions or frontend tests.

---

## Required Pre-Flight Before Task 1

- [ ] **Step 1: Verify worktree and branch**

Run:

```bash
git status --short --branch
git merge-base --is-ancestor 238a9d9 HEAD && echo "PR3 merge commit is included"
```

Expected:

```text
## careermatch-ui-redesign...origin/main
PR3 merge commit is included
```

Only uncommitted files expected before implementation are:

```text
PRODUCT.md
DESIGN.md
docs/superpowers/specs/2026-08-06-careermatch-ui-redesign-design.md
docs/superpowers/plans/2026-08-07-careermatch-ui-redesign.md
```

- [ ] **Step 2: Read context**

Read:

```text
PRODUCT.md
DESIGN.md
docs/superpowers/specs/2026-08-06-careermatch-ui-redesign-design.md
```

- [ ] **Step 3: Commit design context and this plan**

If the user approves committing docs before implementation, commit only docs/context:

```bash
git add PRODUCT.md DESIGN.md docs/superpowers/specs/2026-08-06-careermatch-ui-redesign-design.md docs/superpowers/plans/2026-08-07-careermatch-ui-redesign.md
git commit -m "docs: plan CareerMatch UI redesign"
```

If the user does not want an initial docs commit, leave them uncommitted and continue only after explicit approval.

---

### Task 1: Design Tokens and UI Primitives

**Files:**
- Modify: `src/index.css`
- Create: `src/components/ui/PageHeader.tsx`
- Create: `src/components/ui/StatusBanner.tsx`
- Create: `src/components/ui/SectionPanel.tsx`
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/DiagnosticBlock.tsx`
- Create: `tests/frontend/uiCopy.test.ts`
- Modify: `tests/frontend/run-tests.ts`

**Interfaces:**
- Produces `PageHeader(props: { eyebrow?: string; title: string; description?: string; primaryAction?: React.ReactNode; secondaryAction?: React.ReactNode; meta?: React.ReactNode }): JSX.Element`.
- Produces `StatusBanner(props: { tone: 'info' | 'success' | 'warning' | 'error' | 'pending'; title: string; description: string; action?: React.ReactNode }): JSX.Element`.
- Produces `SectionPanel(props: { title?: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }): JSX.Element`.
- Produces `EmptyState(props: { title: string; description: string; action?: React.ReactNode }): JSX.Element`.
- Produces `DiagnosticBlock(props: { label: string; title: string; tone?: 'neutral' | 'success' | 'warning' | 'error'; children: React.ReactNode }): JSX.Element`.
- Produces test-visible copy helper in `tests/frontend/uiCopy.test.ts` to guard that unsupported PDF/share success copy is not used in UI helper constants added in later tasks.

- [ ] **Step 1: Write a frontend copy guard test**

Create `tests/frontend/uiCopy.test.ts`:

```ts
import assert from 'node:assert/strict';

const forbiddenCopy = [
  '已有 2,348 位高校同学',
  '报告生成成功',
  '专属 PDF 已为您自动推至浏览器下载通道中',
  '已为您调起系统',
  '已认证学信网',
  '微信已绑定',
  '邮箱已绑定',
];

function testForbiddenCopyListDocumentsPhase5Boundaries() {
  assert.equal(forbiddenCopy.includes('报告生成成功'), true);
  assert.equal(forbiddenCopy.includes('已认证学信网'), true);
}

const tests = [testForbiddenCopyListDocumentsPhase5Boundaries];
for (const test of tests) test();
console.log(`uiCopy.test.ts: ${tests.length} tests passed`);
```

This is a seed guard for later tasks; later tasks will import shared copy constants if introduced. It also documents exact forbidden text for reviewers.

- [ ] **Step 2: Register the frontend copy test**

Modify `tests/frontend/run-tests.ts`:

```ts
import { existsSync } from 'node:fs';

const tests = ['./apiClient.test.ts', './userDataStore.test.ts', './uiCopy.test.ts'];
let imported = 0;

for (const test of tests) {
  if (existsSync(new URL(test, import.meta.url))) {
    await import(test);
    imported += 1;
  }
}

if (imported === 0) {
  console.log('test:frontend skipped: frontend helper tests are not implemented yet');
}
```

- [ ] **Step 3: Run frontend tests**

Run:

```bash
npm run test:frontend
```

Expected: existing frontend tests and `uiCopy.test.ts` pass.

- [ ] **Step 4: Add design tokens**

Modify `src/index.css` `@theme` and `body` values to use restrained CareerMatch tokens. Keep existing font imports unless build reveals a problem.

Replace the current theme block with:

```css
@theme {
  --font-sans: "Inter", "PingFang SC", "Noto Sans SC", system-ui, -apple-system, sans-serif;
  --font-display: "Inter", "PingFang SC", "Noto Sans SC", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --color-career-bg: oklch(0.975 0.006 245);
  --color-career-surface: oklch(0.992 0.004 245);
  --color-career-surface-muted: oklch(0.955 0.008 245);
  --color-career-ink: oklch(0.22 0.018 250);
  --color-career-muted: oklch(0.48 0.018 250);
  --color-career-line: oklch(0.88 0.01 250);
  --color-career-primary: oklch(0.48 0.09 225);
  --color-career-primary-soft: oklch(0.93 0.025 225);
  --color-career-success: oklch(0.55 0.075 155);
  --color-career-success-soft: oklch(0.94 0.025 155);
  --color-career-warning: oklch(0.62 0.09 75);
  --color-career-warning-soft: oklch(0.95 0.035 75);
  --color-career-danger: oklch(0.55 0.09 25);
  --color-career-danger-soft: oklch(0.95 0.03 25);

  --color-primary-500: oklch(0.48 0.09 225);
  --color-primary-100: oklch(0.93 0.025 225);
  --color-primary-700: oklch(0.38 0.09 225);
  --color-bg-main: oklch(0.975 0.006 245);
  --color-surface: oklch(0.992 0.004 245);
  --color-surface-alt: oklch(0.955 0.008 245);
}
```

Replace `body` colors with:

```css
body {
  background-color: oklch(0.975 0.006 245);
  color: oklch(0.22 0.018 250);
  font-family: var(--font-sans);
  overflow-x: hidden;
}
```

Replace scrollbar colors with tinted neutrals:

```css
::-webkit-scrollbar-thumb {
  background: oklch(0.82 0.012 250);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: oklch(0.7 0.016 250);
}
```

- [ ] **Step 5: Create `PageHeader`**

Create `src/components/ui/PageHeader.tsx`:

```tsx
import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  meta?: React.ReactNode;
}

export default function PageHeader({ eyebrow, title, description, primaryAction, secondaryAction, meta }: PageHeaderProps) {
  return (
    <header className="mb-8 border-b border-career-line/80 pb-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow && <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-career-primary uppercase">{eyebrow}</p>}
          <h1 className="text-3xl font-semibold tracking-tight text-career-ink sm:text-4xl">{title}</h1>
          {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-career-muted sm:text-base">{description}</p>}
          {meta && <div className="mt-4">{meta}</div>}
        </div>
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {secondaryAction}
            {primaryAction}
          </div>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Create `StatusBanner`**

Create `src/components/ui/StatusBanner.tsx`:

```tsx
import React from 'react';
import { AlertCircle, CheckCircle2, Clock3, Info, TriangleAlert } from 'lucide-react';

type Tone = 'info' | 'success' | 'warning' | 'error' | 'pending';

interface StatusBannerProps {
  tone: Tone;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const toneClass: Record<Tone, string> = {
  info: 'border-career-line bg-career-surface-muted text-career-ink',
  success: 'border-career-success/25 bg-career-success-soft text-career-ink',
  warning: 'border-career-warning/30 bg-career-warning-soft text-career-ink',
  error: 'border-career-danger/30 bg-career-danger-soft text-career-ink',
  pending: 'border-career-primary/25 bg-career-primary-soft text-career-ink',
};

const icons: Record<Tone, React.ReactNode> = {
  info: <Info className="h-4 w-4" />,
  success: <CheckCircle2 className="h-4 w-4" />,
  warning: <TriangleAlert className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
  pending: <Clock3 className="h-4 w-4" />,
};

export default function StatusBanner({ tone, title, description, action }: StatusBannerProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass[tone]}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 text-career-primary">{icons[tone]}</div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs leading-5 text-career-muted">{description}</p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create `SectionPanel`**

Create `src/components/ui/SectionPanel.tsx`:

```tsx
import React from 'react';

interface SectionPanelProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function SectionPanel({ title, description, actions, children, className = '' }: SectionPanelProps) {
  return (
    <section className={`rounded-3xl border border-career-line bg-career-surface p-5 shadow-xs sm:p-6 ${className}`}>
      {(title || description || actions) && (
        <div className="mb-5 flex flex-col gap-3 border-b border-career-line/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && <h2 className="text-base font-semibold text-career-ink">{title}</h2>}
            {description && <p className="mt-1 text-xs leading-5 text-career-muted">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
```

- [ ] **Step 8: Create `EmptyState`**

Create `src/components/ui/EmptyState.tsx`:

```tsx
import React from 'react';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-career-line bg-career-surface-muted px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-career-surface text-career-primary">
        <FileQuestion className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-career-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-career-muted">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 9: Create `DiagnosticBlock`**

Create `src/components/ui/DiagnosticBlock.tsx`:

```tsx
import React from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'error';

interface DiagnosticBlockProps {
  label: string;
  title: string;
  tone?: Tone;
  children: React.ReactNode;
}

const toneClass: Record<Tone, string> = {
  neutral: 'bg-career-surface-muted text-career-ink border-career-line',
  success: 'bg-career-success-soft text-career-ink border-career-success/25',
  warning: 'bg-career-warning-soft text-career-ink border-career-warning/30',
  error: 'bg-career-danger-soft text-career-ink border-career-danger/30',
};

export default function DiagnosticBlock({ label, title, tone = 'neutral', children }: DiagnosticBlockProps) {
  return (
    <section className={`rounded-2xl border p-4 ${toneClass[tone]}`}>
      <p className="text-[11px] font-semibold tracking-[0.16em] text-career-muted uppercase">{label}</p>
      <h3 className="mt-1 text-sm font-semibold text-career-ink">{title}</h3>
      <div className="mt-3 text-sm leading-6 text-career-muted">{children}</div>
    </section>
  );
}
```

- [ ] **Step 10: Verify Task 1**

Run:

```bash
npm run test:frontend
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 11: Commit Task 1**

```bash
git add src/index.css src/components/ui tests/frontend/run-tests.ts tests/frontend/uiCopy.test.ts
git commit -m "feat: add CareerMatch UI primitives"
```

---

### Task 2: Landing Page and Global Navigation

**Files:**
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/App.tsx` only if needed for class token alignment

**Interfaces:**
- Consumes UI primitives from Task 1.
- Produces landing page structure: diagnosis-path hero, three-step workflow, credibility boundaries, report preview, and real position counts.
- Produces navigation labels aligned to the six flows: 首页、上传简历、职业测评、岗位库、诊断报告、我的档案.

- [ ] **Step 1: Identify forbidden current landing copy**

Before editing, confirm current file contains the fake stat:

```bash
git grep -n "已有 2,348 位高校同学" -- src/components/LandingPage.tsx
```

Expected: one match before implementation.

- [ ] **Step 2: Replace landing hero structure**

Modify `LandingPage.tsx` so the hero uses this hierarchy:

```tsx
<section className="bg-career-bg px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
  <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
    <div>
      <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-career-primary uppercase">Career diagnosis file</p>
      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-career-ink sm:text-5xl lg:text-6xl">
        把简历和测评变成一份岗位诊断报告
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-career-muted sm:text-lg">
        上传简历，完成职业测评，系统会基于岗位要求生成匹配结论、差距清单和补救建议。
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button onClick={() => onNavigate('upload')} className="rounded-2xl bg-career-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700">
          开始诊断
        </button>
        <button onClick={() => onNavigate('browser')} className="rounded-2xl border border-career-line bg-career-surface px-6 py-3 text-sm font-semibold text-career-ink transition-colors hover:bg-career-surface-muted">
          先浏览岗位库
        </button>
      </div>
    </div>
    <div className="rounded-[2rem] border border-career-line bg-career-surface p-6 shadow-xs">
      {/* report preview */}
    </div>
  </div>
</section>
```

Do not use gradient text or the fake user count badge.

- [ ] **Step 3: Add report preview content**

Inside the right hero preview, add a paper-like diagnostic preview with static labels, not fake scores:

```tsx
<div className="space-y-4">
  <div>
    <p className="text-xs font-semibold text-career-muted">岗位诊断报告</p>
    <h2 className="mt-1 text-xl font-semibold text-career-ink">后端开发工程师 · 诊断摘录</h2>
  </div>
  <div className="grid gap-3 text-sm">
    <div className="rounded-2xl bg-career-success-soft p-4">
      <p className="font-semibold text-career-ink">结论：推荐投递</p>
      <p className="mt-1 text-xs leading-5 text-career-muted">项目经历接近岗位要求，但需要补充工程化证据。</p>
    </div>
    <div className="rounded-2xl bg-career-surface-muted p-4">
      <p className="font-semibold text-career-ink">硬条件</p>
      <p className="mt-1 text-xs leading-5 text-career-muted">TypeScript、Node.js、数据库基础较匹配。</p>
    </div>
    <div className="rounded-2xl bg-career-warning-soft p-4">
      <p className="font-semibold text-career-ink">下一步</p>
      <p className="mt-1 text-xs leading-5 text-career-muted">投递前补齐项目复盘、接口设计和缓存问题准备。</p>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Replace feature cards with three-step path**

Use real three-step flow:

```text
01 上传简历
02 完成测评
03 获得诊断
```

Use concise copy from the spec. Avoid identical icon-card grid if possible; a horizontal timeline on desktop and vertical list on mobile is preferred.

- [ ] **Step 5: Add credibility boundaries section**

Add a section with three compact rows:

```text
真实 AI 才出结果：未配置 AI Key 时提示配置缺失，不使用假结果。
隐私边界清楚：游客数据保存在本机，登录后保存到账号。
低成本本地优先：本地 OCR、开发验证码、本机数据库，后续可迁移上线。
```

- [ ] **Step 6: Use real position counts**

Keep `soeCount` and `internetCount` derived from `positions`, but remove fallback fake counts `35` and `311`. Use:

```ts
const soeCount = soePositions.length;
const internetCount = internetPositions.length;
```

When counts are zero, display “岗位库加载中或暂无数据”, not fake numbers.

- [ ] **Step 7: Update nav labels**

Modify `Navbar.tsx` nav items to:

```ts
const navItems = [
  { label: '首页', view: 'landing' },
  { label: '上传简历', view: 'upload' },
  { label: '职业测评', view: 'assessment' },
  { label: '岗位库', view: 'browser' },
  { label: '诊断报告', view: 'results' },
  { label: '我的档案', view: 'profile' },
];
```

Ensure `isNavActive` still treats upload/assessment/results/detail correctly.

- [ ] **Step 8: Replace nav visual style**

Use subdued nav styling:

- top nav background `bg-career-surface/95`.
- border `border-career-line`.
- active text `text-career-primary`.
- logo text all solid, no gradient.
- user button says `手机号登录` or `游客模式` where appropriate.

- [ ] **Step 9: Verify forbidden landing copy is gone**

Run:

```bash
git grep -n "已有 2,348 位高校同学\|bg-clip-text\|text-transparent" -- src/components/LandingPage.tsx src/components/Navbar.tsx
```

Expected: no matches.

- [ ] **Step 10: Verify Task 2**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 11: Commit Task 2**

```bash
git add src/components/LandingPage.tsx src/components/Navbar.tsx src/App.tsx
git commit -m "refactor: redesign landing diagnosis entry"
```

---

### Task 3: Resume Upload and Assessment Flow

**Files:**
- Modify: `src/components/ResumeUploadPage.tsx`
- Modify: `src/components/AssessmentPage.tsx`

**Interfaces:**
- Consumes `PageHeader`, `StatusBanner`, `SectionPanel`, `EmptyState`.
- Produces upload page as “材料采集台” with format/size/privacy/status/editable result structure.
- Produces assessment page as “职业判断依据” with production autofill removed from visible UI.

- [ ] **Step 1: Confirm current autofill function exists**

Run:

```bash
git grep -n "autofillAll\|自动填充\|Math.random" -- src/components/AssessmentPage.tsx
```

Expected: current file has `autofillAll` and `Math.random` before implementation.

- [ ] **Step 2: Redesign resume upload header**

In `ResumeUploadPage.tsx`, import UI primitives:

```tsx
import PageHeader from './ui/PageHeader';
import SectionPanel from './ui/SectionPanel';
import StatusBanner from './ui/StatusBanner';
```

At the top of the page render:

```tsx
<PageHeader
  eyebrow="Resume file"
  title="上传简历"
  description="先建立你的求职材料档案。系统会识别教育背景、技能、项目和目标方向。"
/>
```

- [ ] **Step 3: Add upload status strip**

Add a compact status/info grid near the header:

```tsx
<div className="grid gap-3 md:grid-cols-4">
  {['PDF / DOCX / TXT / 图片', '单文件不超过 8MB', '扫描 PDF 默认识别前 3 页', user ? '登录后保存到账号' : '游客数据保存在本机'].map((item) => (
    <div key={item} className="rounded-2xl border border-career-line bg-career-surface px-4 py-3 text-xs font-semibold text-career-muted">
      {item}
    </div>
  ))}
</div>
```

- [ ] **Step 4: Replace upload/paste layout with material intake structure**

Keep existing upload logic (`triggerRealAiParse`, `handleApiParse`, file validation) but present it as:

```text
SectionPanel: 选择材料
  file tab
  text tab
  current file and validation state

SectionPanel: 处理说明
  后端解析
  AI 结构化
  登录保存 / 游客本机
  AI Key 未配置不生成假结果
```

Do not remove existing behavior. Move JSX only as needed.

- [ ] **Step 5: Replace parsing progress with timeline copy**

When `currentState` is uploading/parsing or `isApiParsing`, display a timeline with labels:

```text
文件校验
OCR 识别
AI 解析
结构化结果
```

Use `StatusBanner tone="pending"` with title `正在处理简历` and description `如果是图片或扫描 PDF，识别时间会更长。`.

- [ ] **Step 6: Improve parse errors**

Replace raw error blocks with:

```tsx
{apiParseError && (
  <StatusBanner
    tone="error"
    title="简历解析没有完成"
    description={apiParseError}
  />
)}
```

Ensure AI key missing copy remains exact:

```text
AI 服务未配置：请在 .env 中填写 ZHIPU_API_KEY 或 DEEPSEEK_API_KEY 后重启服务。
```

- [ ] **Step 7: Redesign editable resume result**

Keep existing edit handlers and modal/editing behavior. Present result sections as `SectionPanel` groups:

```text
基本信息
技能
实习
项目
求职方向
目标城市
```

For empty or missing fields, show `未识别，可补充` instead of fallback fake content.

- [ ] **Step 8: Remove visible assessment autofill path**

In `AssessmentPage.tsx`, remove or stop rendering any button that invokes `autofillAll`. Delete `autofillAll` entirely if nothing uses it.

The production UI must not include `Math.random()` in this component after removal.

- [ ] **Step 9: Redesign assessment header and progress**

Import `PageHeader` and `StatusBanner`. Add:

```tsx
<PageHeader
  eyebrow="Assessment"
  title="完成职业测评"
  description="这部分用于判断岗位环境、协作方式和职业兴趣是否匹配。"
/>
```

Stage labels should be:

```ts
const stages = [
  { title: '工作偏好', hint: '了解你更适合稳定流程、探索变化还是目标冲刺。' },
  { title: '协作方式', hint: '判断你在团队沟通、冲突处理和协作节奏中的倾向。' },
  { title: '压力与稳定性', hint: '评估岗位压力、反馈密度和变化节奏是否适合你。' },
  { title: '职业兴趣', hint: '补充你的兴趣驱动，用于推荐更贴近的岗位环境。' },
];
```

- [ ] **Step 10: Add not-logged-in assessment hint**

If `!user`, show:

```tsx
<StatusBanner
  tone="info"
  title="可以先以游客完成测评"
  description="登录手机号后，结果会保存到你的账号；游客模式下结果保存在本机浏览器。"
/>
```

- [ ] **Step 11: Replace assessment finishing loader copy**

Use restrained copy:

```text
测评已完成
正在整理你的职业画像，随后进入诊断结果。
```

Remove emoji from headings if present.

- [ ] **Step 12: Verify forbidden assessment code is gone**

Run:

```bash
git grep -n "autofillAll\|Math.random\|✅" -- src/components/AssessmentPage.tsx
```

Expected: no matches.

- [ ] **Step 13: Verify Task 3**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 14: Commit Task 3**

```bash
git add src/components/ResumeUploadPage.tsx src/components/AssessmentPage.tsx
git commit -m "refactor: redesign resume and assessment flows"
```

---

### Task 4: Match Results and Position Diagnosis Report

**Files:**
- Modify: `src/components/MatchResultsPage.tsx`
- Modify: `src/components/PositionDetailPage.tsx`

**Interfaces:**
- Consumes `PageHeader`, `SectionPanel`, `StatusBanner`, `EmptyState`, `DiagnosticBlock`.
- Produces match results page with profile summary, recommended directions, compact filters, and position summary list.
- Produces position detail page as a “岗位诊断报告” with conclusion, evidence, gaps, remedies, interview prep, and truthful export/share states.

- [ ] **Step 1: Add helper functions for recommendation labels**

In `PositionDetailPage.tsx`, add local helpers above component or inside component before return:

```ts
function diagnosisTone(score: number): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success';
  if (score >= 65) return 'warning';
  return 'error';
}

function diagnosisLabel(score: number) {
  if (score >= 80) return '推荐';
  if (score >= 65) return '谨慎';
  return '不建议';
}

function diagnosisSentence(score: number) {
  if (score >= 80) return '推荐投递，但建议补充项目证明。';
  if (score >= 65) return '可以尝试，但需要先补齐关键差距。';
  return '当前匹配度较低，建议优先考虑更贴近背景的岗位。';
}
```

- [ ] **Step 2: Redesign match results header**

In `MatchResultsPage.tsx`, import UI primitives and replace the blue gradient profile card with:

```tsx
<PageHeader
  eyebrow="Diagnosis results"
  title="岗位匹配结果"
  description="基于你的简历和测评，生成推荐方向和岗位摘要。"
  primaryAction={<button onClick={onRetake} className="rounded-2xl bg-career-primary px-4 py-2 text-sm font-semibold text-white">更新材料</button>}
/>
```

- [ ] **Step 3: Add profile summary section**

Use `SectionPanel title="求职画像摘要"` showing:

```text
推断方向: displayDirection or 未完善
主要技能: resumeData.skills first 4 or 未完善
性格关键词: personalityResult.typeTitle or 未完成测评
目标城市: targetCities or 未完善
资料完整度: 简历 + 测评 status
```

Do not default major to `计算机科学与技术` when missing. Use `未完善`.

- [ ] **Step 4: Add recommendation directions**

Add a section `推荐方向` with 2-3 direction rows derived from available data:

- primary direction: `resumeData?.inferredDirection || '待补充求职方向'`.
- state-owned direction if `personalityResult?.industryFit.stateOwned` exists.
- internet direction if `personalityResult?.industryFit.internet` exists.

Each row includes:

```text
方向名
推荐理由
适合岗位类型
当前短板
```

Use honest fallback `完成简历解析和测评后生成更具体的方向说明。`.

- [ ] **Step 5: Replace tabs copy and fake counts**

Current tabs include hardcoded `已拆解16个` and `已拆解17个`. Replace counts with computed values:

```ts
const stateOwnedCount = positions.filter((p) => p.type === 'state-owned').length;
const internetCount = positions.filter((p) => p.type === 'internet').length;
```

Tab labels:

```text
央国企岗位（{stateOwnedCount}）
互联网岗位（{internetCount}）
```

- [ ] **Step 6: Redesign position list rows**

Keep `filteredPositions` behavior. Replace large cards with compact summary rows showing:

```text
company · title
city · type · salaryRange
summary truncated to 1-2 lines
诊断结论 from overallMatch
主要差距 from requirements first 2 or softSkills first 2
收藏 button
查看诊断 button
```

- [ ] **Step 7: Add empty states for missing resume/assessment/filter results**

If `!resumeData?.name`, display `EmptyState`:

```text
还没有简历档案。上传简历后才能生成岗位匹配。
```

If `!personalityResult`, display `EmptyState`:

```text
还没有职业测评。完成测评后才能判断性格适配。
```

If `filteredPositions.length === 0`, display:

```text
当前筛选条件下没有岗位。尝试放宽城市、类型或难度。
```

- [ ] **Step 8: Redesign position detail as report header**

In `PositionDetailPage.tsx`, replace the current main header block with a report header:

```tsx
<PageHeader
  eyebrow="Position diagnosis"
  title="岗位诊断报告"
  description={`${position.company} · ${position.title} · ${position.city}`}
  primaryAction={<button onClick={() => onOpenModal('share')} className="rounded-2xl border border-career-line bg-career-surface px-4 py-2 text-sm font-semibold text-career-ink">复制分享链接</button>}
  secondaryAction={<button onClick={() => setIsFavorite(!isFavorite)} className="rounded-2xl border border-career-line bg-career-surface px-4 py-2 text-sm font-semibold text-career-ink">{isFavorite ? '已收藏' : '收藏岗位'}</button>}
/>
```

Keep back button above or inside header.

- [ ] **Step 9: Add conclusion block**

After match result loads or with fallback score, show:

```tsx
const score = matchResult?.overallMatch ?? position.overallMatch;
const tone = diagnosisTone(score);
```

Use `DiagnosticBlock`:

```tsx
<DiagnosticBlock label="诊断结论" title={`${diagnosisLabel(score)} · ${score}%`} tone={tone}>
  {diagnosisSentence(score)}
</DiagnosticBlock>
```

- [ ] **Step 10: Replace score breakdown title and side stripe**

Current `h3` uses `border-l-4`. Replace with normal heading and `SectionPanel title="证据摘要"`.

No thick `border-l` or `border-r` accents should remain in `PositionDetailPage.tsx`.

- [ ] **Step 11: Add report sections**

Use `SectionPanel` and `DiagnosticBlock` for:

```text
硬条件匹配
  已满足: position.requirements first items that appear in resume skills if possible
  待证明: remaining requirements first 3

性格适配
  适配点: position.fitPersonality
  风险点: text from personality explanation or fallback

差距清单
  技能差距: first requirements not found in skills
  经历差距: no internship/project fallback
  表达差距: prepare project STAR review
  行业理解差距: prepare company/business notes

补救建议
  7 天可做
  30 天可做
  投递前必须补

面试准备
  position.howToPrepare.timeline
  position.howToPrepare.exam
  position.howToPrepare.interview
```

Use honest fallbacks when data is missing.

- [ ] **Step 12: Replace export copy in position detail**

Do not open the download modal from the position detail primary action as if PDF is available. If keeping button, label it:

```text
PDF 导出第六阶段开放
```

Disable it or use muted styling with no success modal.

- [ ] **Step 13: Verify no fake counts or side-stripe heading remain**

Run:

```bash
git grep -n "已拆解16个\|已拆解17个\|border-l-4\|bg-linear-to-r from-blue-600" -- src/components/MatchResultsPage.tsx src/components/PositionDetailPage.tsx
```

Expected: no matches.

- [ ] **Step 14: Verify Task 4**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 15: Commit Task 4**

```bash
git add src/components/MatchResultsPage.tsx src/components/PositionDetailPage.tsx
git commit -m "refactor: redesign match diagnosis report"
```

---

### Task 5: Profile, Share/Export Boundaries, and Final Polish

**Files:**
- Modify: `src/components/ProfilePage.tsx`
- Modify: `src/components/ShareModal.tsx`
- Modify: `src/components/DownloadModal.tsx`
- Modify: `tests/frontend/uiCopy.test.ts`
- Modify: `PRODUCT.md`, `DESIGN.md`, or spec only if implementation discoveries require clarification

**Interfaces:**
- Consumes UI primitives from Task 1.
- Produces profile as truthful account/data center.
- Produces share modal where only copy-link is real and other channels are clearly unavailable.
- Produces download modal where PDF export is marked Phase 6, no fake generation/success.

- [ ] **Step 1: Strengthen forbidden copy test**

Modify `tests/frontend/uiCopy.test.ts` to scan key source files for forbidden copy:

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '../..');
const files = [
  'src/components/LandingPage.tsx',
  'src/components/ProfilePage.tsx',
  'src/components/ShareModal.tsx',
  'src/components/DownloadModal.tsx',
];

const forbiddenCopy = [
  '已有 2,348 位高校同学',
  '报告生成成功',
  '专属 PDF 已为您自动推至浏览器下载通道中',
  '已为您调起系统',
  '已认证学信网',
  '微信已绑定',
  '邮箱已绑定',
  '清华大学',
];

function testForbiddenCopyRemovedFromRuntimeComponents() {
  for (const file of files) {
    const content = readFileSync(resolve(repoRoot, file), 'utf8');
    for (const copy of forbiddenCopy) {
      assert.equal(content.includes(copy), false, `${file} still contains forbidden copy: ${copy}`);
    }
  }
}

const tests = [testForbiddenCopyRemovedFromRuntimeComponents];
for (const test of tests) test();
console.log(`uiCopy.test.ts: ${tests.length} tests passed`);
```

- [ ] **Step 2: Run frontend tests to verify failure before profile/share/download fixes**

Run:

```bash
npm run test:frontend
```

Expected before implementation: fails if forbidden copy still exists in target components.

- [ ] **Step 3: Redesign profile header and data source logic**

In `ProfilePage.tsx`, import UI primitives. Replace `displayName`, `displaySchool`, `displayMajor`, `displayGraduationYear` fallbacks so missing values show `未完善`, not defaults from `DEFAULT_RESUME_DATA` unless the user has an actual saved resume value.

Use:

```ts
const hasResume = Boolean(resumeData?.name || resumeData?.school || resumeData?.major);
const displayName = userProfile?.name || resumeData?.name || '未完善';
const displaySchool = userProfile?.school || resumeData?.school || '未完善';
const displayMajor = userProfile?.major || resumeData?.major || '未完善';
const displayGraduationYear = userProfile?.graduationYear || resumeData?.graduationYear || '未完善';
```

Avoid importing `DEFAULT_RESUME_DATA` for display fallback if possible.

- [ ] **Step 4: Replace profile structure**

Use sections:

```text
我的资料
我的简历
我的测评
我的收藏
数据与隐私
账号安全
```

The left menu labels should be exactly:

```ts
const sideMenu = [
  { id: 'profile', label: '我的资料', icon: User },
  { id: 'resume', label: '我的简历', icon: FileText },
  { id: 'assessment', label: '我的测评', icon: BrainCircuit },
  { id: 'favorites', label: '我的收藏', icon: Heart },
  { id: 'privacy', label: '数据与隐私', icon: ShieldAlert },
  { id: 'security', label: '账号安全', icon: Settings },
];
```

Add `Heart` import.

- [ ] **Step 5: Add truthful account summary**

Profile header should show:

```text
手机号登录 / 游客模式
手机号：user.phone masked or 游客模式未绑定手机号
资料完整度
最近更新：如果无真实 timestamp，显示“随资料更新”或 omit
```

Mask phone:

```ts
function maskPhone(phone: string | null | undefined) {
  if (!phone) return '游客模式未绑定手机号';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
```

- [ ] **Step 6: Remove fake PDF report button from sidebar**

Replace `📊 下载完整PDF报告` button with disabled/muted copy:

```text
PDF 导出第六阶段开放
```

It must not call `onOpenModal('download')` as a fake success path.

- [ ] **Step 7: Add data and privacy section**

Create content:

```text
游客数据保存在本机浏览器。
登录后，简历、测评和收藏保存到账号。
AI 处理只在你发起解析或诊断时发生。
清除本机缓存功能后续开放。
```

If no cache clear function exists, say `后续开放`; do not implement deletion in this phase unless it is already available.

- [ ] **Step 8: Add account security section**

Content:

```text
当前登录方式：手机号验证码。
Session 默认有效期 7 天。
退出登录会清除当前会话 Cookie。
账号注销功能后续开放。本阶段不会执行数据删除。
```

- [ ] **Step 9: Replace ShareModal fake channels**

In `ShareModal.tsx`, remove `handleShareSimulate`. Keep real copy link. For WeChat, QQ, long image buttons:

- disable or render as muted buttons.
- copy should be:

```text
微信分享暂未接入
QQ 分享暂未接入
长图生成后续开放
```

Do not call `alert`.

- [ ] **Step 10: Replace DownloadModal fake PDF generation**

In `DownloadModal.tsx`, remove `downloadState`, `setTimeout`, generating and success states.

Render a simple unavailable state:

```tsx
<div>
  <div className="flex items-center gap-2 mb-4">
    <div className="rounded-2xl bg-career-warning-soft p-2 text-career-warning">
      <FileDown className="w-5 h-5" />
    </div>
    <h3 className="text-lg font-semibold text-career-ink">PDF 报告导出第六阶段开放</h3>
  </div>
  <p className="text-sm leading-6 text-career-muted">
    当前阶段先完成在线诊断报告的可读性和真实状态。PDF 生成会在第六阶段接入真实导出接口后开放。
  </p>
  <div className="mt-6 flex justify-end">
    <button onClick={onClose} className="rounded-2xl bg-career-primary px-4 py-2 text-sm font-semibold text-white">
      我知道了
    </button>
  </div>
</div>
```

- [ ] **Step 11: Run forbidden copy checks**

Run:

```bash
npm run test:frontend
git grep -n "报告生成成功\|专属 PDF 已为您自动推至浏览器下载通道中\|已为您调起系统\|已认证学信网\|微信已绑定\|邮箱已绑定\|已有 2,348 位高校同学" -- src package.json
```

Expected: frontend tests pass and grep returns no matches.

- [ ] **Step 12: Final static verification**

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
- `test:db`, `test:auth`, and `test:api` pass or skip when `TEST_DATABASE_URL` is not configured.
- `test:frontend` passes.
- `typecheck` passes.
- `build` passes.

- [ ] **Step 13: Final no-regression searches**

Run:

```bash
git grep -n "firebase/auth\|firebase/firestore\|firebaseStore" -- src tests package.json || true
git grep -n "bg-clip-text\|text-transparent\|border-l-4\|报告生成成功\|已为您调起系统\|已认证学信网\|微信已绑定\|邮箱已绑定\|已有 2,348 位高校同学" -- src || true
```

Expected: no matches.

- [ ] **Step 14: Commit Task 5**

```bash
git add src/components/ProfilePage.tsx src/components/ShareModal.tsx src/components/DownloadModal.tsx tests/frontend/uiCopy.test.ts PRODUCT.md DESIGN.md docs/superpowers/specs/2026-08-06-careermatch-ui-redesign-design.md docs/superpowers/plans/2026-08-07-careermatch-ui-redesign.md
git commit -m "refactor: harden profile and sharing boundaries"
```

---

## Final Review and Handoff

After all tasks complete:

- [ ] **Step 1: Confirm clean status**

Run:

```bash
git status --short --branch
git log --oneline --decorate --max-count=20
```

Expected: clean working tree on `careermatch-ui-redesign`, with Task 1-5 commits plus optional docs commit.

- [ ] **Step 2: Run final verification if not already run after Task 5**

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

- [ ] **Step 3: Review against acceptance criteria**

Manually verify from source and, if possible, browser:

- Landing page shows the three-step diagnosis path.
- Landing page has no unsupported user count or gradient text.
- Resume upload shows format, size, privacy, AI/OCR status, editable results.
- Assessment page has no visible autofill or random answer generation.
- Match results page shows profile summary, recommendation directions, filters, summary list.
- Position detail page reads as a diagnosis report.
- Profile page shows truthful account/data sections.
- Share modal does not fake WeChat/QQ/long-image support.
- Download modal does not fake PDF generation.

- [ ] **Step 4: Request code review**

Use `superpowers:requesting-code-review` or the available review workflow for the working diff. Fix any confirmed findings, then re-run relevant verification.

- [ ] **Step 5: User review gate**

Report to user:

- Commits created.
- Verification command results.
- Any guarded-live skips.
- Any unresolved risks.
- Screens/pages changed.

Do not push, open PR, or merge until the user explicitly approves.
