# CareerMatch PDF Report Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task in the current session (do NOT spawn implementation subagents — model mapping is broken in this environment). Steps use checkbox (`- [ ]`) syntax for tracking. Read-only Explore agents are fine for verification.

**Goal:** Implement the Phase 6 "真实 PDF 报告导出" slice defined in `docs/superpowers/specs/2026-08-05-careermatch-launch-ready-refactor-design.md` §12. Replace the current `DownloadModal` setTimeout fake-success with a real backend `POST /api/reports/export` that reads the user's latest resume, assessment, and cached match result, renders a report HTML, converts it to PDF via Playwright, and returns the file for download.

**Architecture:** A new backend module `src/server/reports/` owns report HTML composition and PDF rendering. HTTP route lives in `src/server/routes/reportRoutes.ts` (or inline in `app.ts` matching existing style). Data access reuses existing repositories (`getLatestResumeByUserId`, `getLatestAssessmentByUserId`, `findCachedMatchResult`, `getPositionById`). The frontend `DownloadModal` becomes a real trigger with loading/success/error states; the `PositionDetailPage` "导出边界" footnote and disabled PDF button are replaced by a working export button.

**Tech Stack:** TypeScript, Express, Playwright (Chromium) for HTML→PDF, Node built-in `assert`, existing `tsx` test runner. No new frontend PDF library.

## Global Constraints

- **Backend-only PDF generation.** The frontend never renders PDF; it only calls the API and downloads the blob.
- **Playwright over Puppeteer.** Both are spec-compliant; Playwright has better CJK font handling and a managed Chromium that avoids native build pain.
- **Honest errors.** Missing AI key, missing resume/assessment, missing cached match result, PDF render failure — all return clear JSON errors with actionable copy. Never fake "PDF 已下载".
- **Auth required.** `/api/reports/export` requires a logged-in session (`requireAuth`). Guests cannot export (no persisted resume/assessment). Report is scoped to the requesting user's own data only.
- **Reuse cached match result.** Do NOT call the AI provider at export time. Read the cached `MatchResult` from `findCachedMatchResult`. If no cache exists, return a 409 telling the user to open the diagnosis page first (which triggers the match).
- **Report content** mirrors `PositionDetailPage`: 诊断结论 (score + label + sentence), 匹配维度 (resumeMatch/personalityMatch/overallMatch), 证据 (met/partial/missing requirements, personality fit/risk, AI whyExcellent), 行动 (gap list + 7d/30d/pre-submit + interview prep). Pure data, no marketing copy.
- **HTML is self-contained.** Inline `<style>` only; no external CSS/fonts (Playwright loads from a blank page, external assets are unreliable). Use system CJK font stack.
- **File size guard.** Cap report HTML input and PDF output at reasonable sizes (HTML ≤ 200KB, PDF response ≤ 5MB). Reject oversized inputs.
- **Synchronous first version.** Per spec §15, PDF generation may be synchronous in v1; no async job queue. Add a 30s server-side timeout on the Playwright render.
- **No new UI redesign.** Only touch `DownloadModal`, its call sites, and the `PositionDetailPage` export footnote. Do not restyle other pages.
- **Tests must not launch a real browser.** HTML composition is a pure function (unit-tested). Playwright render is tested via a thin seam (inject a fake renderer) or skipped with a recorded reason if Playwright isn't available in CI.

---

## File Structure

Create these focused files:

- `src/server/reports/types.ts` — report data shape, render input/output interfaces.
- `src/server/reports/reportData.ts` — assembles `ReportData` from resume + assessment + matchResult + position (pure, testable).
- `src/server/reports/reportHtml.ts` — builds the self-contained HTML string from `ReportData` (pure, testable).
- `src/server/reports/reportErrors.ts` — normalized report errors + `toHttpReportError`.
- `src/server/reports/pdfRenderer.ts` — Playwright wrapper; `renderPdf(html: string): Promise<Buffer>`.
- `src/server/reports/reportService.ts` — single entry point `exportPositionReport(input): Promise<{ buffer, fileName }>` consumed by the route.
- `src/server/routes/reportRoutes.ts` — `POST /api/reports/export` handler (or inline in `app.ts` if matching existing route style).

Create these tests:

