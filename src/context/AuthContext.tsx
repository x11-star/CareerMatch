import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/apiClient';
import { buildGuestImportPayload, clearPrivateSessionData, type AppUser } from '../lib/userDataStore';

type UserProfile = {
  id: string;
  phone: string | null;
  name: string | null;
  school: string | null;
  major: string | null;
  graduationYear: string | null;
};

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  sessionError: string;
  authNotice: string;
  userProfile: UserProfile | null;
  isGuest: boolean;
  requestLoginCode: (phone: string) => Promise<{ devCode?: string }>;
  verifyLoginCode: (phone: string, code: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshMe: () => Promise<void>;
  requestChangePhoneCode: () => Promise<{ devCode?: string }>;
  verifyChangePhoneCode: (code: string, newPhone: string) => Promise<void>;
  requestDeleteAccountCode: () => Promise<{ devCode?: string }>;
  deleteAccount: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function createGuestProfile(guestUid: string): UserProfile {
  return {
    id: guestUid,
    phone: null,
    name: null,
    school: null,
    major: null,
    graduationYear: null,
  };
}

function readGuestProfile(guestUid: string): UserProfile {
  const localProfile = localStorage.getItem(`profile_${guestUid}`);
  if (localProfile) {
    try {
      return { ...createGuestProfile(guestUid), ...JSON.parse(localProfile), id: guestUid, phone: null };
    } catch {
      return createGuestProfile(guestUid);
    }
  }
  const profile = createGuestProfile(guestUid);
  localStorage.setItem(`profile_${guestUid}`, JSON.stringify(profile));
  return profile;
}

function toAppUser(serverUser: any): AppUser {
  return { id: serverUser.id, phone: serverUser.phone, isGuest: false };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const authEpoch = useRef(0);

  const refreshMe = async () => {
    const epoch = ++authEpoch.current;
    setLoading(true);
    setSessionError('');
    try {
      const result = await api.getMe();
      if (epoch !== authEpoch.current) return;
      setUser(toAppUser(result.user));
      setUserProfile(result.user);
    } catch (error: any) {
      if (epoch !== authEpoch.current) return;
      if (error?.status !== 401) {
        setSessionError('暂时无法确认登录状态，请重新连接后再试。');
        setUser(null);
        setUserProfile(null);
        return;
      }
      const guestUid = localStorage.getItem('guest_uid');
      if (guestUid) {
        setUser({ id: guestUid, phone: null, isGuest: true });
        setUserProfile(readGuestProfile(guestUid));
      } else {
        setUser(null);
        setUserProfile(null);
      }
    } finally { if (epoch === authEpoch.current) setLoading(false); }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const requestLoginCode = async (phone: string) => {
    const result = await api.requestLoginCode(phone);
    return { devCode: result.devCode };
  };

  const verifyLoginCode = async (phone: string, code: string) => {
    setLoading(true);
    try {
      const result = await api.verifyLoginCode(phone, code);
      setUser(toAppUser(result.user));
      setUserProfile(result.user);
      const guestImportPayload = buildGuestImportPayload(localStorage);
      if (guestImportPayload && window.confirm('检测到当前浏览器有游客简历、测评、求职偏好或收藏数据，是否同步到手机号账号？')) {
        try { await api.importLocalData(guestImportPayload); await refreshMe(); }
        catch { setAuthNotice('已登录，但游客材料未同步。原材料仍保留在此浏览器，请重试同步或重新上传。'); }
      }
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = () => {
    authEpoch.current++;
    setSessionError('');
    let guestUid = localStorage.getItem('guest_uid');
    if (!guestUid) {
      guestUid = `guest_${crypto.randomUUID()}`;
      localStorage.setItem('guest_uid', guestUid);
    }
    setUser({ id: guestUid, phone: null, isGuest: true });
    setUserProfile(readGuestProfile(guestUid));
  };

  const logout = async () => {
    // Keep the session visible on failure so retry is possible; don't claim a server logout.
    if (user && !user.isGuest) await api.logout();
    authEpoch.current++;
    if (user) { try { clearPrivateSessionData(user.id); } catch {} }
    setUser(null);
    setUserProfile(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    if (user.isGuest) {
      const updated = { ...userProfile, ...data, id: user.id, phone: null } as UserProfile;
      localStorage.setItem(`profile_${user.id}`, JSON.stringify(updated));
      setUserProfile(updated);
      return;
    }
    const result = await api.updateMe(data);
    setUserProfile(result.user);
  };

  const requestChangePhoneCode = async () => {
    const result = await api.requestChangePhoneCode();
    return { devCode: result.devCode };
  };

  const verifyChangePhoneCode = async (code: string, newPhone: string) => {
    const result = await api.verifyChangePhoneCode(code, newPhone);
    setUser(toAppUser(result.user));
    setUserProfile(result.user);
  };

  const requestDeleteAccountCode = async () => {
    const result = await api.requestDeleteAccountCode();
    return { devCode: result.devCode };
  };

  const deleteAccount = async (code: string) => {
    await api.deleteAccount(code);
    authEpoch.current++;
    if (user) { try { clearPrivateSessionData(user.id); } catch {} }
    setUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      sessionError,
      authNotice,
      userProfile,
      isGuest: Boolean(user?.isGuest),
      requestLoginCode,
      verifyLoginCode,
      loginAsGuest,
      logout,
      updateProfile,
      refreshMe,
      requestChangePhoneCode,
      verifyChangePhoneCode,
      requestDeleteAccountCode,
      deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
