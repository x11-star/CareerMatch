import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Share2, FileDown, ShieldCheck, Sparkles, MapPin, DollarSign, Star, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react';
import { Position, ResumeData, PersonalityResult } from '../types';
import { useAuth } from '../context/AuthContext';

interface PositionDetailPageProps {
  position: Position;
  onBack: () => void;
  onOpenModal: (modalType: 'download' | 'share' | null) => void;
  resumeData?: ResumeData;
  personalityResult?: PersonalityResult | null;
}

export default function PositionDetailPage({ position, onBack, onOpenModal, resumeData, personalityResult }: PositionDetailPageProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAiAnalysisOpen, setIsAiAnalysisOpen] = useState(true);

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
          console.warn("Failed to parse cached match, re-fetching:", e);
        }
      }

      try {
        const response = await fetch('/api/match-position', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(user && !user.isGuest
            ? { positionId: position.id }
            : { resumeData, personalityResult, position }),
        });

        if (!response.ok) {
          throw new Error(await parseMatchApiError(response));
        }

        const data = await response.json();
        if (active) {
          setMatchResult(data);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } catch (err: any) {
        console.error("Failed to run AI match:", err);
        if (active) {
          setMatchError(err.message || '获取AI相性匹配评估失败');
        }
      } finally {
        if (active) {
          setIsLoadingMatch(false);
        }
      }
    }

    fetchMatch();
    return () => {
      active = false;
    };
  }, [user, position.id, resumeData, personalityResult]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top action bar */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> 返回推荐结果
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              isFavorite 
                ? 'bg-red-50 border-red-200 text-red-500' 
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
          </button>
          <button
            onClick={() => onOpenModal('share')}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenModal('download')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            <FileDown className="w-4 h-4" /> 下载报告
          </button>
        </div>
      </div>

      {/* Main Header Block */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
              position.type === 'state-owned' 
                ? 'bg-purple-100 text-purple-700 border border-purple-200/40' 
                : 'bg-blue-100 text-blue-700 border border-blue-200/40'
            }`}>
              {position.type === 'state-owned' ? '央国企' : '互联网大厂'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 mt-2">
              {position.title}
            </h1>
            <p className="text-sm font-semibold text-slate-600 mt-1">
              {position.company} · 工程技术类与关键职能部门
            </p>
          </div>
          <div className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 text-center shrink-0">
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">综合匹配度</span>
            <span className="text-3xl font-black font-display text-blue-600">
              {isLoadingMatch ? (
                <span className="animate-pulse">...</span>
              ) : (
                `${matchResult?.overallMatch ?? position.overallMatch}%`
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-xs text-slate-500 font-semibold pt-4 border-t border-slate-100">
          <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-400" /> {position.city}</span>
          <span className="flex items-center gap-1 text-amber-600"><DollarSign className="w-4 h-4" /> {position.salaryRange}</span>
          <span className="flex items-center gap-0.5 text-amber-400">
            评级：
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < position.difficultyRating ? 'fill-amber-400' : 'text-slate-200'}`} />
            ))}
          </span>
        </div>
      </div>

      {/* Matching Score Breakdown */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs mb-8">
        <h3 className="text-sm font-bold text-slate-900 border-l-4 border-blue-600 pl-2 mb-6">
          你的双引擎相性指标
        </h3>

        {matchError && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            {matchError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4">
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
              <span>📄 简历技能硬匹配</span>
              <span className="text-blue-600">
                {isLoadingMatch ? '...' : `${matchResult?.resumeMatch ?? position.resumeMatch}%`}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                style={{ width: `${isLoadingMatch ? 30 : (matchResult?.resumeMatch ?? position.resumeMatch)}%` }} 
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 min-h-[40px]">
              {isLoadingMatch ? (
                <span className="flex items-center gap-1 animate-pulse"><RotateCw className="w-3 h-3 animate-spin text-blue-500" /> AI正在深度计算简历与岗位适配度...</span>
              ) : (
                matchResult?.resumeMatchExplanation ?? `基于您的${resumeData?.school || '清华大学计算机专业'}、实习及技术栈与该岗位的硬性技术适配契合度评估。`
              )}
            </p>
          </div>

          <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4">
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
              <span>🧠 职业性格软匹配</span>
              <span className="text-emerald-600">
                {isLoadingMatch ? '...' : `${matchResult?.personalityMatch ?? position.personalityMatch}%`}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-600 rounded-full transition-all duration-500" 
                style={{ width: `${isLoadingMatch ? 30 : (matchResult?.personalityMatch ?? position.personalityMatch)}%` }} 
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 min-h-[40px]">
              {isLoadingMatch ? (
                <span className="flex items-center gap-1 animate-pulse"><RotateCw className="w-3 h-3 animate-spin text-emerald-500" /> AI正在比对性格特质与企业文化...</span>
              ) : (
                matchResult?.personalityMatchExplanation ?? `您的“${personalityResult?.typeTitle || '尽责稳定型'}”大五性格模型与该岗位特质的重合契合度评估。`
              )}
            </p>
          </div>
        </div>

        {/* AI Insight dropdown */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <button
            onClick={() => setIsAiAnalysisOpen(!isAiAnalysisOpen)}
            className="w-full flex justify-between items-center text-xs font-bold text-slate-700 hover:text-blue-600 cursor-pointer"
          >
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              AI 专家解读：为什么我是该职位的卓越候选人？
            </span>
            <span>{isAiAnalysisOpen ? '收起 ▲' : '展开 ▼'}</span>
          </button>

          {isAiAnalysisOpen && (
            <div className="mt-3 bg-blue-50/40 border border-blue-100/50 rounded-xl p-4 text-xs text-slate-600 leading-relaxed min-h-[60px] flex items-center">
              {isLoadingMatch ? (
                <div className="flex items-center gap-2 text-blue-600 font-bold animate-pulse py-2">
                  <RotateCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>精准双引擎 AI 正在深度生成您的专属岗位分析报告...</span>
                </div>
              ) : (
                matchResult?.whyExcellent ?? (
                  `您有扎实的项目技术累积，对岗位核心概念有良好理解。同时在性格测试上展现出优异特征，这种品质在目标单位中能转化为优秀的长期坚守与业务突破价值。`
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Job specs */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs mb-8 space-y-8">
        {/* Summary */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-400 pl-2 mb-3">
            📋 岗位概述
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {position.summary}
          </p>
        </div>

        {/* Responsibilities */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-400 pl-2 mb-3">
            🎯 核心职责
          </h3>
          <ul className="space-y-2">
            {position.responsibilities.map((resp, i) => (
              <li key={i} className="text-sm text-slate-600 flex gap-2">
                <span className="text-blue-500 font-semibold">•</span>
                <span>{resp}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Requirements */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-400 pl-2 mb-3">
            🛠️ 硬核心技能要求
          </h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {position.requirements.map((req, i) => (
              <span key={i} className="px-2.5 py-1 bg-slate-100 border border-slate-200/50 text-slate-700 text-xs font-semibold rounded-lg">
                {req}
              </span>
            ))}
          </div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">软实力素质偏好</h4>
          <ul className="space-y-2">
            {position.softSkills.map((soft, i) => (
              <li key={i} className="text-sm text-slate-600 flex gap-2">
                <span className="text-emerald-500 font-semibold">✓</span>
                <span>{soft}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Salary Reference */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-400 pl-2 mb-3">
            💰 薪资与核心福利参考
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed bg-amber-50/30 border border-amber-100/50 p-4 rounded-xl">
            {position.salaryDetail}
          </p>
        </div>

        {/* Career Path */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-400 pl-2 mb-4">
            📈 职业发展路径
          </h3>
          <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-5">
            {position.careerPath.map((pathItem, i) => {
              const [role, duration] = pathItem.split('：');
              return (
                <div key={i} className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                  <div className="text-sm font-bold text-slate-800">{role}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{duration}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Suitability */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-400 pl-2 mb-3">
            🧩 适配性格特质
          </h3>
          <div className="flex flex-wrap gap-2">
            {position.fitPersonality.map((p, i) => (
              <span key={i} className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Sector Comparison */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-400 pl-2 mb-3">
            📊 赛道比对分析（央国企 vs 互联网）
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {position.type === 'state-owned' 
              ? '【央国企同类岗位】：相比于互联网大厂，本岗位初期薪资可能较为平缓，但是极高稳定性与低淘汰焦虑不可多得。完整的福利和落户机制极具综合价值，非常适合注重生活质量和长期安稳的同学。'
              : '【互联网同类岗位】：高挑战，高起薪，技术选型极快。适合崇尚极速成长，在敏捷、扁平的企业文化中自如游弋的同学。但由于没有编制，通常需要具备敏捷的职业转换心态。'}
          </p>
        </div>

        {/* How to prepare */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-400 pl-2 mb-4">
            📝 如何成功上岸（求职指南）
          </h3>
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">校招关键时间线</h4>
              <div className="space-y-1.5 text-xs text-slate-700">
                {position.howToPrepare.timeline.map((line, i) => (
                  <div key={i} className="flex gap-1">
                    <span className="text-blue-500">•</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">笔试考察科目</h4>
                <p className="text-slate-600 leading-relaxed">{position.howToPrepare.exam}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">面试重点提示</h4>
                <p className="text-slate-600 leading-relaxed">{position.howToPrepare.interview}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
