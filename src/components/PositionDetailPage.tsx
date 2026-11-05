import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';
import { Position, ResumeData, PersonalityResult } from '../types';
import { useAuth } from '../context/AuthContext';
import PageHeader from './ui/PageHeader';
import StatusBanner from './ui/StatusBanner';
import MatchDimensionsChart from './ui/MatchDimensionsChart';
import { getFavorites, toggleFavorite } from '../lib/userDataStore';
import { interviewPracticeQuestions } from '../catalog';

interface PositionDetailPageProps {
  position: Position;
  onBack: () => void;
  backLabel?: string;
  onOpenModal: (modalType: 'download' | 'share' | null) => void;
  resumeData?: ResumeData;
  personalityResult?: PersonalityResult | null;
}

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

export default function PositionDetailPage({ position, onBack, backLabel = '返回推荐结果', onOpenModal, resumeData, personalityResult }: PositionDetailPageProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteReady, setFavoriteReady] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const favoriteLock = useRef(false);
  const [favoriteError, setFavoriteError] = useState('');
  const [revision, setRevision] = useState(0);
  const [favoriteRevision, setFavoriteRevision] = useState(0);
  const [matchResult, setMatchResult] = useState<{
    resumeMatch: number;
    personalityMatch: number;
    overallMatch: number;
    resumeMatchExplanation: string;
    personalityMatchExplanation: string;
    whyExcellent: string;
  } | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(true);
  const [matchError, setMatchError] = useState('');

  async function parseMatchApiError(response: Response): Promise<string> {
    const body = await response.json().catch(() => null);
    if (body?.code === 'AI_CONFIGURATION_MISSING') {
      return 'AI 匹配服务暂不可用，请稍后再试。';
    }
    return body?.error || `获取 AI 匹配评估失败：HTTP ${response.status}`;
  }

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function fetchMatch() {
      setMatchResult(null);
      setIsLoadingMatch(true);
      setMatchError('');
      if (!user || !resumeData || !personalityResult) { setIsLoadingMatch(false); return; }

      try {
        const response = await fetch('/api/match-position', {
          method: 'POST',
          signal: controller.signal,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user && !user.isGuest ? { positionId: position.id } : { resumeData, personalityResult, position }),
        });
        if (!response.ok) throw new Error(await parseMatchApiError(response));
        const data = await response.json();
        if (active) {
          setMatchResult(data);
        }
      } catch (err: any) {
        if (active) setMatchError(err.message || '获取 AI 相性匹配评估失败');
      } finally {
        if (active) setIsLoadingMatch(false);
      }
    }

    fetchMatch();
    return () => { active = false; controller.abort(); };
  }, [user?.id, user?.isGuest, position, resumeData, personalityResult, revision]);

  useEffect(() => {
    let active = true;
    setIsFavorite(false);
    setFavoriteReady(false);
    setFavoriteError('');
    if (user) getFavorites(user).then(ids => { if (active) { setIsFavorite(ids.includes(position.id)); setFavoriteReady(true); } })
      .catch((error: any) => { if (active) setFavoriteError(error?.message || '收藏读取失败。'); });
    return () => { active = false; };
  }, [user?.id, user?.isGuest, position.id, favoriteRevision]);
  async function handleFavorite() {
    if (!user || !favoriteReady || favoriteLock.current) return;
    favoriteLock.current = true;
    setFavoritePending(true);
    setFavoriteError('');
    try { setIsFavorite(await toggleFavorite(user, position.id)); }
    catch (error: any) { setFavoriteError(error?.message || '收藏未保存，请重试。'); }
    finally { favoriteLock.current = false; setFavoritePending(false); }
  }

  const score = matchResult?.overallMatch ?? 0;
  const scoreTone = diagnosisTone(score);
  const hasMatch = matchResult !== null;
  const resumeSkills = useMemo(() => new Set((resumeData?.skills || []).map((skill) => skill.toLowerCase())), [resumeData]);
  const metRequirements = position.requirements.filter((req) => resumeSkillsHasRequirement(resumeSkills, req));
  const missingRequirements = position.requirements.filter((req) => !resumeSkillsHasRequirement(resumeSkills, req));
  const hasExperience = Boolean(resumeData?.internships?.length || resumeData?.projects?.length);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <button onClick={onBack} className="mb-6 flex cursor-pointer items-center gap-1 text-sm font-medium text-career-muted transition-colors hover:text-career-ink">
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </button>

      <PageHeader
        eyebrow="Position diagnosis"
        title="岗位诊断报告"
        description={`${position.title} · ${position.industry || '职业类型'} · ${position.category || '职业参考'}`}
        primaryAction={<button onClick={() => onOpenModal('share')} className="rounded-md border border-career-line bg-career-surface px-4 py-2 text-sm font-semibold text-career-ink">分享职业链接</button>}
        secondaryAction={<button disabled={!user || !favoriteReady || favoritePending} onClick={handleFavorite} className="rounded-md border border-career-line bg-career-surface px-4 py-2 text-sm font-semibold text-career-ink disabled:opacity-50"><Heart className={`mr-1 inline h-4 w-4 ${isFavorite ? 'fill-career-danger text-career-danger' : ''}`} />{favoritePending ? '保存中' : isFavorite ? '已收藏' : '收藏职业'}</button>}
        meta={<div className="space-y-2 text-xs leading-5 text-career-muted"><p>职业类型参考，不绑定企业、招聘城市或福利。参考年薪 {position.salaryRange} · 参考难度 {position.difficultyRating}/5</p><p>薪资与准备资料来自模型整理，未经招聘公告逐条核验。</p></div>}
      />

      <div className="space-y-10">
        {isLoadingMatch && <StatusBanner tone="pending" title="正在生成 AI 匹配解释" description="系统正在比对简历、测评和岗位要求，处理时间可能需要几秒。" />}
        {(!user || !resumeData || !personalityResult) && <StatusBanner tone="info" title="还没有完整的诊断材料" description="可以先查看职业资料；上传并保存简历、完成测评后再生成个人诊断。" action={<a href={!resumeData ? '#view=upload' : '#view=assessment'}>补充材料</a>} />}
        {matchError && <StatusBanner tone="warning" title="AI 诊断解释暂不可用" description={matchError} action={<button onClick={() => setRevision(n => n + 1)}>重新生成</button>} />}
        {favoriteError && <StatusBanner tone="warning" title="收藏操作未完成" description={favoriteError} action={!favoriteReady ? <button onClick={() => setFavoriteRevision(n => n + 1)}>重新读取收藏</button> : undefined} />}

        {/* 结论段:hero-metric + 匹配维度图 */}
        <section className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-career-muted uppercase">诊断结论</p>
            {hasMatch ? (
              <>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-5xl font-bold tabular-nums tracking-tight text-career-ink">{score}<span className="text-2xl font-semibold text-career-muted">%</span></span>
                  <span className={`text-sm font-semibold ${scoreTone === 'success' ? 'text-career-success' : scoreTone === 'warning' ? 'text-career-warning' : 'text-career-danger'}`}>{diagnosisLabel(score)}</span>
                </div>
                <p className="mt-3 text-base leading-7 text-career-ink">{diagnosisSentence(score)}</p>
                <p className="mt-2 text-sm leading-6 text-career-muted">
                  {missingRequirements.length > 0 ? `准备优先级:先补关键差距(${missingRequirements.slice(0, 2).join('、')})。` : '准备优先级:重点整理项目证据和面试表达。'}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-career-muted">
                {isLoadingMatch ? '正在生成匹配结果,完成后显示诊断分数与维度。' : '匹配结果暂不可用,请确认 AI 服务配置后重试,或先在岗位诊断页生成匹配结果。'}
              </p>
            )}
          </div>
          <div className="lg:border-l lg:border-career-line lg:pl-8">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-career-muted uppercase">匹配维度</p>
            {hasMatch ? (
              <>
                <MatchDimensionsChart
                  resumeMatch={matchResult!.resumeMatch}
                  personalityMatch={matchResult!.personalityMatch}
                  overallMatch={score}
                />
                <p className="mt-3 text-xs leading-5 text-career-muted">对照推荐线 80% 与谨慎线 65%;分数不是唯一结论。</p>
              </>
            ) : (
              <p className="text-sm leading-6 text-career-muted">匹配维度图在生成匹配结果后显示。</p>
            )}
          </div>
        </section>

        {/* 证据段:硬条件 + 性格适配 + AI 解读,条目列表而非卡片网格 */}
        <section>
          <h2 className="text-lg font-semibold text-career-ink">证据</h2>
          <p className="mt-1 text-sm text-career-muted">诊断依据来自岗位要求、简历材料和职业测评。</p>

          <div className="mt-5 grid gap-x-10 gap-y-6 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-career-ink">已满足</h3>
              <ul className="mt-2 divide-y divide-career-line/60">
                {(metRequirements.length > 0 ? metRequirements : ['暂无可直接确认的硬技能']).map((item) => <li key={item} className="py-2 text-sm text-career-ink">{item}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-career-ink">软技能待验证</h3>
              <ul className="mt-2 divide-y divide-career-line/60">
                {position.softSkills.slice(0, 3).map((item) => <li key={item} className="py-2 text-sm text-career-ink">{item}</li>)}
                {position.softSkills.length === 0 && <li className="py-2 text-sm text-career-muted">暂无软技能数据</li>}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-career-ink">缺失 / 待证明</h3>
              <ul className="mt-2 divide-y divide-career-line/60">
                {(missingRequirements.slice(0, 4).length > 0 ? missingRequirements.slice(0, 4) : ['请准备能证明能力的项目复盘']).map((item) => <li key={item} className="py-2 text-sm text-career-ink">{item}</li>)}
              </ul>
            </div>
          </div>

          <div className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-career-ink">职业偏好参考</h3>
              <ul className="mt-2 divide-y divide-career-line/60">
                {(position.fitPersonality.length > 0 ? position.fitPersonality : [personalityResult?.typeTitle || '完成测评后生成更明确的适配点']).map((item) => <li key={item} className="py-2 text-sm text-career-ink">{item}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-career-ink">风险点</h3>
              <ul className="mt-2 divide-y divide-career-line/60">
                <li className="py-2 text-sm text-career-ink">{personalityResult ? '如果岗位节奏或反馈密度与你的测评倾向不同,需要提前准备适应策略。' : '还没有职业测评,暂不能判断岗位环境风险。'}</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-career-bg p-4">
            <h3 className="text-sm font-semibold text-career-ink">AI 专家解读</h3>
            <p className="mt-2 text-sm leading-6 text-career-muted">{matchResult?.whyExcellent || 'AI 解释将在服务可用时生成;当前可先查看结构化差距和准备建议。'}</p>
            <p className="mt-2 text-xs text-career-muted">岗位概述:{position.summary}</p>
          </div>
        </section>

        {/* 行动段:差距 + 补救建议 + 面试准备,可扫读的行动清单 */}
        <section>
          <h2 className="text-lg font-semibold text-career-ink">行动建议</h2>
          <p className="mt-1 text-sm text-career-muted">以下为通用准备建议，不是 AI 个性化行动方案。技能匹配仅按关键词对照，需要补充经历证据。</p>

          <div className="mt-5 grid gap-x-10 gap-y-2 md:grid-cols-4">
            {[
              { label: '技能差距', value: missingRequirements.slice(0, 3).join('、') || '技能项基本覆盖,补项目证据' },
              { label: '经历差距', value: hasExperience ? '把实习或项目整理成 STAR 结构,突出具体贡献' : '暂无实习或项目,补充课程项目或竞赛' },
              { label: '表达差距', value: '准备项目背景、职责、难点、方案和结果' },
              { label: '行业理解', value: '准备公司业务、岗位所属部门和近期行业变化' },
            ].map((item) => (
              <div key={item.label} className="border-t border-career-line pt-3">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-career-muted uppercase">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-career-ink">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-x-10 gap-y-6 md:grid-cols-3">
            {[
              { title: '7 天可做', items: ['补齐岗位要求中最缺的 1-2 个技能证明', '把一个项目整理成 STAR 复盘稿', '准备 3 个和岗位职责相关的问题'] },
              { title: '30 天可做', items: ['补一个小型项目或案例,覆盖岗位核心技术', '针对目标岗位更新简历摘要和项目描述', '完成 2-3 次模拟面试复盘'] },
              { title: '投递前必须补', items: ['确认简历中没有空泛形容词', '准备岗位要求逐条对应证据', '梳理公司业务和部门方向'] },
            ].map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-career-ink">{group.title}</h3>
                <ul className="mt-2 divide-y divide-career-line/60">
                  {group.items.map((item) => <li key={item} className="py-2 text-sm text-career-ink">{item}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-x-10 gap-y-6 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-career-ink">面试练习问题（非企业真题）</h3>
              <ul className="mt-2 divide-y divide-career-line/60">
                {interviewPracticeQuestions(position).map((item) => <li key={item} className="py-2 text-sm text-career-ink">{item}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-career-ink">笔试或技能准备</h3>
              <p className="mt-2 py-2 text-sm leading-6 text-career-ink">{position.howToPrepare.exam || '复习岗位要求中的基础知识和常见题型。'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-career-ink">项目复盘重点</h3>
              <p className="mt-2 py-2 text-sm leading-6 text-career-ink">{position.howToPrepare.interview || '准备项目中的难点、取舍、指标和复盘。'}</p>
            </div>
          </div>
        </section>

        {/* 导出 PDF:打开下载弹窗,后端生成自包含 PDF */}
        <div className="flex justify-end border-t border-career-line pt-4">
          <button onClick={() => onOpenModal('download')} className="flex items-center gap-1.5 rounded-md bg-career-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90">
            导出 PDF 报告
          </button>
        </div>
      </div>
    </div>
  );
}

function resumeSkillsHasRequirement(skills: Set<string>, requirement: string) {
  const normalized = requirement.toLowerCase();
  return Boolean(normalized.trim()) && Array.from(skills).some((skill) => skill.trim() && (normalized.includes(skill) || skill.includes(normalized)));
}