- `tests/reports/reportData.test.ts` — no-DB tests with mocked repository returns.
- `tests/reports/reportHtml.test.ts` — no-DB tests: HTML contains expected fields, is self-contained (no external refs), escapes user input.
- `tests/reports/reportService.test.ts` — orchestration with mocked data assembly + a fake `pdfRenderer` (no real browser).
- `tests/reports/run-tests.ts` — report test runner imported by package script.

Modify these existing files:

- `src/server/app.ts` — mount `/api/reports/export`.
- `src/components/DownloadModal.tsx` — replace placeholder with real export flow (loading → download → error), delete any setTimeout fake.
- `src/components/PositionDetailPage.tsx` — replace "导出边界" footnote + disabled PDF button with a working "导出 PDF 报告" button that calls the API.
- `src/lib/apiClient.ts` — add `exportPositionReport(positionId)` returning a Blob.
- `package.json` — add `test:reports` script; add `playwright` dependency.
- `.env.example` — document Playwright browser path opt (`PLAYWRIGHT_BROWSERS_PATH` optional, not required).
- `README.md` — document PDF export requirement (Playwright Chromium) and the export endpoint.

---

### Task 1: Report Data Assembly and Tests

**Files:**
- Create: `src/server/reports/types.ts`
- Create: `src/server/reports/reportData.ts`
- Create: `src/server/reports/reportErrors.ts`
- Create: `tests/reports/reportData.test.ts`
- Create: `tests/reports/run-tests.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `ReportData` (conclusion + dimensions + evidence + actions, mirroring PositionDetailPage)
- Produces: `assembleReportData({ resume, assessment, matchResult, position, userId }): ReportData`
- Produces: `ReportError`, `ResumeMissingError`, `AssessmentMissingError`, `MatchNotCachedError`, `toHttpReportError`

- [ ] **Step 1: Add report test script to `package.json`**

Add `"test:reports": "tsx tests/reports/run-tests.ts"`. Keep existing scripts unchanged.

- [ ] **Step 2: Write failing report-data tests**

`tests/reports/reportData.test.ts` covers:
- assembleReportData maps resume/assessment/matchResult/position into ReportData with the same field names PositionDetailPage uses (score = matchResult.overallMatch, diagnosisLabel/diagnosisSentence from score thresholds, metRequirements/missingRequirements computed from `position.requirements` vs `resume.skills`, evidence fields, gap + action lists).
- Throws `ResumeMissingError` when resume is null.
- Throws `AssessmentMissingError` when assessment is null.
- Throws `MatchNotCachedError` when matchResult is null.

Use fixtures mirroring `tests/ai/aiService.test.ts` shapes (ResumeData, PersonalityResult, MatchResult, Position).

- [ ] **Step 3: Run test, verify it fails** (`npm run test:reports`) — FAIL, `reportData.ts` missing.

- [ ] **Step 4: Implement `types.ts`, `reportErrors.ts`, `reportData.ts`**

`ReportData` shape (fields PositionDetailPage already renders):
```ts
interface ReportData {
  position: { company: string; title: string; city: string; type: string; salaryRange: string; summary: string };
  conclusion: { score: number; label: string; sentence: string; tone: 'success'|'warning'|'error' };
  dimensions: { resumeMatch: number; personalityMatch: number; overallMatch: number };
  evidence: {
    met: string[]; partial: string[]; missing: string[];
    fitPersonality: string[]; risk: string; whyExcellent: string;
  };
  actions: {
    gaps: { label: string; value: string }[];
    timeline: { title: string; items: string[] }[]; // 7d / 30d / pre-submit
    interview: { questions: string[]; exam: string; projectRecap: string };
  };
  generatedAt: string; // ISO
}
```

Reuse `diagnosisTone`/`diagnosisLabel`/`diagnosisSentence` threshold logic from PositionDetailPage (extract or duplicate — duplication is acceptable to avoid coupling report to a React component).

- [ ] **Step 5: Run tests + typecheck** — `npm run test:reports`, `npm run typecheck`. PASS.

- [ ] **Step 6: Commit Task 1** — `feat: assemble PDF report data`.

---

### Task 2: Report HTML Composition and Tests

**Files:**
- Create: `src/server/reports/reportHtml.ts`
- Create: `tests/reports/reportHtml.test.ts`
- Modify: `tests/reports/run-tests.ts`

**Interfaces:**
- Produces: `buildReportHtml(data: ReportData): string`

- [ ] **Step 1: Write failing HTML tests**

`tests/reports/reportHtml.test.ts` covers:
- HTML contains the position company/title, score number, diagnosis label, all dimension numbers, met/missing requirement counts.
- HTML is self-contained: no `src=`, no `href=` starting with `http`, no `@import`, no `<link>`. Assert with regex that the only `<style>` is inline.
- User-controlled strings (company name, skills, whyExcellent) are HTML-escaped (inject `<script>` in a fixture field, assert it does not appear raw).
- HTML has a print-friendly header (姓名/学校/岗位/生成时间) and the three sections (结论/证据/行动).

- [ ] **Step 2: Run, verify FAIL** (`reportHtml.ts` missing).

- [ ] **Step 3: Implement `buildReportHtml`**

Self-contained HTML with inline `<style>`. Layout: A4 portrait, 12mm margins, system CJK font stack (`"Noto Sans SC","PingFang SC",system-ui,sans-serif`), navy headings (`#1E3A5F`), hairline dividers, tabular-nums for scores. Escape all interpolated user strings (small helper). No external assets.

