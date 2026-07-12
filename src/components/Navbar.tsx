import React, { useState } from 'react';
import { Target, Menu, X, User, LogIn, ChevronDown, Award, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenModal: (modalType: 'download' | 'share' | null) => void;
}

export default function Navbar({ currentView, onNavigate, onOpenModal }: NavbarProps) {
  const { user, logout, userProfile, loginAnonymously } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navItems = [
    { label: '首页', view: 'landing' },
    { label: '岗位库', view: 'browser' },
    { label: '我的测评', view: 'upload' },
    { label: '匹配报告', view: 'results' },
    { label: '个人中心', view: 'profile' },
  ];

  const handleNavClick = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const isNavActive = (view: string) => {
    if (currentView === view) return true;
    if (view === 'upload' && currentView === 'assessment') return true;
    if (view === 'results' && (currentView === 'assessment-result' || currentView === 'detail')) return true;
    return false;
  };

  const handleLoginClick = async () => {
    try {
      await loginAnonymously();
    } catch (e) {
      console.error("Failed to login anonymously", e);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await logout();
      setUserDropdownOpen(false);
      onNavigate('landing');
    } catch (e) {
      console.error("Failed to logout", e);
    }
  };

  const avatarChar = userProfile?.name ? userProfile.name[0] : (user ? '客' : '匿');
  const userName = userProfile?.name || (user ? '游客学子' : '未登录');

  return (
    <nav className="sticky top-0 z-50 h-16 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-full">
          {/* Logo */}
          <button 
            id="nav-logo-btn"
            onClick={() => handleNavClick('landing')}
            className="flex items-center gap-2 text-blue-600 font-bold text-xl cursor-pointer hover:opacity-90 transition-opacity"
          >
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <span className="font-display tracking-tight text-slate-900">
              精准<span className="text-blue-600">职达</span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.view}
                id={`nav-item-${item.view}`}
                onClick={() => handleNavClick(item.view)}
                className={`relative h-16 px-1 flex items-center text-sm font-medium transition-colors cursor-pointer ${
                  isNavActive(item.view) 
                    ? 'text-blue-600' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isNavActive(item.view) && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* User Section */}
          <div className="hidden md:flex items-center gap-4">
            <button
              id="nav-share-btn"
              onClick={() => onOpenModal('share')}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium"
            >
              分享好友
            </button>

            {user ? (
              <div className="relative">
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {avatarChar}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 max-w-[80px] truncate">{userName}</span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-sm text-slate-700 z-50">
                    <button
                      onClick={() => handleNavClick('profile')}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <User className="w-4 h-4" /> 个人中心
                    </button>
                    <button
                      onClick={() => handleNavClick('upload')}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <Award className="w-4 h-4" /> 重新匹配测评
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={handleLogoutClick}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-red-600 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> 退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLoginClick}
                className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-semibold cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" /> 快捷登录
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-3">
            <button
              id="nav-share-mobile-btn"
              onClick={() => onOpenModal('share')}
              className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg"
            >
              分享
            </button>
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-md py-4 px-4 flex flex-col gap-3 z-40">
          {navItems.map((item) => (
            <button
              key={item.view}
              id={`nav-item-mobile-${item.view}`}
              onClick={() => handleNavClick(item.view)}
              className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isNavActive(item.view)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between px-4">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {avatarChar}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{userName}</div>
                    <div className="text-[10px] text-slate-500">
                      {userProfile?.school || '清华大学'} · {userProfile?.major || '计算机'}
                    </div>
                  </div>
                </div>
                <button
                  id="mobile-user-profile-btn"
                  onClick={() => handleNavClick('profile')}
                  className="text-xs text-blue-600 font-medium hover:underline"
                >
                  管理
                </button>
              </>
            ) : (
              <button
                onClick={handleLoginClick}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold text-center"
              >
                快捷登录
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
