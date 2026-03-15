import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth } from '../services/firebase';
import { db } from '../services/firebase';
import { getUserProfile, logout, UserProfile, updatePushToken } from '../services/authService';
import { registerForPushNotifications } from '../services/notificationService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastPushRegistrationUid = useRef<string | null>(null);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      try {
        if (firebaseUser) {
          profileUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), async () => {
            try {
              const profile = await getUserProfile(firebaseUser.uid);

              if (!profile?.isActive) {
                await logout();
                setUser(null);
                lastPushRegistrationUid.current = null;
                return;
              }

              setUser(profile);

              if (lastPushRegistrationUid.current !== profile.uid) {
                const token = await registerForPushNotifications();
                if (token) {
                  await updatePushToken(profile.uid, token);
                }
                lastPushRegistrationUid.current = profile.uid;
              }
            } catch (error) {
              console.error('Failed to sync auth profile', error);
              setUser(null);
            } finally {
              setLoading(false);
            }
          });
        } else {
          setUser(null);
          lastPushRegistrationUid.current = null;
        }
      } catch (error) {
        console.error('Failed to restore auth session', error);
        setUser(null);
      } finally {
        if (!firebaseUser) {
          setLoading(false);
        }
      }
    });

    return () => {
      if (profileUnsub) {
        profileUnsub();
      }
      unsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
