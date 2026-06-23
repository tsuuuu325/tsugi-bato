import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAuthSession, subscribeAuthChanges } from '@/lib/auth';
import { linkAuthUser, resetDeviceSyncPull } from '@/lib/deviceSync';
import { useSongStore } from '@/store/songStore';
import { getUserProfile } from '@/lib/profile';

interface AuthContextValue {
  userId: string | null;
  email: string | null;
  loading: boolean;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  email: null,
  loading: true,
  isLoggedIn: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const init = useSongStore((s) => s.init);
  const refreshLists = useSongStore((s) => s.refreshLists);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    let cancelled = false;

    const applySession = async (session: Awaited<ReturnType<typeof getAuthSession>>) => {
      const id = session?.user?.id ?? null;
      const mail = session?.user?.email ?? null;
      setUserId(id);
      setEmail(mail);
      if (id) {
        resetDeviceSyncPull();
        await linkAuthUser(id, mail ?? undefined);
        refreshLists();
      }
    };

    void getAuthSession().then((session) => {
      if (cancelled) return;
      void applySession(session).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

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
      userId: userId ?? getUserProfile().authUserId ?? null,
      email,
      loading,
      isLoggedIn: Boolean(userId ?? getUserProfile().authUserId),
    }}>
      {children}
    </AuthContext.Provider>
  );
}
