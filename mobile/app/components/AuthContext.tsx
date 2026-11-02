import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadSession, loginWithCredentials, logoutSession, type AuthSession } from '../../lib/auth';

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthSession>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const loaded = await loadSession();
        if (active) {
          setSession(loaded);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    hydrate();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isLoading,
    login: async (username: string, password: string) => {
      const nextSession = await loginWithCredentials(username, password);
      setSession(nextSession);
      return nextSession;
    },
    logout: async () => {
      await logoutSession();
      setSession(null);
    },
  }), [session, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
