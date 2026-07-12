import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import ResumeUploadPage from './components/ResumeUploadPage';
import AssessmentPage from './components/AssessmentPage';
import AssessmentResultPage from './components/AssessmentResultPage';
import MatchResultsPage from './components/MatchResultsPage';
import PositionDetailPage from './components/PositionDetailPage';
import PositionBrowserPage from './components/PositionBrowserPage';
import ProfilePage from './components/ProfilePage';

import DownloadModal from './components/DownloadModal';
import ShareModal from './components/ShareModal';

import { MOCK_POSITIONS, DEFAULT_RESUME_DATA } from './data';
import { ResumeData, PersonalityResult, Position } from './types';
import { Landmark, Sparkles, Monitor, Layers } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { getLatestResume, getLatestAssessment, getPositions, seedPositionsToFirestore } from './lib/firebaseStore';

type ViewType = 'landing' | 'upload' | 'assessment' | 'assessment-result' | 'results' | 'detail' | 'browser' | 'profile';

export default function App() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [resumeData, setResumeData] = useState<ResumeData>(DEFAULT_RESUME_DATA);
  const [personalityResult, setPersonalityResult] = useState<PersonalityResult | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string>('sg-01');
  const [activeModal, setActiveModal] = useState<'download' | 'share' | null>(null);
  const [isDemoPanelOpen, setIsDemoPanelOpen] = useState(true);
  const [positions, setPositions] = useState<Position[]>(MOCK_POSITIONS);

  const [seedingStatus, setSeedingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [seedingError, setSeedingError] = useState('');

  const handleManualSeed = async () => {
    setSeedingStatus('loading');
    setSeedingError('');
    try {
      await seedPositionsToFirestore();
      setSeedingStatus('success');
      const dbPositions = await getPositions();
      if (dbPositions && dbPositions.length > 0) {
        setPositions(dbPositions);
      }
    } catch (err: any) {
      console.error(err);
      setSeedingStatus('error');
      setSeedingError(err.message || '未知错误');
    }
  };

  // Load positions once on mount
  useEffect(() => {
    async function loadPositions() {
      try {
        const dbPositions = await getPositions();
        if (dbPositions && dbPositions.length > 0) {
          setPositions(dbPositions);
        }
      } catch (err) {
        console.error("Failed to load positions in App component:", err);
      }
    }
    loadPositions();
  }, []);

  // Sync with Firestore whenever user state changes
  useEffect(() => {
    async function fetchUserData() {
      if (user) {
        try {
          const resume = await getLatestResume(user.uid);
          if (resume) {
            setResumeData(resume);
          }
          const assessment = await getLatestAssessment(user.uid);
          if (assessment) {
            setPersonalityResult(assessment);
          } else {
            setPersonalityResult(null);
          }
        } catch (err) {
          console.error("Failed to load user resume or assessments", err);
        }
      } else {
        setResumeData(DEFAULT_RESUME_DATA);
        setPersonalityResult(null);
      }
    }
    fetchUserData();
  }, [user]);

  // Retrieve position object based on state ID
  const currentPosition = positions.find((p) => p.id === selectedPositionId) || positions[0] || MOCK_POSITIONS[0];

  // Flow handlers
  const handleResumeConfirmed = (data: ResumeData) => {
    setResumeData(data);
    setCurrentView('assessment');
  };

  const handleAssessmentCompleted = (result: PersonalityResult) => {
    setPersonalityResult(result);
    setCurrentView('assessment-result');
  };

  const handleSeeMatches = () => {
    setCurrentView('results');
  };

  const handleSelectPosition = (id: string) => {
    setSelectedPositionId(id);
    setCurrentView('detail');
  };

  const handleOpenModal = (modalType: 'download' | 'share' | null) => {
    setActiveModal(modalType);
  };

  // Quick switcher targets for Figma evaluation
  const prototypePages = [
    { id: 'landing', label: '1. 落地页 / 首页' },
    { id: 'upload', label: '2. 简历上传与AI解析' },
    { id: 'assessment', label: '3. 科学性格测评' },
    { id: 'assessment-result', label: '4. 测评结果画像' },
    { id: 'results', label: '5. 双引擎匹配结果' },
    { id: 'detail', label: '6. 职位深度拆解详情' },
    { id: 'browser', label: '7. 全局职位库浏览器' },
    { id: 'profile', label: '8. 用户个人中心' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-600/10 select-none">
      {/* Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(v) => setCurrentView(v as ViewType)}
        onOpenModal={handleOpenModal}
      />

      {/* Main Pages router */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage onNavigate={(v) => setCurrentView(v as ViewType)} />
        )}

        {currentView === 'upload' && (
          <ResumeUploadPage
            onConfirm={handleResumeConfirmed}
            onBack={() => setCurrentView('landing')}
          />
        )}

        {currentView === 'assessment' && (
          <AssessmentPage
            onComplete={handleAssessmentCompleted}
            onExit={() => setCurrentView('upload')}
          />
        )}

        {currentView === 'assessment-result' && (
          <AssessmentResultPage
            onSeeMatches={handleSeeMatches}
            onShare={() => handleOpenModal('share')}
            personalityResult={personalityResult}
          />
        )}

        {currentView === 'results' && (
          <MatchResultsPage
            onSelectPosition={handleSelectPosition}
            onOpenModal={handleOpenModal}
            onRetake={() => setCurrentView('upload')}
            resumeData={resumeData}
            personalityResult={personalityResult}
          />
        )}

        {currentView === 'detail' && (
          <PositionDetailPage
            position={currentPosition}
            onBack={() => setCurrentView('results')}
            onOpenModal={handleOpenModal}
          />
        )}

        {currentView === 'browser' && (
          <PositionBrowserPage onSelectPosition={handleSelectPosition} />
        )}

        {currentView === 'profile' && (
          <ProfilePage
            onNavigate={(v) => setCurrentView(v as ViewType)}
            onOpenModal={handleOpenModal}
            resumeData={resumeData}
            personalityResult={personalityResult}
          />
        )}
      </main>

      {/* Modals */}
      {activeModal === 'download' && (
        <DownloadModal onClose={() => handleOpenModal(null)} />
      )}
      {activeModal === 'share' && (
        <ShareModal onClose={() => handleOpenModal(null)} />
      )}

      {/* Collapsible Demo/Prototype Controller floating panel */}
      <div className="fixed bottom-20 right-4 z-40 max-w-xs">
        {isDemoPanelOpen ? (
          <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> 原型演示快速跳转 (Figma版)
              </span>
              <button
                onClick={() => setIsDemoPanelOpen(false)}
                className="text-[10px] text-slate-500 hover:text-white"
              >
                收起 ✕
              </button>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              为了让您与团队更极致地评审【精准职达】8大版面，您可以通过此面板在任何状态下一键到达目标页面：
            </p>
            <div className="grid grid-cols-1 gap-1 text-[11px]">
              {prototypePages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentView(page.id as ViewType)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition-colors flex justify-between items-center ${
                    currentView === page.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <span>{page.label}</span>
                  {currentView === page.id && <Sparkles className="w-3 h-3 text-yellow-300" />}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400">📊 数据库岗位载入状态</span>
                <span className="text-[10px] font-bold text-slate-300">{positions.length} 个岗位</span>
              </div>
              <button
                onClick={handleManualSeed}
                disabled={seedingStatus === 'loading'}
                className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  seedingStatus === 'loading'
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : seedingStatus === 'success'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : seedingStatus === 'error'
                    ? 'bg-rose-600 text-white hover:bg-rose-500'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {seedingStatus === 'loading' ? '⏳ 正在导入数据库...' : 
                 seedingStatus === 'success' ? '✅ 成功导入33个岗位' : 
                 seedingStatus === 'error' ? `❌ 导入失败: ${seedingError}` : 
                 '⚡️ 一键导入 33 个岗位至 Firestore'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsDemoPanelOpen(true)}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-blue-400 font-bold rounded-full shadow-xl cursor-pointer flex items-center gap-1 text-xs"
          >
            <Monitor className="w-4 h-4" /> Jump to Page
          </button>
        )}
      </div>
    </div>
  );
}
