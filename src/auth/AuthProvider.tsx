import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { bootstrapAuthSession, subscribeAuthChanges, isAuthConfigured } from '@/lib/auth';
import { linkAuthUser, resetDeviceSyncPull } from '@/lib/deviceSync';
import { markAuthReady } from '@/lib/authReady';
import { useSongStore } from '@/store/songStore';
import { getUserProfile, saveUserProfile } from '@/lib/profile';

interface AuthContextValue {
  userId: string | null;
  email: string | null;
  loading: boolean;
  isLoggedIn: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  email: null,
  loading: true,
  isLoggedIn: false,
  authError: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const init = useSongStore((s) => s.init);
  const refreshLists = useSongStore((s) => s.refreshLists);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    let cancelled = false;

    const applySession = async (session: { user?: { id?: string; email?: string | null } } | null) => {
      const id = session?.user?.id ?? null;
      const mail = session?.user?.email ?? null;
      setUserId(id);
      setEmail(mail);

      if (id) {
        resetDeviceSyncPull();
        await linkAuthUser(id, mail ?? undefined);
        refreshLists();
        return;
      }

      const profile = getUserProfile();
      if (profile.authUserId) {
        saveUserProfile({ ...profile, authUserId: undefined });
      }
    };

    const boot = async () => {
      try {
        if (isAuthConfigured()) {
          const { session, error } = await bootstrapAuthSession();
          if (cancelled) return;
          if (error) setAuthError(error);
          await applySession(session);
        }
      } finally {
        if (!cancelled) setLoading(false);
        markAuthReady();
      }
    };

    void boot();

    const unsub = subscribeAuthChanges((session) => {
      void applySession(session);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [refreshLists]);

  return (
    <AuthContext.Provider value={{
      userId,
      email,
      loading,
      isLoggedIn: Boolean(userId),
      authError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
