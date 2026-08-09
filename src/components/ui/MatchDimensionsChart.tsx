import React from 'react';

/**
 * MatchDimensionsChart — 3 维匹配度横向条形图 + 数据表 a11y fallback。
 *
 * 数据只有 3 个真实维度（硬条件 / 性格 / 综合），不做雷达（≤4 轴是 dataviz 反模式）。
 * 配色：三条 bar 同 navy 实色——颜色不承载身份，身份靠直接标签承载；
 * 阈值线 80/65 用 muted 虚线，数值永远可见（不只靠颜色）。
 * 降级：下方 <table> 供读屏 / 强制色彩 / 不渲染 SVG 的场景。
 */
interface MatchDimensionsChartProps {
  resumeMatch: number;
  personalityMatch: number;
  overallMatch: number;
}

interface Row {
  key: string;
  label: string;
  value: number;
}

const THRESHOLDS = [
  { value: 65, label: '谨慎' },
  { value: 80, label: '推荐' },
];

const BAR_HEIGHT = 28;
const BAR_GAP = 16;
const LABEL_WIDTH = 96;
const VALUE_WIDTH = 48;
const AXIS_LEFT = LABEL_WIDTH;
const AXIS_RIGHT_MARGIN = 16;

export default function MatchDimensionsChart({
  resumeMatch,
  personalityMatch,
  overallMatch,
}: MatchDimensionsChartProps) {
  const rows: Row[] = [
    { key: 'resume', label: '硬条件匹配', value: resumeMatch },
    { key: 'personality', label: '性格适配', value: personalityMatch },
    { key: 'overall', label: '综合匹配', value: overallMatch },
  ];

  const plotWidth = 320;
  const trackWidth = plotWidth - LABEL_WIDTH - VALUE_WIDTH - AXIS_RIGHT_MARGIN;
  const barX = AXIS_LEFT;
  const innerTop = 8;
  const totalHeight = innerTop * 2 + rows.length * BAR_HEIGHT + (rows.length - 1) * BAR_GAP;

  const xFor = (pct: number) => barX + (Math.max(0, Math.min(100, pct)) / 100) * trackWidth;

  return (
    <div>
      <div className="w-full">
        <svg
          viewBox={`0 0 ${plotWidth} ${totalHeight}`}
          className="h-auto w-full max-w-md"
          role="img"
          aria-labelledby="match-dimensions-title match-dimensions-desc"
        >
          <title id="match-dimensions-title">三维度匹配度</title>
          <desc id="match-dimensions-desc">
            硬条件匹配 {resumeMatch}%，性格适配 {personalityMatch}%，综合匹配 {overallMatch}%。推荐线 80%，谨慎线 65%。
          </desc>

          {/* 阈值线 + 阈值标签 */}
          {THRESHOLDS.map((t) => (
            <g key={t.value}>
              <line
                x1={xFor(t.value)}
                y1={innerTop - 2}
                x2={xFor(t.value)}
                y2={totalHeight - innerTop + 2}
                stroke="oklch(0.446 0.037 257)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.5"
              />
              <text
                x={xFor(t.value)}
                y={innerTop - 4}
                textAnchor="middle"
                className="fill-career-muted"
                style={{ fontSize: 9, fontWeight: 600 }}
              >
                {t.label} {t.value}
              </text>
            </g>
          ))}

          {/* 轨道 + 数据条 */}
          {rows.map((row, i) => {
            const y = innerTop + i * (BAR_HEIGHT + BAR_GAP);
            return (
              <g key={row.key}>
                {/* 轨道（recessive grid） */}
                <rect
                  x={barX}
                  y={y}
                  width={trackWidth}
                  height={BAR_HEIGHT}
                  rx="4"
                  fill="oklch(0.963 0.004 246)"
                />
                {/* 数据条 */}
                <rect
                  x={barX}
                  y={y}
                  width={Math.max(2, (Math.max(0, Math.min(100, row.value)) / 100) * trackWidth)}
                  height={BAR_HEIGHT}
                  rx="4"
                  fill="oklch(0.346 0.074 256)"
                />
                {/* 维度标签（直接标签，identity 不靠颜色） */}
                <text
                  x={LABEL_WIDTH - 8}
                  y={y + BAR_HEIGHT / 2 + 3}
                  textAnchor="end"
                  className="fill-career-ink"
                  style={{ fontSize: 11, fontWeight: 600 }}
                >
                  {row.label}
                </text>
                {/* 数值（永远可见，不只靠颜色） */}
                <text
                  x={barX + trackWidth + 6}
                  y={y + BAR_HEIGHT / 2 + 3}
                  className="fill-career-ink"
                  style={{ fontSize: 11, fontWeight: 700 }}
                >
                  {row.value}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* a11y fallback：读屏 / 强制色彩 / 不渲染 SVG 时仍可读 */}
      <table className="sr-only">
        <caption>三维度匹配度</caption>
        <thead>
          <tr>
            <th>维度</th>
            <th>匹配度</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td>{row.value}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
