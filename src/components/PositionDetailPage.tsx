import React, { useState } from 'react';
import { ArrowLeft, Heart, Share2, FileDown, ShieldCheck, Sparkles, MapPin, DollarSign, Star, Send, Bot, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { Position } from '../types';

interface PositionDetailPageProps {
  position: Position;
  onBack: () => void;
  onOpenModal: (modalType: 'download' | 'share' | null) => void;
}

export default function PositionDetailPage({ position, onBack, onOpenModal }: PositionDetailPageProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAiAnalysisOpen, setIsAiAnalysisOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: `你好！我是「精准职达」的职业导师 AI。关于 ${position.company} 的「${position.title}」岗位，你有什么想了解的吗？无论是备考教材、工作日常节奏、还是福利细节，我都能帮你解答。`
    }
  ]);
  const [inputValue, setInputValue] = useState('');

  const preLoadedQuestions = [
    '笔试考试推荐看哪些书？',
    '3-5年的真实成长路径和薪资？',
    '国企和互联网同类岗的体验差异？'
  ];

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    // Add User Message
    const updatedMessages = [...chatMessages, { sender: 'user', text }];
    setChatMessages(updatedMessages);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      let aiResponseText = '';
      if (text.includes('书') || text.includes('笔试') || text.includes('准备')) {
        aiResponseText = `对于【${position.title}】的笔试：\n1. 推荐教材：国家电网考试大纲推荐教材，重点复习《电力系统分析》、《高电压技术》、《继电保护》等理论。\n2. 题型：包括综合单选（行测）和专业客观题。建议提前3个月刷往年真题。`;
      } else if (text.includes('3-5') || text.includes('薪') || text.includes('发展') || text.includes('路径')) {
        aiResponseText = `在这个岗位：\n- 见习期（第1年）：基本年薪约 12-15万。\n- 3-5年（升为专责/中级）：年薪会稳步提升到 18-30万，并在公积金和年金上有大幅增加。\n- 发展上：作为国有单位骨干，3-5年是独立带项目/专责的爆发期。`;
      } else if (text.includes('差异') || text.includes('互联网') || text.includes('对比')) {
        aiResponseText = `【${position.company}】属于大型央国企。相比于互联网后端开发的高起薪，本岗位最大的优势在于：\n1. 极高的稳定性与极低的中年转行焦虑，六险二金福利全面。\n2. 节奏相比于大厂更严谨有序，极少有恶性加班，更注重流程合规与长期坚守。`;
      } else {
        aiResponseText = `【${position.title}】是一个技术门槛很高且十分核心的岗位。根据你的简历背景，你在计算机、算法和系统重构方面的优势可以很好地迁移到该岗位的数字化/电气智能化规划中。关于这个岗位的具体面试真题，您也可以查看页面中的“如何准备”版块。`;
      }

      setChatMessages((prev) => [...prev, { sender: 'ai', text: aiResponseText }]);
    }, 800);
  };

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
            <span className="text-3xl font-black font-display text-blue-600">{position.overallMatch}%</span>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4">
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
              <span>📄 简历技能硬匹配</span>
              <span className="text-blue-600">{position.resumeMatch}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${position.resumeMatch}%` }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              基于您的清华大学计算机专业、实习技能（Python/React/SQL等）与国企IT要求的契合度评估。
            </p>
          </div>

          <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4">
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
              <span>🧠 职业性格软匹配</span>
              <span className="text-emerald-600">{position.personalityMatch}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${position.personalityMatch}%` }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              您的“尽责稳定型”大五人格与该岗位对于合规性、抗压稳定性及长期坚守的要求完美重合。
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
            <div className="mt-3 bg-blue-50/40 border border-blue-100/50 rounded-xl p-4 text-xs text-slate-600 leading-relaxed">
              您在大型科技公司（字节跳动、腾讯）有过扎实的项目技术累积，对高吞吐服务和大数据有系统概念。
              同时在性格测试上展现出极其优异的【高责任心、高稳定性】，这种品质在大型国有单位具有无法被替代的极高价值：相比于流失率大的候选人，电网更倾向于培养有长期技术信念、对秩序有崇高追求的骨干。
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

      {/* AI tutor bubble (Ask AI Section) */}
      <div className="bg-linear-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold font-display">💬 智能导师在线答疑</h3>
            <p className="text-[11px] text-slate-400">实时解析关于该岗位备考及上岸的疑难问题</p>
          </div>
        </div>

        {/* Chat window */}
        <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 min-h-48 max-h-72 overflow-y-auto mb-4 space-y-4 text-xs">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'ai' && (
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div className={`p-3 rounded-2xl max-w-[80%] whitespace-pre-line leading-relaxed ${
                msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
              }`}>
                {msg.text}
              </div>
              {msg.sender === 'user' && (
                <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold shrink-0">
                  张
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pre-loaded suggestions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {preLoadedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(q)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="flex gap-2">
          <input
            id="ai-chat-input"
            type="text"
            placeholder={`提问关于这个岗位的任何问题...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            id="ai-send-btn"
            onClick={() => handleSendMessage(inputValue)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white transition-colors flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