- [ ] **Step 4: Run tests + typecheck** — PASS.

- [ ] **Step 5: Commit Task 2** — `feat: compose report HTML`.

---

### Task 3: PDF Renderer (Playwright) with Injectable Seam

**Files:**
- Create: `src/server/reports/pdfRenderer.ts`
- Modify: `package.json`, `package-lock.json`
- Create: `tests/reports/reportService.test.ts` (uses a fake renderer, NOT real Playwright)

**Interfaces:**
- Produces: `renderPdf(html: string, options?: { timeoutMs?: number }): Promise<Buffer>`
- Produces: `createReportService(deps?: { pdfRenderer?: PdfRenderer; dataAssembler?: typeof assembleReportData }): { exportPositionReport(input): Promise<{ buffer: Buffer; fileName: string }> }`

- [ ] **Step 1: Install Playwright**

`npm install playwright` then `npx playwright install chromium`. If Chromium download fails (offline CI), record the failure; tests must not require the real browser. Do NOT replace with a fake in shipped code — spec §12 forbids fake PDF.

- [ ] **Step 2: Implement `pdfRenderer.ts`**

```ts
import { chromium } from 'playwright';

export async function renderPdf(html: string, options: { timeoutMs?: number } = {}): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: options.timeoutMs ?? 30000 });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
export type PdfRenderer = typeof renderPdf;
```

- [ ] **Step 3: Write reportService tests with a fake renderer**

`tests/reports/reportService.test.ts`:
- `exportPositionReport` calls `assembleReportData` (mocked) then `pdfRenderer` (fake returning a fixed Buffer), returns `{ buffer, fileName }` where fileName = `诊断报告_{company}_{positionId}.pdf` (sanitized).
- Throws `ResumeMissingError` etc. when data assembly throws (propagates).
- Fake renderer is invoked exactly once; HTML built from the assembled data is passed to it.

- [ ] **Step 4: Implement `reportService.ts`** with `createReportService` accepting injectable `pdfRenderer` (defaults to real `renderPdf`).

- [ ] **Step 5: Run report tests + typecheck** — PASS without launching a browser.

- [ ] **Step 6: Commit Task 3** — `feat: render PDF via Playwright`.

---

### Task 4: HTTP Route and Frontend Integration

**Files:**
- Modify: `src/server/app.ts`
- Modify: `src/lib/apiClient.ts`
- Modify: `src/components/DownloadModal.tsx`
- Modify: `src/components/PositionDetailPage.tsx`
- Modify: `src/App.tsx` (if modal props change)

**Interfaces:**
- Produces: `POST /api/reports/export` (auth required, body `{ positionId }`) → `application/pdf` or JSON error.
- Produces: `apiClient.exportPositionReport(positionId): Promise<Blob>`.
- Produces: `DownloadModal` with loading / success-download / error states.

- [ ] **Step 1: Add route in `app.ts`**

```ts
app.post('/api/reports/export', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const positionId = String(req.body?.positionId || '');
    if (!positionId) return res.status(400).json({ error: '缺少岗位 ID', code: 'POSITION_REQUIRED' });
    const result = await defaultReportService.exportPositionReport({ userId: user.id, positionId });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.send(result.buffer);
  } catch (error) {
    const httpError = toHttpReportError(error);
    return res.status(httpError.status).json(httpError.body);
  }
});
```

