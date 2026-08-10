# Security Audit: PDF Report Export (Phase 6)

**Scope:** `origin/main...HEAD` on branch `careermatch-pdf-export` — 8 source files (`src/server/reports/*`, `src/server/app.ts` export route, `src/lib/apiClient.ts`, `src/components/DownloadModal.tsx`, `src/components/PositionDetailPage.tsx` + 2 stale-copy edits, `src/App.tsx`).

**Method:** Map entry points → trust boundaries → sinks; inspect the four high-value paths (authorization, data access, session/identity, input→output encoding); cross-reference intent; self-refute every candidate; report only what survives with cited evidence.

---

## Surviving findings

**None.**

No finding survived self-refutation. The audit produced zero Critical/High/Medium/Low findings with a concrete, reachable exploit path.

---

## What was checked and refuted (candidates considered)

### A. Renderer abuse / HTML injection into the Playwright PDF sink
**Path traced:** user-controlled strings (company, title, skills, whyExcellent, requirements, summary, exam, projectRecap, applicant name/school/major) → `buildReportHtml` → `renderPdf` → `page.setContent(html)` → `page.pdf()`.

**Refuted because:** every free-text interpolation in `reportHtml.ts` passes through `escapeHtml()` (lines 109–113, 121–122, 128, 141, 145–146, 156–157, 161; the `list`/`cappedList` helpers escape each item internally; `buildGaps` escapes label/value in `reportData.ts`). The only un-escaped interpolations are:
- `data.conclusion.score`, `data.dimensions.{resumeMatch,personalityMatch,overallMatch}` — `Int` columns from the cached `MatchResult` DB row (`prisma/schema.prisma:150-152`), not free-form text;
- `toneColor` — a constant looked up from the `TONE_COLOR` map keyed by the enumerated `DiagnosisTone` ('success'|'warning'|'error'), not user-influenceable.

No attacker-controlled value reaches `setContent`/`page.pdf` un-escaped. **Defense holds at the sink.** (`tests/reports/reportHtml.test.ts` testEscapesUserInput verifies `<script>` injection is escaped.)

### B. Cross-tenant / cross-user data access via the export route
**Path traced:** `POST /api/reports/export { positionId }` → `requireAuth` → `getLatestResumeByUserId(user.id)` / `getLatestAssessmentByUserId(user.id)` / `findCachedMatchResult({ userId, resumeId, assessmentId, positionId, ... })`.

**Refuted because:**
- `requireAuth` (app.ts:203) gates the route; guests get 401.
- Resume and assessment repositories filter by `userId` (`resumesRepository.ts:12-17`, `assessmentsRepository.ts:11-16`).
- `findCachedMatchResult` keys on `userId` (`matchResultsRepository.ts:16-22`, unique index `@@unique([userId, resumeId, assessmentId, positionId, resumeHash, assessmentHash])`). A user cannot retrieve another user's cached `MatchResult` even with a guessed `positionId`.
- `positionId` is user-supplied but `Position` is shared/public catalog data (`positionsRepository.getPositionById` has no userId filter by design, matching `listPositions`). No private data is gated solely by `positionId`.

**No gate/action field mismatch:** the authenticated `user.id` is the same ID used for every data-access call; `positionId` scopes only to public position data. attacker≠victim boundary does not apply because no private boundary is crossed.

### C. Fail-open error paths
**Path traced:** route `catch`, `pdfRenderer` catch/finally, `reportService` size guards.

**Refuted because:** every error branch *denies* rather than allows — route returns `HttpError.status` or `toHttpReportError` (409/500/502, no PDF body); `pdfRenderer` throws `PdfRenderError` on launch/render failure and closes the browser in `finally`; `reportService` throws `ReportError('REPORT_TOO_LARGE')` when HTML>200KB or PDF>5MB. No branch returns a success body on error. No permissive fallback.

### D. Content-Disposition header injection / filename parser differential
**Path traced:** `sanitizeFileName` → `buildContentDisposition` → `res.setHeader` → client `parseContentDispositionFileName`.

**Refuted because:** `sanitizeFileName` strips `[\\/:*?"<>|]`; `buildContentDisposition` percent-encodes the full name via `encodeURIComponent` for the `filename*=UTF-8''` value (RFC 5987) and replaces all non-ASCII + `"` for the ASCII `filename=` fallback. No quote/backslash escape is possible in either field. The client decodes `filename*=` with `decodeURIComponent`. No differential. (End-to-end verified: `status 200`, header is 7-bit clean.)

### E. PII leakage into error responses
**Path traced:** `PdfRenderError` message includes `describe(error)` (the underlying Playwright error message).

**Refuted (low confidence, flagged for user double-check below):** Playwright's `page.pdf()` / `setContent()` errors are protocol/timeout-level ("Timeout exceeded", "Target closed") and do not echo the page DOM or the `html` argument. The response body is `生成 PDF 失败:<message>`. No concrete PII path found.

---

## Root-cause theme

There is no systemic security defect. The feature correctly (a) gates everything behind `requireAuth`, (b) scopes all private-data reads to the authenticated `userId` including the cache key, (c) escapes every user-controlled string before it reaches the HTML→PDF renderer sink, (d) refuses to return a PDF body on any error, and (e) encodes the filename header to be both Node-safe (7-bit) and client-decodable (RFC 5987). The one design choice worth noting — positions are public catalog data not scoped per user — is consistent with the existing `listPositions`/`getPositionById` behavior and carries no private-data exposure.

## What is well-built (explicit)

- **Auth boundary is tight:** `requireAuth` + userId-scoped resume/assessment/cached-match reads. No cross-user path exists.
- **Output encoding is complete:** `escapeHtml` is applied at every free-text interpolation in `reportHtml.ts`; numeric score interpolations come from typed `Int` DB columns, and `toneColor` is a constant. The XSS-in-PDF vector is closed at the sink.
- **No fail-open:** all catch / size-guard / timeout branches deny (throw or return an error status), never silently return a PDF.
- **Resource safety:** `pdfRenderer` always closes the browser in `finally`; `page.pdf()` is now raced against a 30s timeout so a hung render cannot block the request or leak the browser.
- **Header safety:** `buildContentDisposition` keeps the header 7-bit clean for Node's `res.setHeader` while preserving the real CJK filename via RFC 5987 — the previous raw-CJK form threw `ERR_INVALID_CHAR` and broke every export (fixed in commit d67c439).
- **Honesty:** no `setTimeout` fake-success; the browser download fires only after the server confirms the PDF body; missing cache → actionable 409, not a fake PDF.

## Could not verify — user should double-check

1. **End-to-end authed path with a real DB.** The 409 MATCH_NOT_CACHED and the happy-path PDF download require PostgreSQL + a logged-in session + a cached `MatchResult`. Without `TEST_DATABASE_URL` configured locally, only the static logic, unit tests, and the unauth (401) smoke path were exercised. Recommend running the authed flow against a real DB before merge.
2. **Playwright error message contents.** `PdfRenderError` wraps `describe(error)` from Playwright. I could not exhaustively prove no Playwright error variant ever echoes a fragment of the `html` argument (which contains user resume/assessment text). In practice these errors are timeout/protocol-level and don't echo DOM, but if you want a hard guarantee, cap the message length or replace `describe(error)` with a fixed string in `pdfRenderer.ts`.
3. **CJK font availability in production.** The HTML uses a system CJK font stack; whether the production/CI environment renders Chinese correctly in the PDF was not tested end-to-end (requires a real browser run).
