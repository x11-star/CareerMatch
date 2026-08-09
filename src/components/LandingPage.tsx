import React from 'react';
import { ArrowRight, CheckCircle2, Landmark, Laptop, Target } from 'lucide-react';
import { Position } from '../types';

interface LandingPageProps {
  onNavigate: (view: string) => void;
  positions?: Position[];
}

export default function LandingPage({ onNavigate, positions = [] }: LandingPageProps) {
  const soePositions = React.useMemo(() => positions.filter((p) => p.type === 'state-owned'), [positions]);
  const internetPositions = React.useMemo(() => positions.filter((p) => p.type === 'internet'), [positions]);

  const soeCount = soePositions.length;
  const internetCount = internetPositions.length;
  const hasPositionData = positions.length > 0;

  const soeBullets = React.useMemo(() => buildPositionBullets(soePositions), [soePositions]);
  const internetBullets = React.useMemo(() => buildPositionBullets(internetPositions), [internetPositions]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-career-bg text-career-ink">
      {/* Hero:单栏左对齐,大标题 + 真实诊断片段(非预览卡片) */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="mb-5 text-xs font-semibold tracking-[0.18em] text-career-primary uppercase">Career diagnosis file</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-career-ink sm:text-5xl lg:text-6xl" style={{ textWrap: 'balance' }}>
            把简历和测评变成一份岗位诊断报告
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-career-muted sm:text-lg">
            上传简历,完成职业测评,系统会基于岗位要求生成匹配结论、差距清单和补救建议。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              id="landing-cta-primary"
              onClick={() => onNavigate('upload')}
              className="rounded-md bg-career-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              开始诊断
            </button>
            <button
              id="landing-cta-secondary"
              onClick={() => onNavigate('browser')}
              className="rounded-md border border-career-line bg-career-surface px-6 py-3 text-sm font-semibold text-career-ink transition-colors hover:bg-career-surface-muted"
            >
              先浏览岗位库
            </button>
          </div>

          {/* 真实诊断片段:文档摘录,非卡片预览 */}
          <div className="mt-14 border-l border-career-primary/40 pl-6">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-career-muted uppercase">诊断报告摘录</p>
            <p className="mt-3 text-xl font-semibold leading-7 text-career-ink">
              <span className="text-3xl font-bold tabular-nums text-career-ink">82</span><span className="text-lg font-semibold text-career-muted">%</span> 推荐投递,建议补充项目证明。
            </p>
            <dl className="mt-4 divide-y divide-career-line/60 text-sm">
              <div className="flex items-baseline justify-between gap-6 py-2"><dt className="text-career-muted">硬条件匹配</dt><dd className="font-semibold tabular-nums text-career-ink">85%</dd></div>
              <div className="flex items-baseline justify-between gap-6 py-2"><dt className="text-career-muted">性格适配</dt><dd className="font-semibold tabular-nums text-career-ink">95%</dd></div>
              <div className="flex items-baseline justify-between gap-6 py-2"><dt className="text-career-muted">缺失项</dt><dd className="font-semibold text-career-ink">Spark、项目复盘</dd></div>
            </dl>
            <p className="mt-3 text-xs text-career-muted">示例数据;你的报告在你上传简历并完成测评后生成。</p>
          </div>
        </div>
      </section>

      {/* 三步:纵向编号叙事,非并排卡 */}
      <section className="border-t border-career-line px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-career-primary uppercase">Diagnosis path</p>
          <h2 className="mt-2 text-2xl font-semibold text-career-ink sm:text-3xl">三步形成你的求职诊断档案</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-career-muted">流程围绕材料采集、能力画像和岗位诊断展开,每一步都说明真实状态和下一步行动。</p>

          <ol className="mt-10 divide-y divide-career-line/60">
            <li className="grid gap-2 py-6 sm:grid-cols-[auto_1fr] sm:gap-8">
              <span className="font-mono text-3xl font-bold text-career-line tabular-nums sm:text-4xl">01</span>
              <div>
                <h3 className="text-lg font-semibold text-career-ink">上传简历</h3>
                <p className="mt-1.5 text-sm leading-7 text-career-muted">识别教育背景、技能、项目和目标城市,形成可编辑的材料档案。</p>
              </div>
            </li>
            <li className="grid gap-2 py-6 sm:grid-cols-[auto_1fr] sm:gap-8">
              <span className="font-mono text-3xl font-bold text-career-line tabular-nums sm:text-4xl">02</span>
              <div>
                <h3 className="text-lg font-semibold text-career-ink">完成测评</h3>
                <p className="mt-1.5 text-sm leading-7 text-career-muted">补充工作偏好、协作方式和职业兴趣,作为岗位环境判断依据。</p>
              </div>
            </li>
            <li className="grid gap-2 py-6 sm:grid-cols-[auto_1fr] sm:gap-8">
              <span className="font-mono text-3xl font-bold text-career-line tabular-nums sm:text-4xl">03</span>
              <div>
                <h3 className="text-lg font-semibold text-career-ink">获得诊断</h3>
                <p className="mt-1.5 text-sm leading-7 text-career-muted">查看推荐方向、岗位匹配、当前差距和投递前准备建议。</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* 岗位范围:两段文字 + 内联列表,非并排卡 */}
      <section className="border-t border-career-line px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-career-primary uppercase">Position scope</p>
          <h2 className="mt-2 text-2xl font-semibold text-career-ink sm:text-3xl">岗位范围来自当前岗位库</h2>
          <div className="mt-2 flex justify-end">
            <button onClick={() => onNavigate('browser')} className="inline-flex items-center gap-2 text-sm font-semibold text-career-primary hover:text-primary-700">
              查看岗位库 <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 grid gap-10 md:grid-cols-2">
            <div>
              <div className="flex items-baseline gap-3">
                <Landmark className="h-5 w-5 text-career-primary" />
                <h3 className="text-lg font-semibold text-career-ink">央国企</h3>
                <span className="text-xs text-career-muted">{hasPositionData ? `${soeCount} 个岗位` : '加载中'}</span>
              </div>
              <p className="mt-2 text-sm leading-7 text-career-muted">关注稳定流程、公共服务、金融科技、电力通信和综合管理等方向。</p>
              {bulletsOrPlaceholder(soeBullets)}
            </div>
            <div>
              <div className="flex items-baseline gap-3">
                <Laptop className="h-5 w-5 text-career-primary" />
                <h3 className="text-lg font-semibold text-career-ink">互联网</h3>
                <span className="text-xs text-career-muted">{hasPositionData ? `${internetCount} 个岗位` : '加载中'}</span>
              </div>
              <p className="mt-2 text-sm leading-7 text-career-muted">关注产品迭代、工程研发、数据分析、内容社区和高成长业务岗位。</p>
              {bulletsOrPlaceholder(internetBullets)}
            </div>
          </div>
        </div>
      </section>

      <footer className="px-4 py-10 text-sm text-career-muted sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center gap-2 border-t border-career-line pt-6">
          <Target className="h-5 w-5 text-career-primary" />
          <span className="font-semibold text-career-ink">精准职达</span>
          <span className="text-xs">© 2026 大学生求职诊断工具</span>
        </div>
      </footer>
    </div>
  );
}

function bulletsOrPlaceholder(bullets: string[]) {
  if (bullets.length === 0) {
    return <p className="mt-4 text-xs text-career-muted">岗位库加载中或暂无数据</p>;
  }
  return (
    <ul className="mt-4 space-y-1.5 text-sm text-career-ink">
      {bullets.map((bullet) => (
        <li key={bullet} className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-career-success" />
          <span className="truncate">{bullet}</span>
        </li>
      ))}
    </ul>
  );
}

function buildPositionBullets(positions: Position[]) {
  return positions.slice(0, 4).map((position) => `${position.company} · ${position.title}`);
}

