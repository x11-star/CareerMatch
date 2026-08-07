import React from 'react';
import { ArrowRight, BrainCircuit, CheckCircle2, FileText, Landmark, Laptop, ShieldCheck, Target } from 'lucide-react';
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
      <section className="bg-career-bg px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-career-primary uppercase">Career diagnosis file</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-career-ink sm:text-5xl lg:text-6xl">
              把简历和测评变成一份岗位诊断报告
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-career-muted sm:text-lg">
              上传简历，完成职业测评，系统会基于岗位要求生成匹配结论、差距清单和补救建议。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                id="landing-cta-primary"
                onClick={() => onNavigate('upload')}
                className="rounded-2xl bg-career-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              >
                开始诊断
              </button>
              <button
                id="landing-cta-secondary"
                onClick={() => onNavigate('browser')}
                className="rounded-2xl border border-career-line bg-career-surface px-6 py-3 text-sm font-semibold text-career-ink transition-colors hover:bg-career-surface-muted"
              >
                先浏览岗位库
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-career-line bg-career-surface p-6 shadow-xs">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-career-muted">岗位诊断报告</p>
                <h2 className="mt-1 text-xl font-semibold text-career-ink">后端开发工程师 · 诊断摘录</h2>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="rounded-2xl bg-career-success-soft p-4">
                  <p className="font-semibold text-career-ink">结论：推荐投递</p>
                  <p className="mt-1 text-xs leading-5 text-career-muted">项目经历接近岗位要求，但需要补充工程化证据。</p>
                </div>
                <div className="rounded-2xl bg-career-surface-muted p-4">
                  <p className="font-semibold text-career-ink">硬条件</p>
                  <p className="mt-1 text-xs leading-5 text-career-muted">TypeScript、Node.js、数据库基础较匹配。</p>
                </div>
                <div className="rounded-2xl bg-career-warning-soft p-4">
                  <p className="font-semibold text-career-ink">下一步</p>
                  <p className="mt-1 text-xs leading-5 text-career-muted">投递前补齐项目复盘、接口设计和缓存问题准备。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-career-line bg-career-surface px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-career-primary uppercase">Diagnosis path</p>
            <h2 className="mt-2 text-2xl font-semibold text-career-ink sm:text-3xl">三步形成你的求职诊断档案</h2>
            <p className="mt-3 text-sm leading-6 text-career-muted">流程围绕材料采集、能力画像和岗位诊断展开，每一步都说明真实状态和下一步行动。</p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: FileText, step: '01', title: '上传简历', description: '识别教育背景、技能、项目和目标城市，形成可编辑的材料档案。' },
              { icon: BrainCircuit, step: '02', title: '完成测评', description: '补充工作偏好、协作方式和职业兴趣，作为岗位环境判断依据。' },
              { icon: Target, step: '03', title: '获得诊断', description: '查看推荐方向、岗位匹配、当前差距和投递前准备建议。' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="rounded-3xl border border-career-line bg-career-bg p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-career-primary-soft text-career-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-career-muted">{item.step}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-career-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-career-muted">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-career-bg px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-career-primary uppercase">Credibility boundaries</p>
            <h2 className="mt-2 text-2xl font-semibold text-career-ink sm:text-3xl">可信边界比营销承诺更重要</h2>
            <p className="mt-3 text-sm leading-6 text-career-muted">精准职达不会用假数据、假成功或未实现能力包装诊断结果。</p>
          </div>
          <div className="grid gap-3">
            {[
              { title: '真实 AI 才出结果', description: '未配置 AI Key 时提示配置缺失，不使用假结果。' },
              { title: '隐私边界清楚', description: '游客数据保存在本机，登录后保存到账号。' },
              { title: '低成本本地优先', description: '本地 OCR、开发验证码、本机数据库，后续可迁移上线。' },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 rounded-2xl border border-career-line bg-career-surface p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-career-primary" />
                <div>
                  <p className="text-sm font-semibold text-career-ink">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-career-muted">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-career-line bg-career-surface px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-career-primary uppercase">Position scope</p>
              <h2 className="mt-2 text-2xl font-semibold text-career-ink sm:text-3xl">岗位范围来自当前岗位库</h2>
              <p className="mt-3 text-sm leading-6 text-career-muted">岗位数量只显示真实加载的数据；暂无数据时不使用营销式占位数字。</p>
            </div>
            <button onClick={() => onNavigate('browser')} className="inline-flex items-center gap-2 rounded-2xl border border-career-line bg-career-bg px-4 py-2 text-sm font-semibold text-career-ink hover:bg-career-surface-muted">
              查看岗位库 <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <PositionScopeCard
              icon={<Landmark className="h-5 w-5" />}
              title="央国企"
              description="关注稳定流程、公共服务、金融科技、电力通信和综合管理等方向。"
              count={soeCount}
              hasData={hasPositionData}
              bullets={soeBullets}
              onNavigate={() => onNavigate('browser')}
            />
            <PositionScopeCard
              icon={<Laptop className="h-5 w-5" />}
              title="互联网"
              description="关注产品迭代、工程研发、数据分析、内容社区和高成长业务岗位。"
              count={internetCount}
              hasData={hasPositionData}
              bullets={internetBullets}
              onNavigate={() => onNavigate('browser')}
            />
          </div>
        </div>
      </section>

      <footer className="bg-career-bg px-4 py-10 text-sm text-career-muted sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-career-line pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-career-primary" />
            <span className="font-semibold text-career-ink">精准职达</span>
            <span className="text-xs">© 2026 大学生求职诊断工具</span>
          </div>
          <div className="flex gap-5 text-xs">
            <span>隐私优先</span>
            <span>真实边界</span>
            <span>诊断导向</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function buildPositionBullets(positions: Position[]) {
  return positions.slice(0, 4).map((position) => `${position.company} · ${position.title}`);
}

function PositionScopeCard({
  icon,
  title,
  description,
  count,
  hasData,
  bullets,
  onNavigate,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
  hasData: boolean;
  bullets: string[];
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-career-line bg-career-bg p-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-career-primary-soft text-career-primary">{icon}</div>
          <div>
            <h3 className="text-lg font-semibold text-career-ink">{title}</h3>
            <p className="text-xs text-career-muted">{hasData ? `当前岗位库 ${count} 个岗位` : '岗位库加载中或暂无数据'}</p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-career-muted">{description}</p>
        <div className="mt-5 grid gap-2 rounded-2xl bg-career-surface p-4 text-xs text-career-muted">
          {bullets.length > 0 ? (
            bullets.map((bullet) => (
              <div key={bullet} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-career-success" />
                <span className="truncate">{bullet}</span>
              </div>
            ))
          ) : (
            <p>岗位库加载中或暂无数据</p>
          )}
        </div>
      </div>
      <button onClick={onNavigate} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-career-primary hover:text-primary-700">
        前往探索岗位库 <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
