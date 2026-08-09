import React, { useState } from 'react';
import { Award, ChevronDown, KeyRound, LogIn, LogOut, Menu, Phone, Target, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenModal: (modalType: 'download' | 'share' | null) => void;
}

export default function Navbar({ currentView, onNavigate, onOpenModal }: NavbarProps) {
  const { user, logout, userProfile, loginAsGuest, requestLoginCode, verifyLoginCode } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const navItems = [
    { label: '首页', view: 'landing' },
    { label: '上传简历', view: 'upload' },
    { label: '职业测评', view: 'assessment' },
    { label: '岗位库', view: 'browser' },
    { label: '诊断报告', view: 'results' },
    { label: '我的档案', view: 'profile' },
  ];

  const handleNavClick = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const isNavActive = (view: string) => {
    if (currentView === view) return true;
    if (view === 'assessment' && currentView === 'assessment-result') return true;
    if (view === 'results' && (currentView === 'assessment-result' || currentView === 'detail')) return true;
    return false;
  };

  const handleLoginClick = () => setLoginModalOpen(true);

  const handleRequestCode = async () => {
    setLoginError('');
    setLoginSubmitting(true);
    try {
      const result = await requestLoginCode(phone);
      setDevCode(result.devCode || '');
    } catch (error: any) {
      setLoginError(error?.message || '验证码发送失败，请稍后再试');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoginError('');
    setLoginSubmitting(true);
    try {
      await verifyLoginCode(phone, code);
      setLoginModalOpen(false);
      setCode('');
      setDevCode('');
    } catch (error: any) {
      setLoginError(error?.message || '登录失败，请检查验证码');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleGuest = () => {
    loginAsGuest();
    setLoginModalOpen(false);
  };

  const handleLogoutClick = async () => {
    try {
      await logout();
      setUserDropdownOpen(false);
      onNavigate('landing');
    } catch (e) {
      console.error('Failed to logout', e);
    }
  };

  const avatarChar = userProfile?.name ? userProfile.name[0] : (user ? '访' : '未');
  const userName = user?.isGuest ? '游客模式' : (user ? '手机号登录' : '未登录');
  const userSubTitle = user?.isGuest ? '登录后保存到账号' : (user ? maskPhone(user.phone) : '登录后保存到账号');

  return (
    <>
      <nav className="sticky top-0 z-50 h-16 border-b border-career-line bg-career-surface/95 backdrop-blur">
        <div className="mx-auto h-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-full items-center justify-between">
            <button
              id="nav-logo-btn"
              onClick={() => handleNavClick('landing')}
              className="flex cursor-pointer items-center gap-2 text-xl font-semibold text-career-ink transition-opacity hover:opacity-90"
            >
              <div className="rounded-xl bg-career-primary-soft p-1.5 text-career-primary">
                <Target className="h-6 w-6" />
              </div>
              <span className="tracking-tight">精准职达</span>
            </button>

            <div className="hidden items-center gap-6 md:flex">
              {navItems.map((item) => (
                <button
                  key={item.view}
                  id={`nav-item-${item.view}`}
                  onClick={() => handleNavClick(item.view)}
                  className={`relative flex h-16 cursor-pointer items-center px-1 text-sm font-medium transition-colors ${
                    isNavActive(item.view)
                      ? 'text-career-primary'
                      : 'text-career-muted hover:text-career-ink'
                  }`}
                >
                  {item.label}
                  {isNavActive(item.view) && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-career-primary" />
                  )}
                </button>
              ))}
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <button
                id="nav-share-btn"
                onClick={() => onOpenModal('share')}
                className="rounded-xl border border-career-line bg-career-bg px-3 py-1.5 text-xs font-medium text-career-muted transition-colors hover:bg-career-surface-muted hover:text-career-ink"
              >
                复制分享链接
              </button>

              {user ? (
                <div className="relative">
                  <button
                    id="user-profile-menu-btn"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-career-line bg-career-surface p-1.5 transition-colors hover:bg-career-surface-muted"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-career-primary-soft text-sm font-semibold text-career-primary">
                      {avatarChar}
                    </div>
                    <span className="max-w-24 truncate text-xs font-semibold text-career-ink">{userName}</span>
                    <ChevronDown className="h-4 w-4 text-career-muted" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-career-line bg-career-surface py-2 text-sm text-career-ink shadow-lg">
                      <div className="border-b border-career-line px-4 pb-3 pt-2">
                        <p className="text-xs font-semibold text-career-ink">{userName}</p>
                        <p className="mt-1 text-[11px] text-career-muted">{userSubTitle}</p>
                      </div>
                      <button
                        onClick={() => handleNavClick('profile')}
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-career-surface-muted"
                      >
                        <User className="h-4 w-4" /> 我的档案
                      </button>
                      <button
                        onClick={() => handleNavClick('upload')}
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-career-surface-muted"
                      >
                        <Award className="h-4 w-4" /> 更新材料
                      </button>
                      <div className="my-1 border-t border-career-line" />
                      <button
                        onClick={handleLogoutClick}
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-career-danger transition-colors hover:bg-career-danger-soft"
                      >
                        <LogOut className="h-4 w-4" /> 退出登录
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleLoginClick}
                  className="flex cursor-pointer items-center gap-1 rounded-md bg-career-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  <LogIn className="h-3.5 w-3.5" /> 手机号登录
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 md:hidden">
              <button
                id="nav-share-mobile-btn"
                onClick={() => onOpenModal('share')}
                className="rounded-xl border border-career-line bg-career-bg px-2.5 py-1.5 text-xs text-career-muted"
              >
                分享
              </button>
              <button
                id="mobile-menu-toggle-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-xl border border-career-line p-2 text-career-muted transition-colors hover:bg-career-surface-muted hover:text-career-ink"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="absolute left-0 right-0 top-16 z-40 flex flex-col gap-2 border-b border-career-line bg-career-surface px-4 py-4 shadow-md md:hidden">
            {navItems.map((item) => (
              <button
                key={item.view}
                id={`nav-item-mobile-${item.view}`}
                onClick={() => handleNavClick(item.view)}
                className={`cursor-pointer rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                  isNavActive(item.view)
                    ? 'bg-career-primary-soft text-career-primary'
                    : 'text-career-muted hover:bg-career-surface-muted hover:text-career-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="mt-2 border-t border-career-line px-4 pt-3">
              {user ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-career-ink">{userName}</div>
                    <div className="text-[11px] text-career-muted">{userSubTitle}</div>
                  </div>
                  <button id="mobile-user-profile-btn" onClick={() => handleNavClick('profile')} className="text-xs font-semibold text-career-primary">
                    管理
                  </button>
                </div>
              ) : (
                <button onClick={handleLoginClick} className="w-full rounded-xl bg-career-primary py-2 text-center text-xs font-semibold text-white">
                  手机号登录
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {loginModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-career-ink/40 px-4">
          <div className="w-full max-w-sm rounded-lg border border-career-line bg-career-surface p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-career-ink">手机号登录</h2>
                <p className="mt-1 text-xs leading-5 text-career-muted">输入手机号和验证码，登录后保存简历、测评和收藏。</p>
              </div>
              <button
                onClick={() => setLoginModalOpen(false)}
                className="rounded-xl p-1 text-career-muted transition-colors hover:bg-career-surface-muted hover:text-career-ink"
                aria-label="关闭登录弹窗"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-xs font-semibold text-career-ink">
                手机号
                <div className="mt-1.5 flex items-center gap-2 rounded-md border border-career-line bg-career-bg px-3 py-2 focus-within:border-career-primary focus-within:ring-2 focus-within:ring-career-primary-soft">
                  <Phone className="h-4 w-4 text-career-muted" />
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full border-0 bg-transparent text-sm text-career-ink outline-none placeholder:text-career-muted"
                    placeholder="请输入手机号"
                  />
                </div>
              </label>

              <label className="block text-xs font-semibold text-career-ink">
                验证码
                <div className="mt-1.5 flex items-center gap-2 rounded-md border border-career-line bg-career-bg px-3 py-2 focus-within:border-career-primary focus-within:ring-2 focus-within:ring-career-primary-soft">
                  <KeyRound className="h-4 w-4 text-career-muted" />
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className="w-full border-0 bg-transparent text-sm text-career-ink outline-none placeholder:text-career-muted"
                    placeholder="请输入 6 位验证码"
                  />
                </div>
              </label>

              {devCode && (
                <div className="rounded-md bg-career-primary-soft px-3 py-2 text-xs text-career-primary">
                  本次验证码：<span className="font-semibold tracking-widest">{devCode}</span>
                </div>
              )}

              {loginError && (
                <div className="rounded-md bg-career-danger-soft px-3 py-2 text-xs text-career-danger">
                  {loginError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleRequestCode}
                  disabled={loginSubmitting || !phone.trim()}
                  className="rounded-md border border-career-line px-4 py-2 text-xs font-semibold text-career-primary hover:bg-career-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  获取验证码
                </button>
                <button
                  onClick={handleVerifyCode}
                  disabled={loginSubmitting || !phone.trim() || !code.trim()}
                  className="rounded-md bg-career-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  登录
                </button>
              </div>

              <button
                onClick={handleGuest}
                className="w-full rounded-md bg-career-surface-muted px-4 py-2 text-xs font-semibold text-career-ink hover:bg-career-primary-soft"
              >
                先以游客身份体验
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return '未绑定手机号';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
