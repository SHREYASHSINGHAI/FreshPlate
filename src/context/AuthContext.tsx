import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logout } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MemberRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  householdId: string | null;
  userProfile: any;
  role: MemberRole;
  isGuest: boolean;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: loginWithGoogle,
  logout: logout,
  householdId: null,
  userProfile: null,
  role: 'owner',
  isGuest: false,
  canEdit: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    let profileUnsub: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              email: currentUser.email,
              createdAt: serverTimestamp(),
              sharedWith: [], // Array of UIDs that this user has shared their household with
            });
          } else if (userSnap.data().email !== currentUser.email) {
            await setDoc(userRef, {
              email: currentUser.email
            }, { merge: true });
          }
        } catch (error: any) {
          if (error?.message?.includes('offline') || error?.code === 'not-found' || error?.message?.includes('NOT_FOUND')) {
            console.warn("Firestore sync skipped because database is not yet created or offline.");
          } else {
            console.error("Error creating user profile", error);
          }
        }

        try {
          profileUnsub = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              setUserProfile(doc.data());
            }
          }, (err) => {
             console.warn("Realtime listener failed - DB might not exist yet.");
          });
        } catch (e) {
          console.warn("Failed to attach snapshot listener", e);
        }
      } else {
        setUserProfile(null);
        if (profileUnsub) profileUnsub();
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const householdId = userProfile?.linkedHousehold || user?.uid || null;
  const role: MemberRole = userProfile?.householdRole || 'owner';
  const isGuest = role === 'guest';
  const canEdit = role === 'owner' || role === 'family';

  return (
    <AuthContext.Provider value={{ user, loading, login: loginWithGoogle, logout, householdId, userProfile, role, isGuest, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
