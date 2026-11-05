import type { Position } from '../types';
import { ArrowRight, Target } from 'lucide-react';
import type { ViewType } from '../lib/navigation';

export default function LandingPage({ onNavigate, positions = [], continueView = 'upload' }: { onNavigate: (view: string) => void; positions?: Position[]; continueView?: ViewType }) {
  const industries = [...new Set(positions.map(p => p.industry).filter(Boolean))];
  return <div className="bg-career-bg text-career-ink">
    <section className="mx-auto max-w-4xl px-4 py-16 sm:py-24">
      <p className="text-xs font-semibold tracking-[0.16em] text-career-primary">找到适合自己的职业方向</p>
      <h1 className="mt-6 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">把简历和测评变成<br className="hidden sm:block" />一份职业诊断报告</h1>
      <p className="mt-6 max-w-2xl text-base leading-8 text-career-muted">了解职业要求，对照自己的经历与工作偏好，找到需要补充的证据和下一步准备方向。</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row"><button id="start-matching-btn" onClick={() => onNavigate(continueView)} className="rounded-md bg-career-primary px-6 py-3 text-sm font-semibold text-white">{continueView === 'results' ? '查看我的推荐' : continueView === 'assessment' ? '继续性格测评' : '开始职业匹配'}</button><button onClick={() => onNavigate('browser')} className="rounded-md border border-career-line bg-career-surface px-6 py-3 text-sm font-semibold">先逛岗位库</button></div>
      <p className="mt-6 max-w-2xl text-xs leading-6 text-career-muted">游客材料保存在此浏览器，登录后可同步到账号。简历文字会发送给已配置的 AI 服务进行解析与诊断。你可在我的档案删除材料。</p>
    </section>
    <section className="border-y border-career-line px-4 py-12 sm:py-16"><div className="mx-auto max-w-4xl"><h2 className="text-2xl font-semibold">三步形成求职诊断档案</h2><ol className="mt-8 divide-y divide-career-line">{[
      ['整理个人材料', '上传解析或手动填写，确认技能、学历和经历成果。'],
      ['完成性格测评', '回答有关工作习惯与偏好的问题，保存自己的测评结果。'],
      ['查看推荐，再深入了解', '查看推荐依据，进入岗位库了解职责、要求和准备方向。测评不代表录用概率。'],
    ].map(([title, description], i) => <li key={title} className="flex gap-5 py-6"><span className="text-3xl font-bold tabular-nums text-career-muted/50">0{i + 1}</span><div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-7 text-career-muted">{description}</p></div></li>)}</ol></div></section>
    <section className="mx-auto max-w-4xl px-4 py-12 sm:py-16"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl font-semibold">探索职业类型</h2><button onClick={() => onNavigate('browser')} className="text-sm font-semibold text-career-primary">查看职业库 <ArrowRight className="inline h-4 w-4" /></button></div><p className="mt-4 text-sm leading-7 text-career-muted">当前收录 {positions.length} 个职业类型，涵盖 {industries.length} 个行业。这里不是实时招聘列表，不绑定企业、城市或福利；薪资与准备资料仅作参考，具体条件以招聘公告为准。</p><ul className="mt-6 grid gap-x-8 divide-y divide-career-line sm:grid-cols-2 sm:divide-y-0">{positions.slice(0, 6).map(p => <li key={p.id} className="border-b border-career-line py-4"><p className="text-sm font-semibold">{p.title}</p><p className="mt-1 text-xs text-career-muted">{p.industry} · {p.category}</p></li>)}</ul></section>
    <footer className="mx-auto max-w-4xl border-t border-career-line px-4 py-6 text-xs text-career-muted"><Target className="mr-2 inline h-4 w-4" />精准职达 · 大学生职业诊断工具</footer>
  </div>;
}
