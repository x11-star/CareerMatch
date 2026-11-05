import React from 'react';
import { Shield, Sparkles, ArrowRight, Share2, Compass, Check } from 'lucide-react';
import EmptyState from './ui/EmptyState';
import { PersonalityResult } from '../types';

interface AssessmentResultPageProps {
  onSeeMatches: () => void;
  onShare: () => void;
  personalityResult?: PersonalityResult | null;
  reviewOnly?: boolean;
}

export default function AssessmentResultPage({ onSeeMatches, onShare, personalityResult, reviewOnly = false }: AssessmentResultPageProps) {
  if (!personalityResult) return <div className="mx-auto max-w-4xl p-6"><EmptyState title="还没有职业测评" description="完成并保存测评后，再查看自己的结果。" action={<a href="#view=assessment">完成测评</a>} /></div>;
  const result = personalityResult;

  // Custom SVG Radar Chart Calculation (5 Dimensions)
  const dimensions = result.radarScores;
  const size = 320;
  const center = size / 2;
  const maxRadius = 100;

  // Math helper for 5-axis coordinates
  const getCoordinates = (index: number, value: number) => {
    // 5 axes -> 72 degrees (1.2566 radians) apart. Start from top (index * 72 - 90 degrees)
    const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Generate web background polygons (grids)
  const gridLevels = [20, 40, 60, 80, 100];
  const gridPolygons = gridLevels.map((level) => {
    return Array.from({ length: 5 })
      .map((_, i) => {
        const { x, y } = getCoordinates(i, level);
        return `${x},${y}`;
      })
      .join(' ');
  });

  // Score Polygons
  const userPoints = dimensions.map((d, i) => getCoordinates(i, d.score));
  const userPath = userPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const avgPoints = dimensions.map((d, i) => getCoordinates(i, 70));
  const avgPath = avgPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Text placements
  const getLabelPlacement = (index: number) => {
    const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2;
    const r = maxRadius + 22; // Distance of text from center
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    
    // Text adjustments for alignment
    let textAnchor: 'middle' | 'start' | 'end' = 'middle';
    if (Math.cos(angle) > 0.1) textAnchor = 'start';
    if (Math.cos(angle) < -0.1) textAnchor = 'end';
    
    return { x, y, textAnchor };
  };

  const shortNames = ['尽责性', '情绪稳定', '宜人性', '开放性', '外向性'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {!reviewOnly && <header className="mb-6"><h1 className="text-3xl font-semibold text-career-ink">测评结果</h1><p className="mt-3 text-sm text-career-muted">测评已完成，先看看自己的工作偏好，再继续查看岗位推荐。</p><button onClick={onSeeMatches} className="mt-4 rounded-md bg-career-primary px-5 py-3 text-sm font-semibold text-white">继续查看岗位推荐</button></header>}
      <p className="mb-6 text-sm leading-6 text-career-muted">自编工作偏好探索测评：内部得分范围 40–100，中点参考 70；不是全国常模或录用概率。兴趣标签由规则推断，建议结合实际经历验证。</p>
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-career-primary-soft border border-career-primary-soft rounded-full text-career-primary text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          工作偏好整理完成
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-career-ink mb-2">
          你的性格类型：<span className="text-career-primary">{result.typeTitle}</span>
        </h2>
        <p className="text-career-muted text-sm max-w-xl mx-auto leading-relaxed">
          {result.description}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Card: Radar Chart */}
        <div className="bg-white rounded-md border border-career-line p-6 sm:p-8 flex flex-col items-center justify-center">
          <h3 className="mb-6 self-start text-sm font-semibold text-career-ink">
            大五维度自我探索
          </h3>

          {/* SVG Radar */}
          <div className="relative w-full max-w-xs aspect-square">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
              {/* Grids */}
              {gridPolygons.map((points, idx) => (
                <polygon
                  key={idx}
                  points={points}
                  fill="none"
                  stroke="#E4E7EB"
                  strokeWidth="1"
                />
              ))}

              {/* Axis lines */}
              {Array.from({ length: 5 }).map((_, i) => {
                const { x, y } = getCoordinates(i, 100);
                return (
                  <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="#E4E7EB"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                );
              })}

              {/* Peer Average Area */}
              <polygon
                points={avgPath}
                fill="rgba(148, 163, 184, 0.15)"
                stroke="#475569"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* User Score Area */}
              <polygon
                points={userPath}
                fill="rgba(37, 99, 235, 0.2)"
                stroke="#1E3A5F"
                strokeWidth="2.5"
              />

              {/* User Dots */}
              {userPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#1E3A5F"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              ))}

              {/* Labels */}
              {shortNames.map((name, i) => {
                const { x, y, textAnchor } = getLabelPlacement(i);
                return (
                  <text
                    key={i}
                    x={x}
                    y={y + 4}
                    textAnchor={textAnchor}
                    className="text-[11px] font-bold fill-slate-600"
                  >
                    {name}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-4 flex gap-6 text-xs text-career-muted font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-career-primary/20 border border-career-primary rounded-sm inline-block" />
              <span>你的得分</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-career-surface-muted border border-slate-400 border-dashed rounded-sm inline-block" />
              <span>量表中点参考（70）</span>
            </div>
          </div>
        </div>

        {/* Right Card: Holland & Industry Fit */}
        <div className="space-y-6">
          {/* Fit Progress */}
          <div className="bg-white rounded-md border border-career-line p-6">
            <h3 className="mb-4 text-sm font-semibold text-career-ink">
              工作环境偏好参考
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-career-ink mb-1.5">
                  <span className="flex items-center gap-1.5 text-career-primary">
                    稳定流程环境
                  </span>
                  <span>{result.industryFit.stateOwned}%</span>
                </div>
                <div className="h-2 w-full bg-career-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-career-primary rounded-full"
                    style={{ width: `${result.industryFit.stateOwned}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-career-ink mb-1.5">
                  <span className="flex items-center gap-1.5 text-career-primary">
                    快速变化环境
                  </span>
                  <span>{result.industryFit.internet}%</span>
                </div>
                <div className="h-2 w-full bg-career-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-career-primary rounded-full"
                    style={{ width: `${result.industryFit.internet}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Holland Interests */}
          <div className="bg-white rounded-md border border-career-line p-6">
            <div className="flex items-center gap-2 mb-3.5">
              <Compass className="w-5 h-5 text-career-primary" />
              <h3 className="text-sm font-bold text-career-ink">
                霍兰德职业兴趣代码：<span className="text-career-primary font-mono font-bold text-base">{result.hollandCode}</span>
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.hollandTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-career-surface-muted text-career-ink text-xs font-semibold rounded-lg border border-career-line/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full Width Card: AI Deep Interpretation */}
      <div className="bg-white rounded-md border border-career-line p-6 sm:p-8 mt-8">
        <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-career-ink">
          <Shield className="w-4 h-4 text-career-primary" />
          工作偏好解读
        </h3>
        <p className="text-sm text-career-ink leading-relaxed bg-career-surface-muted p-4 rounded-xl border border-career-line mb-6">
          {result.deepInterpretation.summary}
        </p>

        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">职场核心竞争优势</h4>
        <div className="space-y-3">
          {result.deepInterpretation.advantages.map((adv, idx) => (
            <div key={idx} className="flex gap-2 text-sm text-slate-800">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{adv}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      {!reviewOnly && <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          id="see-matches-btn"
          onClick={onSeeMatches}
          className="w-full sm:w-auto px-8 py-4 bg-career-primary hover:bg-career-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-200/50 transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-98 flex items-center justify-center gap-2 group"
        >
          继续查看岗位推荐
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
        <button
          id="share-personality-btn"
          onClick={onShare}
          className="w-full sm:w-auto px-6 py-4 bg-career-surface-muted hover:bg-career-surface-muted text-career-ink font-semibold rounded-xl border border-career-line transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          分享工具首页
        </button>
      </div>}
    </div>
  );
}
