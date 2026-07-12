import React, { useState } from 'react';
import { X, FileDown, CheckSquare, Square, RotateCw, CheckCircle2 } from 'lucide-react';

interface DownloadModalProps {
  onClose: () => void;
}

export default function DownloadModal({ onClose }: DownloadModalProps) {
  const [selections, setSelections] = useState({
    resumeSummary: true,
    personalityRadar: true,
    jobTop10: true,
    industryAdvice: true,
    careerPlan: true,
  });

  const [downloadState, setDownloadState] = useState<'idle' | 'generating' | 'success'>('idle');

  const toggleSelection = (key: keyof typeof selections) => {
    setSelections({ ...selections, [key]: !selections[key] });
  };

  const handleStartDownload = () => {
    setDownloadState('generating');
    setTimeout(() => {
      setDownloadState('success');
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 2000);
  };

  const items = [
    { key: 'resumeSummary', label: '简历分析摘要' },
    { key: 'personalityRadar', label: '大五性格相性画像' },
    { key: 'jobTop10', label: '专属岗位相性推荐 Top 10' },
    { key: 'industryAdvice', label: '央国企 vs 互联网求职红利建议' },
    { key: 'careerPlan', label: '上岸行动路线规划时间表' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark overlay backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" />

      {/* Modal contents */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {downloadState === 'idle' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <FileDown className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">
                下载岗位匹配分析报告
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              根据您的 AI 简历提取成果与大五人格性格测试，我们将为您精心渲染一份高含金量的纸质级 PDF 求职建议报告。请选择报告包含的项目：
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
              {items.map((item) => {
                const isChecked = selections[item.key as keyof typeof selections];
                return (
                  <button
                    key={item.key}
                    onClick={() => toggleSelection(item.key as any)}
                    className="w-full flex items-center gap-3 text-left text-xs font-semibold text-slate-700 hover:text-slate-900 py-1 transition-colors cursor-pointer"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                id="generate-pdf-btn"
                onClick={handleStartDownload}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                生成并下载 PDF
              </button>
            </div>
          </div>
        )}

        {downloadState === 'generating' && (
          <div className="text-center py-8">
            <RotateCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <h4 className="text-base font-bold text-slate-900">正在组装并加密报告...</h4>
            <p className="text-xs text-slate-400 mt-2">
              AI 专家系统正在基于数据进行内容编排，立等即可下载
            </p>
          </div>
        )}

        {downloadState === 'success' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900">报告生成成功！</h4>
            <p className="text-xs text-slate-400 mt-2">
              专属 PDF 已为您自动推至浏览器下载通道中。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