`toHttpReportError` maps: ResumeMissing→409, AssessmentMissing→409, MatchNotCached→409 (with message "请先打开岗位诊断页生成匹配结果"), ReportError generic→502, unknown→500.

- [ ] **Step 2: Add `apiClient.exportPositionReport`**

```ts
exportPositionReport: (positionId: string) =>
  fetch('/api/reports/export', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ positionId }) })
    .then(async (res) => { if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || `导出失败: HTTP ${res.status}`); return res.blob(); }),
```

- [ ] **Step 3: Rewrite `DownloadModal`**

Props: `{ positionId, onClose }` (add `positionId` from `App.tsx` state — track the position the user is viewing). States: idle / loading / error. On confirm: call `apiClient.exportPositionReport(positionId)`, on Blob success trigger browser download via `URL.createObjectURL`, then `onClose`. On error: show the error message with a retry button. **Delete any `setTimeout` fake-success.**

If `positionId` is absent (user opened download from a non-detail context), show "请先进入岗位诊断报告页再导出" and disable the button.

- [ ] **Step 4: Update `PositionDetailPage` export footnote**

Replace the "导出边界" footnote + disabled button with a working "导出 PDF 报告" button that calls `onOpenModal('download')` (the modal now has the current positionId via `App.tsx`).

- [ ] **Step 5: `App.tsx`** tracks `currentPosition` for the modal (it already tracks `currentPosition` for the detail view — pass `position.id` to `DownloadModal`).

- [ ] **Step 6: Run typecheck + build + test:frontend** — PASS.

- [ ] **Step 7: Smoke test** — start `npm run dev`, log in (dev code `123456`), upload resume + complete assessment, open a position detail (triggers match cache), click "导出 PDF 报告". Expected: a PDF downloads. If AI key missing → match won't cache → export returns 409 with the actionable message.

- [ ] **Step 8: Commit Task 4** — `feat: wire PDF export route and modal`.

---

### Task 5: Documentation, Env, Final Verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-05-careermatch-launch-ready-refactor-design.md` only if implementation decisions diverged from spec.

- [ ] **Step 1: Update `.env.example`** — note that Playwright Chromium is auto-installed on first use; no key required, but document `PLAYWRIGHT_BROWSERS_PATH` for offline/restricted environments.

- [ ] **Step 2: Update README** — document: PDF export requires Playwright Chromium (`npx playwright install chromium`), endpoint `POST /api/reports/export`, that guests cannot export, and that export reads cached match (must open diagnosis page first).

- [ ] **Step 3: Final checks** — `npm run test:reports`, `npm run test:ai`, `npm run test:frontend`, `npm run typecheck`, `npm run build`. All PASS. (DB/auth/api tests need Postgres `TEST_DATABASE_URL`; run if available, else record skip reason.)

- [ ] **Step 4: Runtime smoke tests**:
- Health: `curl -sS http://localhost:3000/api/health` → `{"status":"ok","mode":"development"}`.
- Export without auth: `curl -sS -X POST http://localhost:3000/api/reports/export -H 'Content-Type: application/json' -d '{"positionId":"x"}'` → 401.
- Export with auth but no match cache: → 409 `MATCH_NOT_CACHED`.

- [ ] **Step 5: Confirm no fake PDF remains** — `grep -rnE "setTimeout.*PDF|PDF 已下载|fakePdf|模拟.*PDF" src` → empty.

- [ ] **Step 6: Commit Task 5** — `docs: document PDF export`.

---

## Self-Review Notes

- Spec coverage: This plan implements spec §12 (real PDF via Playwright) + §13 error states (ResumeMissing/AssessmentMissing/MatchNotCached/PdfRenderFailed) + §15 sync v1 + §16 "PDF 下载不再是假成功" acceptance. Docker (§3 default-local-run) and real SMS (§14) remain out of scope — they are separate later plans.
- Placeholder scan: No open-ended placeholders. The only conditional step is Playwright Chromium install (§Task 3 Step 1); on failure it is recorded, not faked.
- Type consistency: `ReportData`, `assembleReportData`, `renderPdf`, `createReportService` defined in Tasks 1-3 and consumed consistently in Tasks 4-5.
- Auth boundary: export requires session; report data is scoped to `user.id`; no cross-user access (repositories already filter by userId).
- Honesty: no setTimeout fake-success, no template PDF, clear errors when AI key missing (match not cached → 409 actionable).
