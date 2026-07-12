import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInAnonymously
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginAnonymously: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  userProfile: any;
  updateProfile: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const profile = docSnap.data();
            setUserProfile(profile);
            localStorage.setItem('profile_' + currentUser.uid, JSON.stringify(profile));
          } else {
            const initialProfile = {
              uid: currentUser.uid,
              email: currentUser.email || 'anonymous',
              name: currentUser.displayName || '求职学子',
              school: '未填写学校',
              major: '未填写专业',
              graduationYear: '2027',
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, initialProfile);
            setUserProfile(initialProfile);
            localStorage.setItem('profile_' + currentUser.uid, JSON.stringify(initialProfile));
          }
        } catch (e) {
          console.error("Firestore error loading profile, trying local storage:", e);
          const localProfileStr = localStorage.getItem('profile_' + currentUser.uid);
          if (localProfileStr) {
            setUserProfile(JSON.parse(localProfileStr));
          } else {
            const initialProfile = {
              uid: currentUser.uid,
              email: currentUser.email || 'anonymous',
              name: currentUser.displayName || '求职学子',
              school: '未填写学校',
              major: '未填写专业',
              graduationYear: '2027',
              createdAt: new Date().toISOString()
            };
            localStorage.setItem('profile_' + currentUser.uid, JSON.stringify(initialProfile));
            setUserProfile(initialProfile);
          }
        }
      } else {
        // Check if we have a local guest session
        const guestUid = localStorage.getItem('guest_uid');
        if (guestUid) {
          const mockUser = {
            uid: guestUid,
            isAnonymous: true,
            email: 'guest@example.com',
            displayName: '访客学子',
            emailVerified: true
          } as any;
          setUser(mockUser);
          
          const localProfileStr = localStorage.getItem('profile_' + guestUid);
          if (localProfileStr) {
            setUserProfile(JSON.parse(localProfileStr));
          } else {
            const initialProfile = {
              uid: guestUid,
              email: 'guest@example.com',
              name: '访客学子',
              school: '未填写学校',
              major: '未填写专业',
              graduationYear: '2027',
              createdAt: new Date().toISOString()
            };
            localStorage.setItem('profile_' + guestUid, JSON.stringify(initialProfile));
            setUserProfile(initialProfile);
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAnonymously = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.warn("Firebase anonymous authentication is disabled or restricted. Activating Local Guest Mode:", err);
      let guestUid = localStorage.getItem('guest_uid');
      if (!guestUid) {
        guestUid = 'guest_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('guest_uid', guestUid);
      }
      const mockUser = {
        uid: guestUid,
        isAnonymous: true,
        email: 'guest@example.com',
        displayName: '访客学子',
        emailVerified: true
      } as any;

      const localProfileStr = localStorage.getItem('profile_' + guestUid);
      let initialProfile;
      if (localProfileStr) {
        initialProfile = JSON.parse(localProfileStr);
      } else {
        initialProfile = {
          uid: guestUid,
          email: 'guest@example.com',
          name: '访客学子',
          school: '未填写学校',
          major: '未填写专业',
          graduationYear: '2027',
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('profile_' + guestUid, JSON.stringify(initialProfile));
      }

      setUser(mockUser);
      setUserProfile(initialProfile);
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    const credential = await createUserWithEmailAndPassword(auth, email, pass);
    const initialProfile = {
      uid: credential.user.uid,
      email,
      name,
      school: '未填写学校',
      major: '未填写专业',
      graduationYear: '2027',
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', credential.user.uid), initialProfile);
    setUserProfile(initialProfile);
    localStorage.setItem('profile_' + credential.user.uid, JSON.stringify(initialProfile));
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out error:", e);
    }
    localStorage.removeItem('guest_uid');
    setUser(null);
    setUserProfile(null);
    setLoading(false);
  };

  const updateProfile = async (data: any) => {
    if (!user) return;
    const updated = { ...userProfile, ...data };
    
    try {
      if (user.uid && !user.uid.startsWith('guest_')) {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, updated, { merge: true });
      }
    } catch (e) {
      console.error("Failed to sync profile changes with Firestore, saving locally:", e);
    }
    
    localStorage.setItem('profile_' + user.uid, JSON.stringify(updated));
    setUserProfile(updated);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      loginAnonymously,
      loginWithEmail,
      registerWithEmail,
      logout,
      userProfile,
      updateProfile
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
