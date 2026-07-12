import React from 'react';
import { Shield, Award, Sparkles, ArrowRight, Share2, Compass, Check } from 'lucide-react';
import { DEFAULT_PERSONALITY_RESULT } from '../data';
import { PersonalityResult } from '../types';

interface AssessmentResultPageProps {
  onSeeMatches: () => void;
  onShare: () => void;
  personalityResult?: PersonalityResult | null;
}

export default function AssessmentResultPage({ onSeeMatches, onShare, personalityResult }: AssessmentResultPageProps) {
  const result = personalityResult || DEFAULT_PERSONALITY_RESULT;

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

  const avgPoints = dimensions.map((d, i) => getCoordinates(i, d.avg));
  const avgPath = avgPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Text placements
  const getLabelPlacement = (index: number) => {
    const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2;
    const r = maxRadius + 22; // Distance of text from center
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    
    // Text adjustments for alignment
    let textAnchor = 'middle';
    if (Math.cos(angle) > 0.1) textAnchor = 'start';
    if (Math.cos(angle) < -0.1) textAnchor = 'end';
    
    return { x, y, textAnchor };
  };

  const shortNames = ['尽责性', '情绪稳定', '宜人性', '开放性', '外向性'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          科学测评分析完成
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 mb-2">
          你的性格类型：<span className="text-blue-600">{result.typeTitle}</span>
        </h2>
        <p className="text-slate-500 text-sm max-w-xl mx-auto leading-relaxed">
          {result.description}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Card: Radar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col items-center justify-center">
          <h3 className="text-sm font-bold text-slate-900 border-l-4 border-blue-600 pl-2 mb-6 self-start">
            大五人格科学量表
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
                  stroke="#E2E8F0"
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
                    stroke="#E2E8F0"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                );
              })}

              {/* Peer Average Area */}
              <polygon
                points={avgPath}
                fill="rgba(148, 163, 184, 0.15)"
                stroke="#94A3B8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* User Score Area */}
              <polygon
                points={userPath}
                fill="rgba(37, 99, 235, 0.2)"
                stroke="#2563EB"
                strokeWidth="2.5"
              />

              {/* User Dots */}
              {userPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#2563EB"
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
          <div className="mt-4 flex gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-blue-500/20 border border-blue-600 rounded-sm inline-block" />
              <span>你的得分</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-slate-100 border border-slate-400 border-dashed rounded-sm inline-block" />
              <span>全国同龄平均</span>
            </div>
          </div>
        </div>

        {/* Right Card: Holland & Industry Fit */}
        <div className="space-y-6">
          {/* Fit Progress */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 border-l-4 border-blue-600 pl-2 mb-4">
              两大求职赛道适配度
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5 text-purple-700">
                    🏛️ 央国企适配度
                  </span>
                  <span>{result.industryFit.stateOwned}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${result.industryFit.stateOwned}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5 text-blue-600">
                    💻 互联网适配度
                  </span>
                  <span>{result.industryFit.internet}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${result.industryFit.internet}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Holland Interests */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3.5">
              <Compass className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                霍兰德职业兴趣代码：<span className="text-blue-600 font-mono font-bold text-base">{result.hollandCode}</span>
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.hollandTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full Width Card: AI Deep Interpretation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs mt-8">
        <h3 className="text-sm font-bold text-slate-900 border-l-4 border-blue-600 pl-2 mb-4 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-blue-600" />
          AI 深度人格与求职性向解读
        </h3>
        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
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
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          id="see-matches-btn"
          onClick={onSeeMatches}
          className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-200/50 transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-98 flex items-center justify-center gap-2 group"
        >
          查看匹配岗位推荐
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
        <button
          id="share-personality-btn"
          onClick={onShare}
          className="w-full sm:w-auto px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          分享性格画像
        </button>
      </div>
    </div>
  );
}
