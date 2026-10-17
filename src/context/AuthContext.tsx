import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  loginWithGoogleCredential,
  loginWithGooglePopup,
  loginWithGoogleRedirect,
  checkRedirectResult,
  logout as firebaseLogout,
  db,
} from '../lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isDemo?: boolean;
}

interface AuthContextType {
  user: AppUser | User | null;
  loading: boolean;
  login: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  loginWithGoogleCredential: (idToken: string) => Promise<any>;
  loginWithGooglePopup: () => Promise<any>;
  loginWithGoogleRedirect: () => Promise<any>;
  loginAsDemo: (role?: 'admin' | 'user') => void;
  logout: () => Promise<void>;
  householdId: string | null;
  userProfile: any;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  openAuthModal: () => {},
  closeAuthModal: () => {},
  isAuthModalOpen: false,
  loginWithGoogleCredential: async () => {},
  loginWithGooglePopup: async () => {},
  loginWithGoogleRedirect: async () => {},
  loginAsDemo: () => {},
  logout: async () => {},
  householdId: null,
  userProfile: null,
});

const DEMO_STORAGE_KEY = 'freshplate_demo_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  useEffect(() => {
    let profileUnsub: () => void;

    // Check redirect result on load if user returned from redirect
    checkRedirectResult().then((result) => {
      if (result?.user) {
        setUser(result.user);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        localStorage.removeItem(DEMO_STORAGE_KEY);
        setUser(currentUser);
        setLoading(false);

        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              email: currentUser.email,
              createdAt: serverTimestamp(),
              sharedWith: [],
            });
          } else if (userSnap.data().email !== currentUser.email) {
            await setDoc(
              userRef,
              {
                email: currentUser.email,
              },
              { merge: true }
            );
          }
        } catch (error: any) {
          if (
            error?.message?.includes('offline') ||
            error?.code === 'not-found' ||
            error?.message?.includes('NOT_FOUND') ||
            error?.code === 'permission-denied'
          ) {
            console.warn('Firestore sync skipped (offline or not yet created)');
          } else {
            console.error('Error creating user profile', error);
          }
        }

        try {
          profileUnsub = onSnapshot(
            userRef,
            (doc) => {
              if (doc.exists()) {
                setUserProfile(doc.data());
              }
            },
            (err) => {
              console.warn('Realtime listener failed - DB might not exist yet.');
            }
          );
        } catch (e) {
          console.warn('Failed to attach snapshot listener', e);
        }
      } else {
        // If not logged in via Firebase, check if demo user session exists
        const savedDemo = localStorage.getItem(DEMO_STORAGE_KEY);
        if (savedDemo) {
          try {
            const parsed = JSON.parse(savedDemo);
            setUser(parsed);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setUserProfile(null);
        setLoading(false);
        if (profileUnsub) profileUnsub();
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const handleGoogleCredentialLogin = async (idToken: string) => {
    const result = await loginWithGoogleCredential(idToken);
    closeAuthModal();
    return result;
  };

  const handleGooglePopupLogin = async () => {
    const result = await loginWithGooglePopup();
    closeAuthModal();
    return result;
  };

  const handleGoogleRedirectLogin = async () => {
    closeAuthModal();
    return await loginWithGoogleRedirect();
  };

  const loginAsDemo = (role: 'admin' | 'user' = 'admin') => {
    const demoUser: AppUser = {
      uid: role === 'admin' ? 'demo_admin_uid_777' : 'demo_user_uid_888',
      email: role === 'admin' ? 'shreyashsinghai2005@gmail.com' : 'demo@freshplate.app',
      displayName: role === 'admin' ? 'Shreyash (Admin)' : 'Demo Member',
      photoURL: null,
      isDemo: true,
    };
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
    closeAuthModal();
  };

  const logout = async () => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    await firebaseLogout();
    setUser(null);
    setUserProfile(null);
  };

  const householdId = userProfile?.linkedHousehold || user?.uid || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login: openAuthModal,
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen,
        loginWithGoogleCredential: handleGoogleCredentialLogin,
        loginWithGooglePopup: handleGooglePopupLogin,
        loginWithGoogleRedirect: handleGoogleRedirectLogin,
        loginAsDemo,
        logout,
        householdId,
        userProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
