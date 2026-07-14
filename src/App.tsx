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
import { Landmark } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { getLatestResume, getLatestAssessment, getPositions, seedPositionsToFirestore } from './lib/firebaseStore';

type ViewType = 'landing' | 'upload' | 'assessment' | 'assessment-result' | 'results' | 'detail' | 'browser' | 'profile';

export default function App() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [previousView, setPreviousView] = useState<ViewType>('results');
  const [resumeData, setResumeData] = useState<ResumeData>(DEFAULT_RESUME_DATA);
  const [personalityResult, setPersonalityResult] = useState<PersonalityResult | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string>('sg-01');
  const [activeModal, setActiveModal] = useState<'download' | 'share' | null>(null);
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
    setPreviousView(currentView);
    setCurrentView('detail');
  };

  const handleOpenModal = (modalType: 'download' | 'share' | null) => {
    setActiveModal(modalType);
  };

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
          <LandingPage onNavigate={(v) => setCurrentView(v as ViewType)} positions={positions} />
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
            onBack={() => setCurrentView(previousView || 'results')}
            onOpenModal={handleOpenModal}
            resumeData={resumeData}
            personalityResult={personalityResult}
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


    </div>
  );
}
