import { useEffect, useRef, useState } from 'react';
import type { ResumeData, PersonalityResult, RecommendationResult } from '../types';
import PageHeader from './ui/PageHeader';
import EmptyState from './ui/EmptyState';
import StatusBanner from './ui/StatusBanner';
import CareerPreferencesForm from './CareerPreferencesForm';
import { useAuth } from '../context/AuthContext';
import { getPreferences, savePreferences } from '../lib/userDataStore';
import { EMPTY_PREFERENCES } from '../lib/careerPreferences';
import { recommendCareers } from '../lib/careerRecommendation';
import { CAREER_CATALOG } from '../catalog';
import { api } from '../lib/apiClient';
import { hasRealResumeData } from '../lib/resumeState';
import DialogFrame from './ui/DialogFrame';
import AssessmentResultPage from './AssessmentResultPage';

interface Props {
  onSelectPosition: (id: string) => void;
  onOpenModal: (modal: 'download' | 'share' | null) => void;
  onRetake: () => void;
  resumeData?: ResumeData | null;
  personalityResult?: PersonalityResult | null;
}
export default function MatchResultsPage({ onSelectPosition, onRetake, resumeData, personalityResult }: Props) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(EMPTY_PREFERENCES);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setReady(false); setPending(true); setError(''); setResult(null);
    getPreferences(user).then(async saved => {
      if (!active) return;
      setPreferences(saved); setReady(true); setDirty(false);
      if (!user || !resumeData || !hasRealResumeData(resumeData)) return;
      const next = user.isGuest ? recommendCareers(resumeData, saved, CAREER_CATALOG) : await api.getRecommendations();
      if (active) setResult(next);
    }).catch(e => { if (active) setError(e?.message || '推荐读取失败，请重试。'); })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [user?.id, user?.isGuest, resumeData, reload]);
  async function submit() {
    if (!ready || !resumeData || pending) return;
    setPending(true); setError(''); setResult(null);
    try {
      const saved = await savePreferences(user, preferences);
      if (!alive.current) return;
      setPreferences(saved); setDirty(false);
      const next = user?.isGuest ? recommendCareers(resumeData, saved, CAREER_CATALOG) : await api.getRecommendations();
      if (alive.current) setResult(next);
    } catch (e: any) { if (alive.current) setError(e?.message || '保存或推荐失败，请重试；填写内容仍保留。'); }
    finally { if (alive.current) setPending(false); }
  }
  return <div className="mx-auto max-w-6xl space-y-7 px-4 py-8">
    <PageHeader eyebrow="第三步 · 查看推荐" title="职业方向与候选类型" description="从这些方向开始了解，看看具体工作内容和需要准备的能力。" primaryAction={<button onClick={onRetake} className="rounded-md border border-career-line px-4 py-2 text-sm">更新材料</button>} />
    {!hasRealResumeData(resumeData) ? <EmptyState title="还没有简历档案" description="先整理并保存个人材料，才能生成有依据的推荐。" action={<button onClick={onRetake}>上传或填写简历</button>} /> : <>
      <section className="text-sm leading-6"><h2 className="text-lg font-semibold">你的求职画像</h2><p>专业：{resumeData?.major || '尚未提供'} · 学历：{resumeData?.qualifications?.degree || '待确认'}</p><p>已有技能：{resumeData?.skills.join('、') || '待确认'}</p><p className="text-xs text-career-muted">测评参考：{personalityResult?.typeTitle || '尚未完成'}。当前候选排序仍依据简历与求职偏好，测评暂未参与排序。</p><div className="flex gap-4"><button disabled={!personalityResult} className="text-sm text-career-primary underline" onClick={() => setReviewOpen(true)}>查看测评结果</button><a className="text-sm text-career-primary underline" href="#view=assessment">重新测评</a></div></section>
      {ready && <CareerPreferencesForm value={preferences} pending={pending} onChange={value => { setPreferences(value); setDirty(true); setResult(null); }} onSubmit={submit} />}
      <a href="#view=browser" className="inline-block text-sm font-semibold text-career-primary underline">去岗位库探索更多岗位</a>
      {pending && <StatusBanner tone="pending" title="正在读取或生成推荐" description="请稍候。" />}
      {error && <StatusBanner tone="error" title="推荐尚未完成" description={error} action={<button onClick={() => ready ? submit() : setReload(n => n + 1)}>重试</button>} />}
      {dirty && <p role="status" className="text-sm text-career-muted">偏好有未保存的修改，保存后更新推荐。</p>}
      {result && <>
        <p className="text-xs leading-6 text-career-muted">{result.notice}本次从 {result.totalCandidates} 个候选类型中列出 {result.recommendations.length} 个有相关线索的方向，最多 10 个。</p>
        {!result.recommendations.length && <EmptyState title="还缺少区分职业的依据" description="请补充技能、经历成果，或选择想探索的行业和类别。也可从职业库主动浏览；暂不按目录顺序生成个人推荐。" />}
        <ol aria-label="推荐岗位" className="space-y-5">{result.recommendations.map((item, index) => <li key={item.position.id} className="rounded-md border border-career-line p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{index + 1}. {item.position.title}</h2><span className="text-xs text-career-primary">{item.label}</span></div>
          <p className="mt-2 text-xs text-career-muted">{item.position.industry} · {item.position.category}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3"><Evidence title="推荐依据" items={item.reasons} /><Evidence title="待补充的证据" items={item.gaps} /><Evidence title="待确认信息" items={item.unknowns} /></div>
          <button onClick={() => onSelectPosition(item.position.catalogId || item.position.id)} className="mt-4 rounded-md bg-career-primary px-4 py-2 text-sm text-white">查看职业与个人诊断</button>
        </li>)}</ol>
      </>}
    </>}
    {reviewOpen && personalityResult && <DialogFrame wide titleId="assessment-review-title" onClose={() => setReviewOpen(false)}><div className="flex items-center justify-between gap-4"><h2 id="assessment-review-title" className="text-xl font-semibold">测评结果</h2><button onClick={() => setReviewOpen(false)} className="rounded-md border border-career-line px-3 py-2 text-sm">关闭结果</button></div><AssessmentResultPage reviewOnly personalityResult={personalityResult} onSeeMatches={() => setReviewOpen(false)} onShare={() => {}} /></DialogFrame>}
  </div>;
}
function Evidence({ title, items }: { title: string; items: string[] }) {
  return <div><h3 className="text-sm font-semibold">{title}</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-career-muted">{(items.length ? items : ['当前材料暂无更多线索。']).map((item, i) => <li key={i}>{item}</li>)}</ul></div>;
}
