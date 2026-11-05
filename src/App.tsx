import { useState, useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import StatusBanner from './components/ui/StatusBanner';
import DownloadModal from './components/DownloadModal';
import ShareModal from './components/ShareModal';
import { MOCK_POSITIONS } from './data';
import type { ResumeData, PersonalityResult, Position } from './types';
import { useAuth } from './context/AuthContext';
import { getLatestResume, getLatestAssessment, getPositions, ALL_POSITIONS_PAGE_SIZE, type AppUser } from './lib/userDataStore';
import { readRoute, routeHash, publicShareUrl, type ViewType } from './lib/navigation';
import { api } from './lib/apiClient';
import MatchingSteps from './components/MatchingSteps';
import EmptyState from './components/ui/EmptyState';
import { hasRealResumeData } from './lib/resumeState';

const ResumeUploadPage = lazy(() => import('./components/ResumeUploadPage'));
const AssessmentPage = lazy(() => import('./components/AssessmentPage'));
const AssessmentResultPage = lazy(() => import('./components/AssessmentResultPage'));
const MatchResultsPage = lazy(() => import('./components/MatchResultsPage'));
const PositionDetailPage = lazy(() => import('./components/PositionDetailPage'));
const PositionBrowserPage = lazy(() => import('./components/PositionBrowserPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));

// Remount on identity changes so private state and late responses cannot cross accounts.
export default function App() {
  const { user, loading, loginAsGuest, sessionError, refreshMe } = useAuth();
  useEffect(() => {
    const ensureGuest = () => {
      if (!loading && !sessionError && !user && ['upload', 'assessment'].includes(readRoute(window.location.hash).view)) loginAsGuest();
    };
    ensureGuest();
    window.addEventListener('hashchange', ensureGuest);
    return () => window.removeEventListener('hashchange', ensureGuest);
  }, [loading, user, sessionError]);
  if (loading) return <div className="mx-auto max-w-4xl p-6"><StatusBanner tone="pending" title="正在确认登录状态" description="稍后即可继续。" /></div>;
  if (sessionError) return <div className="mx-auto max-w-4xl p-6"><StatusBanner tone="error" title="登录状态暂未确认" description={sessionError} action={<button onClick={refreshMe}>重新连接</button>} /></div>;
  return <Workspace key={`${user?.isGuest ? 'guest' : 'account'}:${user?.id || 'none'}`} user={user} />;
}

function Workspace({ user }: { user: AppUser | null }) {
  const { loginAsGuest, authNotice } = useAuth();
  const [route, setRoute] = useState(() => readRoute(window.location.hash));
  const currentView = route.view;
  const returnKey = `career_return_${user?.id || 'public'}`;
  const [previousView, setPreviousView] = useState<ViewType>(() => { try { return sessionStorage.getItem(returnKey) === 'results' ? 'results' : 'browser'; } catch { return 'browser'; } });
  const [returnScroll, setReturnScroll] = useState(0);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [personalityResult, setPersonalityResult] = useState<PersonalityResult | null>(null);
  const [materialLoading, setMaterialLoading] = useState(Boolean(user));
  const [materialError, setMaterialError] = useState('');
  const [materialRevision, setMaterialRevision] = useState(0);
  const [activeModal, setActiveModal] = useState<'download' | 'share' | null>(null);
  const [positions, setPositions] = useState<Position[]>(MOCK_POSITIONS);
  const [directPosition, setDirectPosition] = useState<Position | null>(null);
  const [positionLoading, setPositionLoading] = useState(false);

  function navigate(view: ViewType, positionId = '') {
    const hash = routeHash(view, positionId);
    if (window.location.hash !== hash) window.location.hash = hash;
    if (!user && ['upload', 'assessment'].includes(view)) loginAsGuest();
    setRoute(readRoute(hash));
    setActiveModal(null);
    window.scrollTo({ top: 0 });
  }
  useEffect(() => {
    const sync = () => { setRoute(readRoute(window.location.hash)); setActiveModal(null); };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => {
    let active = true;
    getPositions(ALL_POSITIONS_PAGE_SIZE).then(data => { if (active) setPositions(data); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setResumeData(null);
    setPersonalityResult(null);
    setMaterialError('');
    if (!user) { setMaterialLoading(false); return; }
    setMaterialLoading(true);
    Promise.all([getLatestResume(user), getLatestAssessment(user)])
      .then(([resume, assessment]) => { if (active) { setResumeData(resume); setPersonalityResult(assessment); } })
      .catch((error: any) => { if (active) setMaterialError(error?.message || '资料读取失败，请重试。'); })
      .finally(() => { if (active) setMaterialLoading(false); });
    return () => { active = false; };
  }, [user?.id, user?.isGuest, materialRevision]);

  const currentPosition = positions.find(p => p.id === route.positionId || p.catalogId === route.positionId) || (directPosition?.id === route.positionId || directPosition?.catalogId === route.positionId ? directPosition : null);
  useEffect(() => {
    let active = true;
    setDirectPosition(null);
    if (currentView !== 'detail' || positions.some(p => p.id === route.positionId || p.catalogId === route.positionId)) { setPositionLoading(false); return; }
    setPositionLoading(true);
    api.getPosition(route.positionId).then(result => { if (active) setDirectPosition(result.position); })
      .catch(() => {}).finally(() => { if (active) setPositionLoading(false); });
    return () => { active = false; };
  }, [currentView, route.positionId, positions]);
  const needsMaterials = ['upload', 'assessment', 'assessment-result', 'results', 'detail', 'profile'].includes(currentView);
  const resumeReady = hasRealResumeData(resumeData);
  const flowView = ['upload', 'assessment', 'assessment-result', 'results'].includes(currentView);
  const blocked = ['assessment', 'assessment-result', 'results'].includes(currentView) && !resumeReady ? 'resume' : ['results', 'assessment-result'].includes(currentView) && !personalityResult ? 'assessment' : null;
  const onSelectPosition = (id: string) => { setPreviousView(currentView === 'results' ? 'results' : 'browser'); setReturnScroll(window.scrollY); try { sessionStorage.setItem(returnKey, currentView === 'results' ? 'results' : 'browser'); } catch {} navigate('detail', positions.find(p => p.id === id)?.catalogId || id); };
  const returnToList = () => { navigate(previousView); };
  useEffect(() => { if (currentView === previousView && returnScroll) { const timer = setTimeout(() => window.scrollTo({ top: returnScroll }), 250); return () => clearTimeout(timer); } }, [currentView, materialLoading]);
  const loadingPage = <StatusBanner tone="pending" title="正在加载" description="请稍候。" />;

  return (
    <div className="min-h-screen bg-career-bg text-career-ink">
      <Navbar currentView={currentView} onNavigate={v => navigate(v as ViewType)} onOpenModal={setActiveModal} />
      {authNotice && <div className="mx-auto max-w-6xl p-4"><StatusBanner tone="warning" title="材料同步未完成" description={authNotice} /></div>}
      <main className="min-w-0">
        {flowView && !materialLoading && <MatchingSteps view={currentView} resumeReady={resumeReady} assessmentReady={Boolean(personalityResult)} onNavigate={navigate} />}
        {needsMaterials && materialLoading ? <div className="mx-auto max-w-6xl p-6">{loadingPage}</div> : needsMaterials && materialError ? (
          <div className="mx-auto max-w-6xl p-6"><StatusBanner tone="error" title="资料暂未加载" description={materialError} action={<button onClick={() => setMaterialRevision(n => n + 1)}>重新读取</button>} /></div>
        ) : blocked ? <div className="mx-auto max-w-3xl px-4 py-10"><EmptyState title={blocked === 'resume' ? '先完善个人材料' : '完成性格测评后查看推荐'} description={blocked === 'resume' ? '上传简历、粘贴文字或手动填写，然后继续测评。' : '简历已保存，可以继续测评；已答内容会保留。'} action={<button className="rounded-md bg-career-primary px-5 py-3 text-white" onClick={() => navigate(blocked === 'resume' ? 'upload' : 'assessment')}>{blocked === 'resume' ? '完善个人材料' : '继续性格测评'}</button>} /></div> : <Suspense fallback={<div className="mx-auto max-w-6xl p-6">{loadingPage}</div>}>
          {currentView === 'landing' && <LandingPage continueView={!resumeReady ? 'upload' : !personalityResult ? 'assessment' : 'results'} positions={positions} onNavigate={v => navigate(v as ViewType)} />}
          {currentView === 'upload' && <ResumeUploadPage initialResume={resumeData} onBack={() => navigate('landing')} onConfirm={data => { setResumeData(data); navigate(personalityResult ? 'results' : 'assessment'); }} />}
          {currentView === 'assessment' && <AssessmentPage onExit={() => navigate('upload')} onComplete={result => { setPersonalityResult(result); navigate('assessment-result'); }} />}
          {currentView === 'assessment-result' && <AssessmentResultPage onSeeMatches={() => navigate('results')} onShare={() => setActiveModal('share')} personalityResult={personalityResult} />}
          {(currentView === 'results' || currentView === 'detail' && previousView === 'results' && resumeReady && personalityResult) && <div hidden={currentView !== 'results'}><MatchResultsPage onSelectPosition={onSelectPosition} onOpenModal={setActiveModal} onRetake={() => navigate('upload')} resumeData={resumeData} personalityResult={personalityResult} /></div>}
          {currentView === 'detail' && (positionLoading ? <div className="p-6">{loadingPage}</div> : currentPosition ? <PositionDetailPage key={currentPosition.id} position={currentPosition} onBack={returnToList} backLabel={previousView === "results" ? "返回推荐结果" : "返回岗位库"} onOpenModal={setActiveModal} resumeData={resumeData || undefined} personalityResult={personalityResult} /> : <div className="mx-auto max-w-6xl p-6"><StatusBanner tone="warning" title="未找到这个职业类型" description="该链接可能已失效，或职业库暂时不可用。" action={<button onClick={() => navigate('browser')}>查看职业库</button>} /></div>)}
          {(currentView === 'browser' || currentView === 'detail' && previousView === 'browser') && <div hidden={currentView !== 'browser'}><PositionBrowserPage onSelectPosition={onSelectPosition} /></div>}
          {currentView === 'profile' && <ProfilePage onNavigate={v => navigate(v as ViewType)} onOpenModal={setActiveModal} resumeData={resumeData || undefined} personalityResult={personalityResult} onSelectPosition={onSelectPosition} onDataChanged={() => setMaterialRevision(n => n + 1)} />}
        </Suspense>}
      </main>
      {activeModal === 'download' && <DownloadModal positionId={currentView === 'detail' ? currentPosition?.id || null : null} onClose={() => setActiveModal(null)} />}
      {activeModal === 'share' && <ShareModal shareUrl={publicShareUrl(window.location.href, currentView === 'detail' ? currentPosition?.catalogId || currentPosition?.id : undefined)} isPosition={currentView === 'detail'} onClose={() => setActiveModal(null)} />}
    </div>
  );
}
