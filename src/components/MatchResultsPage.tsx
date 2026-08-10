import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Filter, Heart, Landmark, Laptop, RefreshCw } from 'lucide-react';
import { MOCK_POSITIONS } from '../data';
import { Position, ResumeData, PersonalityResult } from '../types';
import { useAuth } from '../context/AuthContext';
import { getPositions, getFavorites, toggleFavorite } from '../lib/userDataStore';
import { hasRealResumeData } from '../lib/resumeState';
import PageHeader from './ui/PageHeader';
import EmptyState from './ui/EmptyState';

interface MatchResultsPageProps {
  onSelectPosition: (id: string) => void;
  onOpenModal: (modalType: 'download' | 'share' | null) => void;
  onRetake: () => void;
  resumeData?: ResumeData | null;
  personalityResult?: PersonalityResult | null;
}

export default function MatchResultsPage({ onSelectPosition, onRetake, resumeData, personalityResult }: MatchResultsPageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'state-owned' | 'internet'>('state-owned');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [salarySort, setSalarySort] = useState<string>('match');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [positions, setPositions] = useState<Position[]>(MOCK_POSITIONS);

  useEffect(() => {
    async function loadData() {
      const dbPositions = await getPositions();
      setPositions(dbPositions);
      if (user) {
        try {
          const dbFavs = await getFavorites(user);
          const favMap: Record<string, boolean> = {};
          dbFavs.forEach((id) => { favMap[id] = true; });
          setFavorites(favMap);
        } catch (e) {
          console.error('Failed to load favorites', e);
        }
      }
    }
    loadData();
  }, [user]);

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFavNow = !favorites[id];
    setFavorites({ ...favorites, [id]: isFavNow });
    if (user) {
      try {
        await toggleFavorite(user, id);
      } catch (err) {
        console.error('Failed to toggle favorite', err);
      }
    }
  };

  const hasResume = hasRealResumeData(resumeData);
  const hasAssessment = Boolean(personalityResult);

  const filteredPositions = useMemo(() => {
    let list = positions.filter((p) => p.type === activeTab);
    if (cityFilter !== 'all') list = list.filter((p) => p.city.includes(cityFilter));
    if (salarySort === 'match') {
      list = [...list].sort((a, b) => b.overallMatch - a.overallMatch);
    } else if (salarySort === 'resume') {
      list = [...list].sort((a, b) => b.resumeMatch - a.resumeMatch);
    } else if (salarySort === 'personality') {
      list = [...list].sort((a, b) => b.personalityMatch - a.personalityMatch);
    } else if (salarySort === 'salary-high') {
      const getSalaryHigh = (range: string) => Number(range.match(/(\d+)-?(\d+)?万/)?.[2] || range.match(/(\d+)/)?.[1] || 0);
      list = [...list].sort((a, b) => getSalaryHigh(b.salaryRange) - getSalaryHigh(a.salaryRange));
    }
    return list;
  }, [positions, activeTab, cityFilter, salarySort]);

  const stateOwnedCount = positions.filter((p) => p.type === 'state-owned').length;
  const internetCount = positions.filter((p) => p.type === 'internet').length;
  const displayDirection = resumeData?.inferredDirection || '未完善';
  const skills = resumeData?.skills?.slice(0, 4) || [];
  const targetCities = resumeData?.targetCities?.join('、') || '未完善';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-20">
      <PageHeader
        eyebrow="Diagnosis results"
        title="岗位匹配结果"
        description="基于你的简历和测评，生成推荐方向和岗位摘要。"
        primaryAction={<button onClick={onRetake} className="rounded-md bg-career-primary px-4 py-2 text-sm font-semibold text-white">更新材料</button>}
      />

      {!hasResume ? (
        <EmptyState title="还没有简历档案" description="还没有简历档案。上传简历后才能生成岗位匹配。" action={<button onClick={onRetake} className="rounded-md bg-career-primary px-4 py-2 text-sm font-semibold text-white">上传简历</button>} />
      ) : !hasAssessment ? (
        <EmptyState title="还没有职业测评" description="还没有职业测评。完成测评后才能判断性格适配。" action={<button onClick={onRetake} className="rounded-md bg-career-primary px-4 py-2 text-sm font-semibold text-white">完成测评</button>} />
      ) : (
      <div className="space-y-10">
        <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-stretch">
          <div className="lg:border-r lg:border-career-line lg:pr-8">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-career-muted uppercase">求职画像摘要</p>
            <p className="mt-1 text-sm text-career-muted">用于解释岗位推荐的基础材料,不用默认学校或专业填充缺失信息。</p>
            <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <SummaryItem label="推断方向" value={displayDirection} />
              <SummaryItem label="主要技能" value={skills.length > 0 ? skills.join('、') : '未完善'} />
              <SummaryItem label="性格关键词" value={personalityResult?.typeTitle || '未完成测评'} />
              <SummaryItem label="目标城市" value={targetCities} />
            </div>
          </div>
          <div className="lg:pl-8">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-career-muted uppercase">资料完整度</p>
            <div className="mt-3 space-y-2">
              <p className="flex items-center gap-2 text-sm text-career-ink">
                <span className={`h-2 w-2 rounded-full ${resumeData?.name ? 'bg-career-success' : 'bg-career-line'}`} />
                {resumeData?.name ? '简历已上传' : '简历未完善'}
              </p>
              <p className="flex items-center gap-2 text-sm text-career-ink">
                <span className={`h-2 w-2 rounded-full ${personalityResult ? 'bg-career-success' : 'bg-career-line'}`} />
                {personalityResult ? '测评已完成' : '测评未完成'}
              </p>
            </div>
            <button id="results-retake-btn" onClick={onRetake} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-career-primary px-4 py-2 text-xs font-semibold text-white">
              <RefreshCw className="h-3.5 w-3.5" /> 更新材料
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-career-ink">推荐方向</h2>
          <p className="mt-1 text-sm text-career-muted">方向说明来自现有简历和测评数据;信息不足时只提示补充材料。</p>
          <div className="mt-5 divide-y divide-career-line">
            <DirectionRow title={resumeData?.inferredDirection || '待补充求职方向'} reason={resumeData?.inferredDirection ? '简历解析中识别出的主要目标方向。' : '完成简历解析和测评后生成更具体的方向说明。'} type="综合方向" gap={skills.length > 0 ? '需要结合目标岗位补充项目证据。' : '请先补充技能、项目和目标城市。'} />
            <DirectionRow title="央国企稳定流程岗位" reason={personalityResult ? `测评显示央国企适配参考值 ${personalityResult.industryFit.stateOwned}。` : '完成测评后判断稳定流程和组织协作适配。'} type="央国企" gap="需要证明长期投入、流程协作和专业基础。" />
            <DirectionRow title="互联网产品与技术岗位" reason={personalityResult ? `测评显示互联网适配参考值 ${personalityResult.industryFit.internet}。` : '完成测评后判断变化节奏和成长压力适配。'} type="互联网" gap="需要补齐项目复盘、工程化或业务理解证据。" />
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-career-muted" />
              {['all', '北京', '上海', '南京', '杭州'].map((city) => (
                <button key={city} onClick={() => setCityFilter(city)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${cityFilter === city ? 'bg-career-primary text-white' : 'bg-career-surface-muted text-career-muted hover:text-career-ink'}`}>
                  {city === 'all' ? '全部城市' : city}
                </button>
              ))}
            </div>
            <select value={salarySort} onChange={(e) => setSalarySort(e.target.value)} className="rounded-md border border-career-line bg-career-bg px-3 py-2 text-xs font-semibold text-career-ink outline-none">
              <option value="match">综合匹配</option>
              <option value="resume">硬条件</option>
              <option value="personality">性格适配</option>
              <option value="salary-high">薪资</option>
            </select>
          </div>

          <div className="mt-4 flex rounded-lg bg-career-surface-muted p-1">
            <button onClick={() => setActiveTab('state-owned')} className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold ${activeTab === 'state-owned' ? 'bg-career-surface text-career-primary' : 'text-career-muted'}`}>
              <Landmark className="h-4 w-4" /> 央国企岗位（{stateOwnedCount}）
            </button>
            <button onClick={() => setActiveTab('internet')} className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold ${activeTab === 'internet' ? 'bg-career-surface text-career-primary' : 'text-career-muted'}`}>
              <Laptop className="h-4 w-4" /> 互联网岗位（{internetCount}）
            </button>
          </div>
        </section>

        {filteredPositions.length === 0 ? (
          <EmptyState title="当前筛选条件下没有岗位" description="尝试放宽城市、类型或难度。" />
        ) : (
          <div className="divide-y divide-career-line">
            {filteredPositions.map((pos) => (
              <PositionRow key={pos.id} position={pos} isFavorite={!!favorites[pos.id]} onToggleFavorite={handleToggleFavorite} onSelectPosition={onSelectPosition} />
            ))}
          </div>
        )}

        <p className="border-t border-career-line pt-4 text-xs leading-5 text-career-muted">
          点击岗位进入诊断报告页可查看匹配维度、证据与行动建议，并导出 PDF 报告。
        </p>
      </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-career-line/60 pb-2"><p className="text-[10px] font-semibold tracking-[0.14em] text-career-muted uppercase">{label}</p><p className="mt-1 text-sm font-semibold leading-5 text-career-ink">{value}</p></div>;
}

function DirectionRow({ title, reason, type, gap }: { title: string; reason: string; type: string; gap: string }) {
  return <div className="py-4"><div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between"><h3 className="text-sm font-semibold text-career-ink">{title}</h3><span className="text-[10px] font-semibold tracking-[0.14em] text-career-muted uppercase">{type}</span></div><p className="mt-2 text-sm leading-6 text-career-muted">{reason}</p><p className="mt-1 text-xs text-career-muted">当前短板:{gap}</p></div>;
}

const PositionRow: React.FC<{ position: Position; isFavorite: boolean; onToggleFavorite: (id: string, e: React.MouseEvent) => void; onSelectPosition: (id: string) => void }> = ({ position, isFavorite, onToggleFavorite, onSelectPosition }) => {
  const gaps = [...position.requirements, ...position.softSkills].slice(0, 2);
  return (
    <div onClick={() => onSelectPosition(position.id)} className="cursor-pointer py-4 transition-colors hover:bg-career-primary-soft/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-career-muted">
            <span>{position.company}</span><span>·</span><span>{position.city}</span><span>·</span><span>{position.type === 'state-owned' ? '央国企' : '互联网'}</span><span>·</span><span>{position.salaryRange}</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-career-ink">{position.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-career-muted">{position.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-career-success-soft px-2 py-1 font-semibold text-career-ink">{diagnosisLabel(position.overallMatch)} · {position.overallMatch}%</span>
            {gaps.map((gap) => <span key={gap} className="rounded-md bg-career-warning-soft px-2 py-1 text-career-ink">主要差距:{gap}</span>)}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={(e) => onToggleFavorite(position.id, e)} className={`rounded-md border px-3 py-2 text-xs font-semibold ${isFavorite ? 'border-career-danger/30 bg-career-danger-soft text-career-danger' : 'border-career-line bg-career-surface text-career-muted'}`}>
            <Heart className={`inline h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} /> {isFavorite ? '已收藏' : '收藏'}
          </button>
          <button className="rounded-md bg-career-primary px-3 py-2 text-xs font-semibold text-white">查看诊断 <ArrowRight className="inline h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
};

function diagnosisLabel(score: number) {
  if (score >= 80) return '推荐';
  if (score >= 65) return '谨慎';
  return '不建议';
}
