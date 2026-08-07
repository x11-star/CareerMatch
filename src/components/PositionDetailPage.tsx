import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Heart, RotateCw } from 'lucide-react';
import { Position, ResumeData, PersonalityResult } from '../types';
import { useAuth } from '../context/AuthContext';
import PageHeader from './ui/PageHeader';
import SectionPanel from './ui/SectionPanel';
import StatusBanner from './ui/StatusBanner';
import DiagnosticBlock from './ui/DiagnosticBlock';

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
      return 'AI 匹配服务未配置：请在 .env 中填写 ZHIPU_API_KEY 或 DEEPSEEK_API_KEY 后重启服务。';
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
        primaryAction={<button onClick={() => onOpenModal('share')} className="rounded-2xl border border-career-line bg-career-surface px-4 py-2 text-sm font-semibold text-career-ink">复制分享链接</button>}
        secondaryAction={<button onClick={() => setIsFavorite(!isFavorite)} className="rounded-2xl border border-career-line bg-career-surface px-4 py-2 text-sm font-semibold text-career-ink"><Heart className={`mr-1 inline h-4 w-4 ${isFavorite ? 'fill-career-danger text-career-danger' : ''}`} />{isFavorite ? '已收藏' : '收藏岗位'}</button>}
        meta={<div className="flex flex-wrap gap-2 text-xs text-career-muted"><span>{position.type === 'state-owned' ? '央国企' : '互联网'}</span><span>·</span><span>{position.salaryRange}</span><span>·</span><span>难度 {position.difficultyRating}/5</span></div>}
      />

      <div className="space-y-6">
        {isLoadingMatch && <StatusBanner tone="pending" title="正在生成 AI 匹配解释" description="系统正在比对简历、测评和岗位要求；若 AI Key 未配置，将显示可操作错误。" />}
        {matchError && <StatusBanner tone="warning" title="AI 诊断解释暂不可用" description={matchError} />}

        <div className="grid gap-4 md:grid-cols-4">
          <DiagnosticBlock label="诊断结论" title={`${diagnosisLabel(score)} · ${score}%`} tone={scoreTone}>{diagnosisSentence(score)}</DiagnosticBlock>
          <DiagnosticBlock label="硬条件匹配" title={`${matchResult?.resumeMatch ?? position.resumeMatch}%`} tone={diagnosisTone(matchResult?.resumeMatch ?? position.resumeMatch)}>{matchResult?.resumeMatchExplanation || '基于简历技能、项目和岗位硬性要求计算。'}</DiagnosticBlock>
          <DiagnosticBlock label="性格适配" title={`${matchResult?.personalityMatch ?? position.personalityMatch}%`} tone={diagnosisTone(matchResult?.personalityMatch ?? position.personalityMatch)}>{matchResult?.personalityMatchExplanation || '基于职业测评和岗位环境要求判断。'}</DiagnosticBlock>
          <DiagnosticBlock label="准备优先级" title={missingRequirements.length > 0 ? '先补关键差距' : '补充证明材料'} tone={missingRequirements.length > 0 ? 'warning' : 'success'}>{missingRequirements.slice(0, 2).join('、') || '重点整理项目证据和面试表达。'}</DiagnosticBlock>
        </div>

        <SectionPanel title="证据摘要" description="诊断依据来自岗位要求、你的简历材料和职业测评；分数不是唯一结论。">
          <div className="grid gap-4 md:grid-cols-3">
            <EvidenceCard title="岗位概述" items={[position.summary]} />
            <EvidenceCard title="薪资与类型" items={[position.salaryRange, position.type === 'state-owned' ? '央国企岗位' : '互联网岗位']} />
            <EvidenceCard title="AI 专家解读" items={[matchResult?.whyExcellent || 'AI 解释将在服务可用时生成；当前可先查看结构化差距和准备建议。']} />
          </div>
        </SectionPanel>

        <SectionPanel title="硬条件匹配" description="把已满足、待证明和缺失项分开看，方便投递前补材料。">
          <div className="grid gap-4 md:grid-cols-3">
            <EvidenceCard title="已满足" items={metRequirements.length > 0 ? metRequirements : ['暂无可直接确认的硬技能，请补充简历技能或项目证据。']} />
            <EvidenceCard title="部分满足" items={position.softSkills.slice(0, 3)} />
            <EvidenceCard title="缺失 / 待证明" items={missingRequirements.slice(0, 4).length > 0 ? missingRequirements.slice(0, 4) : ['请准备能证明这些能力的项目复盘。']} />
          </div>
        </SectionPanel>

        <SectionPanel title="性格适配" description="评估岗位环境、组织节奏和协作方式是否适合你。">
          <div className="grid gap-4 md:grid-cols-2">
            <EvidenceCard title="适配点" items={position.fitPersonality.length > 0 ? position.fitPersonality : [personalityResult?.typeTitle || '完成测评后生成更明确的适配点。']} />
            <EvidenceCard title="风险点" items={[personalityResult ? '如果岗位节奏或反馈密度与你的测评倾向不同，需要提前准备适应策略。' : '还没有职业测评，暂不能判断岗位环境风险。']} />
          </div>
        </SectionPanel>

        <SectionPanel title="差距清单" description="差距用于制定行动，不用于否定当前背景。">
          <div className="grid gap-4 md:grid-cols-4">
            <DiagnosticBlock label="技能差距" title="需要补证明" tone="warning">{missingRequirements.slice(0, 3).join('、') || '技能项基本覆盖，但仍需补充项目证据。'}</DiagnosticBlock>
            <DiagnosticBlock label="经历差距" title={hasExperience ? '复盘深度待补' : '经历材料不足'} tone="warning">{hasExperience ? '把实习或项目整理成 STAR 结构，突出你的具体贡献。' : '暂无实习或项目材料，请补充课程项目、竞赛或实践经历。'}</DiagnosticBlock>
            <DiagnosticBlock label="表达差距" title="项目表达" tone="neutral">准备项目背景、职责、难点、方案和结果，避免只罗列技术栈。</DiagnosticBlock>
            <DiagnosticBlock label="行业理解差距" title="业务理解" tone="neutral">投递前准备公司业务、岗位所属部门和近期行业变化。</DiagnosticBlock>
          </div>
        </SectionPanel>

        <SectionPanel title="补救建议" description="按时间窗口安排，先做最影响投递可信度的事情。">
          <div className="grid gap-4 md:grid-cols-3">
            <EvidenceCard title="7 天可做" items={['补齐岗位要求中最缺的 1-2 个技能证明。', '把一个项目整理成 STAR 复盘稿。', '准备 3 个和岗位职责相关的问题。']} />
            <EvidenceCard title="30 天可做" items={['补一个小型项目或案例，覆盖岗位核心技术。', '针对目标岗位更新简历摘要和项目描述。', '完成 2-3 次模拟面试复盘。']} />
            <EvidenceCard title="投递前必须补" items={['确认简历中没有空泛形容词。', '准备岗位要求逐条对应证据。', '梳理公司业务和部门方向。']} />
          </div>
        </SectionPanel>

        <SectionPanel title="面试准备" description="准备内容来自岗位数据，缺失时使用通用但真实的求职准备建议。">
          <div className="grid gap-4 md:grid-cols-3">
            <EvidenceCard title="可能被问的问题" items={position.howToPrepare.timeline?.length ? position.howToPrepare.timeline : ['请说明你最能证明岗位能力的项目。']} />
            <EvidenceCard title="笔试或技能准备" items={[position.howToPrepare.exam || '复习岗位要求中的基础知识和常见题型。']} />
            <EvidenceCard title="项目复盘重点" items={[position.howToPrepare.interview || '准备项目中的难点、取舍、指标和复盘。']} />
          </div>
        </SectionPanel>

        <SectionPanel title="导出与分享边界" description="复制链接是真功能；PDF 导出不在第五阶段伪装完成。">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-career-muted">PDF 导出第六阶段开放。当前阶段先保证在线诊断报告真实、可读、可复查。</p>
            <button disabled className="rounded-2xl border border-career-line bg-career-surface-muted px-4 py-2 text-sm font-semibold text-career-muted">PDF 导出第六阶段开放</button>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}

function resumeSkillsHasRequirement(skills: Set<string>, requirement: string) {
  const normalized = requirement.toLowerCase();
  return Array.from(skills).some((skill) => normalized.includes(skill) || skill.includes(normalized));
}

function EvidenceCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-career-bg p-4">
      <h3 className="text-sm font-semibold text-career-ink">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-career-muted">
        {items.map((item, index) => <li key={`${title}-${index}`}>• {item}</li>)}
      </ul>
    </div>
  );
}
