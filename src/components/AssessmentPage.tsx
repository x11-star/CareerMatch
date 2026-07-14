import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronLeft, Save, Star, CheckCircle, RotateCw } from 'lucide-react';
import { MOCK_QUESTIONS } from '../data';
import { PersonalityResult } from '../types';
import { calculatePersonalityResult } from '../lib/assessmentHelper';
import { useAuth } from '../context/AuthContext';
import { saveAssessment } from '../lib/firebaseStore';

interface AssessmentPageProps {
  onComplete: (result: PersonalityResult) => void;
  onExit: () => void;
}

export default function AssessmentPage({ onComplete, onExit }: AssessmentPageProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isFinishing, setIsFinishing] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');

  const totalQuestions = MOCK_QUESTIONS.length;
  const currentQuestion = MOCK_QUESTIONS[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const options = [
    { value: 1, label: '非常不同意', color: 'hover:border-red-300 hover:bg-red-50/10 text-red-700 border-red-100' },
    { value: 2, label: '不同意', color: 'hover:border-orange-300 hover:bg-orange-50/10 text-orange-600 border-orange-100' },
    { value: 3, label: '中立', color: 'hover:border-slate-300 hover:bg-slate-50 text-slate-500 border-slate-200' },
    { value: 4, label: '同意', color: 'hover:border-blue-300 hover:bg-blue-50/10 text-blue-600 border-blue-100' },
    { value: 5, label: '非常同意', color: 'hover:border-emerald-300 hover:bg-emerald-50/10 text-emerald-700 border-emerald-100' },
  ];

  const handleSelectOption = (value: number) => {
    // Record answer
    const updatedAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(updatedAnswers);

    // Transition effect
    setTimeout(async () => {
      if (currentIndex < totalQuestions - 1) {
        setSlideDirection('left');
        setCurrentIndex(currentIndex + 1);
      } else {
        // Complete! Show transition loader
        setIsFinishing(true);
        const result = calculatePersonalityResult(updatedAnswers);
        if (user) {
          try {
            await saveAssessment(user.uid, result);
          } catch (e) {
            console.error("Failed to save assessment to Firestore", e);
          }
        }
        setTimeout(() => {
          onComplete(result);
        }, 3000);
      }
    }, 250);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSlideDirection('right');
      setCurrentIndex(currentIndex - 1);
    }
  };

  const autofillAll = () => {
    const mockAnswers: Record<number, number> = {};
    MOCK_QUESTIONS.forEach((q) => {
      // Generate realistic answers favoring conscientiousness and stability
      if (q.dimension === 'C' || q.dimension === 'A') {
        mockAnswers[q.id] = Math.random() > 0.3 ? 5 : 4;
      } else if (q.dimension === 'N') {
        mockAnswers[q.id] = Math.random() > 0.5 ? 2 : 1;
      } else {
        mockAnswers[q.id] = Math.floor(Math.random() * 3) + 3; // 3, 4, 5
      }
    });
    setAnswers(mockAnswers);
    setIsFinishing(true);
    
    const result = calculatePersonalityResult(mockAnswers);
    setTimeout(async () => {
      if (user) {
        try {
          await saveAssessment(user.uid, result);
        } catch (e) {
          console.error("Failed to save assessment to Firestore", e);
        }
      }
      onComplete(result);
    }, 3000);
  };

  if (isFinishing) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-slate-200 p-8 shadow-md"
        >
          <div className="w-20 h-20 mx-auto relative mb-6">
            {/* Pulsing ring */}
            <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-60" />
            <div className="relative w-20 h-20 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center">
              <RotateCw className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 font-display mb-3">✅ 测评完成！</h2>
          <p className="text-sm text-slate-500 mb-6">
            正在生成你的职业性格画像...
          </p>

          <div className="space-y-2 max-w-xs mx-auto">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.8 }}
                className="h-full bg-linear-to-r from-blue-600 to-indigo-600"
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>大五人格模型分析</span>
              <span>100%</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Stages Definition
  const stages = [
    { title: '日常习惯', hint: '本阶段聚焦于您的日常生活习惯、工作规划条理与细节品质。', activeBg: 'bg-blue-600', activeText: 'text-blue-700', activeBorder: 'border-blue-600', lightBg: 'bg-blue-50/50', circleBg: 'bg-blue-600 border-blue-600' },
    { title: '情绪抗压', hint: '本阶段评估您在面对突发危机、压力、否定或批评时的心理弹性与自控调节力。', activeBg: 'bg-indigo-600', activeText: 'text-indigo-700', activeBorder: 'border-indigo-600', lightBg: 'bg-indigo-50/50', circleBg: 'bg-indigo-600 border-indigo-600' },
    { title: '团队协同', hint: '本阶段分析您在团队协作、冲突解决、信任建立以及人际社交中的核心风格。', activeBg: 'bg-purple-600', activeText: 'text-purple-700', activeBorder: 'border-purple-600', lightBg: 'bg-purple-50/50', circleBg: 'bg-purple-600 border-purple-600' },
    { title: '深层驱力', hint: '本阶段旨在挖掘您的认知深度、对未知变化的接受度以及底层的职场价值主张。', activeBg: 'bg-emerald-600', activeText: 'text-emerald-700', activeBorder: 'border-emerald-600', lightBg: 'bg-emerald-50/50', circleBg: 'bg-emerald-600 border-emerald-600' },
  ];

  const currentStageIndex = Math.min(3, Math.floor(currentIndex / 10));
  const currentStage = stages[currentStageIndex];

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header Info */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onExit}
          className="text-sm text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> 退出测评
        </button>
        <div className="text-right">
          <span className="text-xs text-slate-400 font-medium">第 {currentIndex + 1} / {totalQuestions} 题</span>
        </div>
      </div>

      {/* Modern Stage Indicators */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {stages.map((stage, sIdx) => {
          const isActive = currentStageIndex === sIdx;
          const isCompleted = currentStageIndex > sIdx;
          return (
            <div key={sIdx} className="flex flex-col gap-1.5">
              <div className="h-1 rounded-full overflow-hidden bg-slate-100 border border-slate-200/20">
                <div
                  className={`h-full transition-all duration-300 ${stage.activeBg}`}
                  style={{ width: isActive ? `${((currentIndex % 10) + 1) * 10}%` : isCompleted ? '100%' : '0%' }}
                />
              </div>
              <span className={`text-[11px] font-medium text-center truncate transition-colors duration-200 ${isActive ? `${stage.activeText} font-bold` : isCompleted ? 'text-slate-500' : 'text-slate-400'}`}>
                {stage.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dynamic Stage Hint */}
      <motion.div
        key={currentStageIndex}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-50 text-slate-600 border border-slate-100 px-4 py-3 rounded-xl text-xs font-medium mb-6 flex items-start gap-2.5 shadow-2xs"
      >
        <Star className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800 mr-1">【{currentStage.title}】</span>
          {currentStage.hint}
        </div>
      </motion.div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-xs mb-8 min-h-48 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: slideDirection === 'left' ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDirection === 'left' ? -40 : 40 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col justify-center"
          >
            <p className="text-lg sm:text-xl font-bold font-display text-slate-900 leading-relaxed text-center my-6">
              "{currentQuestion.text}"
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Option Cards */}
      <div className="space-y-3.5">
        {options.map((opt) => {
          const isSelected = answers[currentQuestion.id] === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleSelectOption(opt.value)}
              className={`w-full text-left p-4 rounded-xl border text-sm font-semibold transition-all duration-150 cursor-pointer ${
                isSelected
                  ? `${currentStage.activeBorder} ${currentStage.lightBg} ${currentStage.activeText} shadow-xs scale-101`
                  : `border-slate-200 bg-white text-slate-700 ${opt.color}`
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-mono transition-colors ${
                  isSelected ? `${currentStage.activeBg} border-transparent text-white` : 'border-slate-300 text-slate-400'
                }`}>
                  {opt.value}
                </span>
                <span>{opt.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center text-xs">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border font-medium ${
            currentIndex === 0
              ? 'border-slate-100 text-slate-300 cursor-not-allowed'
              : 'border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer'
          }`}
        >
          上一题
        </button>

        <button
          onClick={autofillAll}
          className="text-slate-400 hover:text-blue-600 font-medium cursor-pointer"
        >
          💡 一键完成测评 (演示快速生成)
        </button>

        <button
          onClick={onExit}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" /> 保存并退出
        </button>
      </div>
    </div>
  );
}
