import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/apiClient';
import { buildGuestImportPayload, type AppUser } from '../lib/userDataStore';

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
    name: '访客学子',
    school: '未填写学校',
    major: '未填写专业',
    graduationYear: '2027',
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

  const refreshMe = async () => {
    try {
      const result = await api.getMe();
      setUser(toAppUser(result.user));
      setUserProfile(result.user);
    } catch (error: any) {
      if (error?.status !== 401) console.error('Failed to refresh user session:', error);
      const guestUid = localStorage.getItem('guest_uid');
      if (guestUid) {
        setUser({ id: guestUid, phone: null, isGuest: true });
        setUserProfile(readGuestProfile(guestUid));
      } else {
        setUser(null);
        setUserProfile(null);
      }
    }
  };

  useEffect(() => {
    refreshMe().finally(() => setLoading(false));
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
      if (guestImportPayload && window.confirm('检测到当前浏览器有游客简历、测评或收藏数据，是否同步到手机号账号？')) {
        await api.importLocalData(guestImportPayload);
        await refreshMe();
      }
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = () => {
    let guestUid = localStorage.getItem('guest_uid');
    if (!guestUid) {
      guestUid = `guest_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('guest_uid', guestUid);
    }
    setUser({ id: guestUid, phone: null, isGuest: true });
    setUserProfile(readGuestProfile(guestUid));
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (user && !user.isGuest) await api.logout();
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Logout failed:', error);
      setUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
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
    await logout();
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
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
