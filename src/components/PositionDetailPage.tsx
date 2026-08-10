import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';
import { Position, ResumeData, PersonalityResult } from '../types';
import { useAuth } from '../context/AuthContext';
import PageHeader from './ui/PageHeader';
import StatusBanner from './ui/StatusBanner';
import MatchDimensionsChart from './ui/MatchDimensionsChart';

interface PositionDetailPageProps {
  position: Position;
  onBack: () => void;
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

export default function PositionDetailPage({ position, onBack, onOpenModal, resumeData, personalityResult }: PositionDetailPageProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    resumeMatch: number;
    personalityMatch: number;
    overallMatch: number;
    resumeMatchExplanation: string;
    personalityMatchExplanation: string;
    whyExcellent: string;
  } | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
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
    async function fetchMatch() {
      setIsLoadingMatch(true);
      setMatchError('');

      const cacheKey = `match_${user?.isGuest ? 'guest' : user?.id || 'none'}_${position.id}_${resumeData?.name || 'guest'}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (active) {
            setMatchResult(parsed);
            setIsLoadingMatch(false);
          }
          return;
        } catch (e) {
          console.warn('Failed to parse cached match, re-fetching:', e);
        }
      }

      try {
        const response = await fetch('/api/match-position', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user && !user.isGuest ? { positionId: position.id } : { resumeData, personalityResult, position }),
        });
        if (!response.ok) throw new Error(await parseMatchApiError(response));
        const data = await response.json();
        if (active) {
          setMatchResult(data);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } catch (err: any) {
        console.error('Failed to run AI match:', err);
        if (active) setMatchError(err.message || '获取 AI 相性匹配评估失败');
      } finally {
        if (active) setIsLoadingMatch(false);
      }
    }

    fetchMatch();
    return () => { active = false; };
  }, [user, position, resumeData, personalityResult]);

  const score = matchResult?.overallMatch ?? position.overallMatch;
  const scoreTone = diagnosisTone(score);
  const resumeSkills = useMemo(() => new Set((resumeData?.skills || []).map((skill) => skill.toLowerCase())), [resumeData]);
  const metRequirements = position.requirements.filter((req) => resumeSkillsHasRequirement(resumeSkills, req));
  const missingRequirements = position.requirements.filter((req) => !resumeSkillsHasRequirement(resumeSkills, req));
  const hasExperience = Boolean(resumeData?.internships?.length || resumeData?.projects?.length);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <button onClick={onBack} className="mb-6 flex cursor-pointer items-center gap-1 text-sm font-medium text-career-muted transition-colors hover:text-career-ink">
        <ArrowLeft className="h-4 w-4" /> 返回推荐结果
      </button>

      <PageHeader
        eyebrow="Position diagnosis"
        title="岗位诊断报告"
        description={`${position.company} · ${position.title} · ${position.city}`}
        primaryAction={<button onClick={() => onOpenModal('share')} className="rounded-md border border-career-line bg-career-surface px-4 py-2 text-sm font-semibold text-career-ink">复制分享链接</button>}
        secondaryAction={<button onClick={() => setIsFavorite(!isFavorite)} className="rounded-md border border-career-line bg-career-surface px-4 py-2 text-sm font-semibold text-career-ink"><Heart className={`mr-1 inline h-4 w-4 ${isFavorite ? 'fill-career-danger text-career-danger' : ''}`} />{isFavorite ? '已收藏' : '收藏岗位'}</button>}
        meta={<div className="flex flex-wrap gap-2 text-xs text-career-muted"><span>{position.type === 'state-owned' ? '央国企' : '互联网'}</span><span>·</span><span>{position.salaryRange}</span><span>·</span><span>难度 {position.difficultyRating}/5</span></div>}
      />

      <div className="space-y-10">
        {isLoadingMatch && <StatusBanner tone="pending" title="正在生成 AI 匹配解释" description="系统正在比对简历、测评和岗位要求，处理时间可能需要几秒。" />}
        {matchError && <StatusBanner tone="warning" title="AI 诊断解释暂不可用" description={matchError} />}

        {/* 结论段:hero-metric + 匹配维度图 */}
        <section className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-career-muted uppercase">诊断结论</p>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-5xl font-bold tabular-nums tracking-tight text-career-ink">{score}<span className="text-2xl font-semibold text-career-muted">%</span></span>
              <span className={`text-sm font-semibold ${scoreTone === 'success' ? 'text-career-success' : scoreTone === 'warning' ? 'text-career-warning' : 'text-career-danger'}`}>{diagnosisLabel(score)}</span>
            </div>
            <p className="mt-3 text-base leading-7 text-career-ink">{diagnosisSentence(score)}</p>
            <p className="mt-2 text-sm leading-6 text-career-muted">
              {missingRequirements.length > 0 ? `准备优先级:先补关键差距(${missingRequirements.slice(0, 2).join('、')})。` : '准备优先级:重点整理项目证据和面试表达。'}
            </p>
          </div>
          <div className="lg:border-l lg:border-career-line lg:pl-8">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-career-muted uppercase">匹配维度</p>
            <MatchDimensionsChart
              resumeMatch={matchResult?.resumeMatch ?? position.resumeMatch}
              personalityMatch={matchResult?.personalityMatch ?? position.personalityMatch}
              overallMatch={score}
            />
            <p className="mt-3 text-xs leading-5 text-career-muted">对照推荐线 80% 与谨慎线 65%;分数不是唯一结论。</p>
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
              <h3 className="text-sm font-semibold text-career-ink">部分满足</h3>
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
              <h3 className="text-sm font-semibold text-career-ink">性格适配点</h3>
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
          <p className="mt-1 text-sm text-career-muted">差距用于制定行动,不用于否定当前背景;按时间窗口安排。</p>

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
              <h3 className="text-sm font-semibold text-career-ink">可能被问的问题</h3>
              <ul className="mt-2 divide-y divide-career-line/60">
                {(position.howToPrepare.timeline?.length ? position.howToPrepare.timeline : ['请说明你最能证明岗位能力的项目']).map((item) => <li key={item} className="py-2 text-sm text-career-ink">{item}</li>)}
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
  return Array.from(skills).some((skill) => normalized.includes(skill) || skill.includes(normalized));
}
