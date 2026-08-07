import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, RotateCw, Save } from 'lucide-react';
import { MOCK_QUESTIONS } from '../data';
import { PersonalityResult } from '../types';
import { calculatePersonalityResult } from '../lib/assessmentHelper';
import { useAuth } from '../context/AuthContext';
import { saveAssessment } from '../lib/userDataStore';
import PageHeader from './ui/PageHeader';
import SectionPanel from './ui/SectionPanel';
import StatusBanner from './ui/StatusBanner';

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
  const currentStageIndex = Math.min(3, Math.floor(currentIndex / 10));
  const progressInStage = ((currentIndex % 10) + 1) * 10;

  const options = [
    { value: 1, label: '非常不同意' },
    { value: 2, label: '不同意' },
    { value: 3, label: '不确定' },
    { value: 4, label: '同意' },
    { value: 5, label: '非常同意' },
  ];

  const stages = [
    { title: '工作偏好', hint: '了解你更适合稳定流程、探索变化还是目标冲刺。' },
    { title: '协作方式', hint: '判断你在团队沟通、冲突处理和协作节奏中的倾向。' },
    { title: '压力与稳定性', hint: '评估岗位压力、反馈密度和变化节奏是否适合你。' },
    { title: '职业兴趣', hint: '补充你的兴趣驱动，用于推荐更贴近的岗位环境。' },
  ];

  const currentStage = stages[currentStageIndex];

  const handleSelectOption = (value: number) => {
    const updatedAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(updatedAnswers);

    setTimeout(async () => {
      if (currentIndex < totalQuestions - 1) {
        setSlideDirection('left');
        setCurrentIndex(currentIndex + 1);
      } else {
        setIsFinishing(true);
        const result = calculatePersonalityResult(updatedAnswers);
        if (user) {
          try {
            await saveAssessment(user, result, updatedAnswers);
          } catch (e) {
            console.error('Failed to save assessment', e);
          }
        }
        setTimeout(() => {
          onComplete(result);
        }, 2200);
      }
    }, 250);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSlideDirection('right');
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (isFinishing) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="rounded-3xl border border-career-line bg-career-surface p-8 shadow-xs">
          <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-career-primary-soft text-career-primary">
            <RotateCw className="h-8 w-8 animate-spin" />
          </div>
          <h2 className="text-2xl font-semibold text-career-ink">测评已完成</h2>
          <p className="mt-3 text-sm leading-6 text-career-muted">正在整理你的职业画像，随后进入诊断结果。</p>
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-career-surface-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2 }}
              className="h-full rounded-full bg-career-primary"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <button
        onClick={onExit}
        className="mb-6 flex cursor-pointer items-center gap-1.5 text-sm font-medium text-career-muted transition-colors hover:text-career-ink"
      >
        <ChevronLeft className="h-4 w-4" /> 退出测评
      </button>

      <PageHeader
        eyebrow="Assessment"
        title="完成职业测评"
        description="这部分用于判断岗位环境、协作方式和职业兴趣是否匹配。"
        meta={<span className="text-xs font-semibold text-career-muted">第 {currentIndex + 1} / {totalQuestions} 题</span>}
      />

      <div className="space-y-5">
        {!user && (
          <StatusBanner
            tone="info"
            title="可以先以游客完成测评"
            description="登录手机号后，结果会保存到你的账号；游客模式下结果保存在本机浏览器。"
          />
        )}

        <SectionPanel title="测评进度" description="四组问题共同构成岗位适配判断依据，分数不会作为唯一结论。">
          <div className="grid gap-3 sm:grid-cols-4">
            {stages.map((stage, index) => {
              const isActive = currentStageIndex === index;
              const isCompleted = currentStageIndex > index;
              const width = isActive ? `${progressInStage}%` : isCompleted ? '100%' : '0%';
              return (
                <div key={stage.title} className="rounded-2xl border border-career-line bg-career-bg p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${isActive ? 'text-career-primary' : 'text-career-ink'}`}>{stage.title}</span>
                    <span className="font-mono text-[10px] text-career-muted">{index + 1}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-career-surface-muted">
                    <div className="h-full rounded-full bg-career-primary transition-all duration-300" style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-2xl bg-career-primary-soft px-4 py-3 text-xs leading-5 text-career-muted">
            <span className="font-semibold text-career-ink">{currentStage.title}：</span>{currentStage.hint}
          </div>
        </SectionPanel>

        <SectionPanel title="当前题目" description="请选择最接近你真实情况的一项；不确定时可以选择中间项。">
          <div className="rounded-3xl bg-career-bg p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: slideDirection === 'left' ? 32 : -32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: slideDirection === 'left' ? -32 : 32 }}
                transition={{ duration: 0.22 }}
              >
                <p className="text-center text-lg font-semibold leading-8 text-career-ink sm:text-xl">“{currentQuestion.text}”</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-5 grid gap-3">
            {options.map((opt) => {
              const isSelected = answers[currentQuestion.id] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelectOption(opt.value)}
                  className={`w-full cursor-pointer rounded-2xl border p-4 text-left text-sm font-semibold transition-colors ${
                    isSelected
                      ? 'border-career-primary bg-career-primary-soft text-career-primary'
                      : 'border-career-line bg-career-surface text-career-ink hover:bg-career-surface-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border font-mono text-xs ${
                      isSelected ? 'border-career-primary bg-career-primary text-white' : 'border-career-line text-career-muted'
                    }`}>{opt.value}</span>
                    <span>{opt.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionPanel>

        <div className="flex items-center justify-between border-t border-career-line pt-5 text-xs">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`rounded-xl border px-3 py-1.5 font-medium ${
              currentIndex === 0
                ? 'cursor-not-allowed border-career-line text-career-muted/50'
                : 'cursor-pointer border-career-line text-career-muted hover:bg-career-surface-muted hover:text-career-ink'
            }`}
          >
            上一题
          </button>

          <button onClick={onExit} className="flex cursor-pointer items-center gap-1 text-career-muted hover:text-career-ink">
            <Save className="h-3.5 w-3.5" /> 保存并退出
          </button>
        </div>
      </div>
    </div>
  );
}
