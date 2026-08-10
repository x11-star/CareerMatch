import type { ReportData } from './types';

// Escapes user-controlled strings so a malicious company name / whyExcellent / skill cannot inject
// HTML or break out of the report markup. Applied to every interpolated value.
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function list(items: string[]): string {
  if (items.length === 0) return `<ul class="empty"><li>暂无</li></ul>`;
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

const TONE_COLOR: Record<string, string> = {
  success: '#1f7a3a',
  warning: '#9a6a00',
  error: '#a3242a',
};

// Builds a fully self-contained HTML document for the position diagnosis report. No external CSS,
// fonts, or images — Playwright loads this from a blank page, so external assets are unreliable.
// Inline <style> only; system CJK font stack so Chinese renders correctly without bundled fonts.
export function buildReportHtml(data: ReportData): string {
  const toneColor = TONE_COLOR[data.conclusion.tone] || '#1E3A5F';
  const date = data.generatedAt.slice(0, 10);

  const gaps = data.actions.gaps
    .map((g) => `<div class="gap"><span class="gap-label">${escapeHtml(g.label)}</span><span class="gap-value">${escapeHtml(g.value)}</span></div>`)
    .join('');

  const timeline = data.actions.timeline
    .map((w) => `<div class="timeline-window"><h3>${escapeHtml(w.title)}</h3>${list(w.items)}</div>`)
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>岗位诊断报告</title>
<style>
  :root { --ink: #1E3A5F; --line: #e2e8f0; --muted: #64748b; --bg: #f8fafc; }
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
    color: #0f172a;
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
  }
  .page { padding: 12mm; }
  header.report-header {
    border-bottom: 2px solid var(--ink);
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  .report-header h1 { font-size: 18px; color: var(--ink); margin: 0 0 4px; }
  .report-header .meta { color: var(--muted); font-size: 11px; }
  .report-header .meta span { margin-right: 12px; }
  section { margin-bottom: 18px; }
  h2.section-title {
    font-size: 14px; color: var(--ink);
    border-left: 3px solid var(--ink); padding-left: 8px; margin: 0 0 8px;
  }
  .conclusion { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; }
  .conclusion .score { font-size: 36px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .conclusion .score small { font-size: 16px; color: var(--muted); font-weight: 600; }
  .conclusion .label { font-weight: 700; }
  .conclusion .sentence { color: #334155; }
  .dimensions { display: flex; gap: 24px; font-variant-numeric: tabular-nums; color: var(--muted); font-size: 11px; }
  .dimensions b { color: var(--ink); font-size: 14px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
  h3 { font-size: 12px; color: var(--ink); margin: 0 0 4px; }
  ul { margin: 0; padding-left: 16px; }
  ul.empty { color: var(--muted); }
  li { margin: 2px 0; font-size: 11px; }
  .gap { border-top: 1px solid var(--line); padding-top: 4px; }
  .gap-label { display: block; font-size: 9px; letter-spacing: 0.14em; color: var(--muted); text-transform: uppercase; }
  .gap-value { display: block; font-size: 11px; }
  .why { background: var(--bg); padding: 8px; border-radius: 4px; }
  .why h3 { margin-bottom: 4px; }
  .footer { border-top: 1px solid var(--line); padding-top: 6px; color: var(--muted); font-size: 9px; }
</style>
</head>
<body>
<div class="page">
  <header class="report-header">
    <h1>岗位诊断报告</h1>
    <div class="meta">
      <span>姓名:${escapeHtml(data.applicant.name)}</span>
      <span>学校:${escapeHtml(data.applicant.school)}</span>
      <span>专业:${escapeHtml(data.applicant.major)}</span>
      <span>岗位:${escapeHtml(data.position.title)}</span>
      <span>生成时间:${escapeHtml(date)}</span>
    </div>
  </header>

  <section>
    <h2 class="section-title">结论</h2>
    <div class="conclusion">
      <span class="score" style="color:${toneColor}">${data.conclusion.score}<small>%</small></span>
      <span class="label" style="color:${toneColor}">${escapeHtml(data.conclusion.label)}</span>
      <span class="sentence">${escapeHtml(data.conclusion.sentence)}</span>
    </div>
    <div class="dimensions">
      <span>简历匹配 <b>${data.dimensions.resumeMatch}</b></span>
      <span>性格匹配 <b>${data.dimensions.personalityMatch}</b></span>
      <span>综合匹配 <b>${data.dimensions.overallMatch}</b></span>
      <span>岗位 ${escapeHtml(data.position.company)} · ${escapeHtml(data.position.city)} · ${escapeHtml(data.position.type)} · ${escapeHtml(data.position.salaryRange)}</span>
    </div>
  </section>

  <section>
    <h2 class="section-title">证据</h2>
    <div class="grid-3">
      <div><h3>已满足</h3>${list(data.evidence.met)}</div>
      <div><h3>部分满足</h3>${list(data.evidence.partial)}</div>
      <div><h3>缺失 / 待证明</h3>${list(data.evidence.missing)}</div>
    </div>
    <div class="grid-2" style="margin-top:12px">
      <div><h3>性格适配点</h3>${list(data.evidence.fitPersonality)}</div>
      <div><h3>风险点</h3><p style="font-size:11px;margin:4px 0">${escapeHtml(data.evidence.risk)}</p></div>
    </div>
    <div class="why" style="margin-top:12px">
      <h3>AI 专家解读</h3>
      <p style="margin:4px 0;font-size:11px;color:#334155">${escapeHtml(data.evidence.whyExcellent)}</p>
      <p style="margin:4px 0;font-size:10px;color:var(--muted)">岗位概述:${escapeHtml(data.position.summary)}</p>
    </div>
  </section>

  <section>
    <h2 class="section-title">行动建议</h2>
    <div class="grid-4" style="margin-bottom:12px">${gaps}</div>
    <div class="grid-3">${timeline}</div>
    <div class="grid-3" style="margin-top:12px">
      <div><h3>可能被问的问题</h3>${list(data.actions.interview.questions)}</div>
      <div><h3>笔试或技能准备</h3><p style="font-size:11px;margin:4px 0">${escapeHtml(data.actions.interview.exam)}</p></div>
      <div><h3>项目复盘重点</h3><p style="font-size:11px;margin:4px 0">${escapeHtml(data.actions.interview.projectRecap)}</p></div>
    </div>
  </section>

  <div class="footer">本报告由精准职达生成,内容基于缓存匹配结果,仅供求职参考。生成时间 ${escapeHtml(data.generatedAt.slice(0, 19).replace('T', ' '))}。</div>
</div>
</body>
</html>`;
}
