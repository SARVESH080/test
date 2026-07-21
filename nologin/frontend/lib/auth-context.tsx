'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, User, clearTokens } from './api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The sign-in/register pages have been removed for local testing. Every
// session automatically logs in as the seeded demo account instead
// (see backend/prisma/seed.ts). This still goes through the real login
// endpoint (real JWT, real DB user) — there's just no form to fill in.
const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'password123';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const autoLogin = useCallback(() => {
    setLoading(true);
    api
      .login(DEMO_EMAIL, DEMO_PASSWORD)
      .then(setUser)
      .catch((err) => {
        // Most likely cause: the seed script hasn't been run yet.
        console.warn(
          'Auto-login failed — run "npm run prisma:seed" in /backend, then reload.',
          err,
        );
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const hasToken = typeof window !== 'undefined' && localStorage.getItem('accessToken');
    if (!hasToken) {
      autoLogin();
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => {
        clearTokens();
        autoLogin();
      })
      .finally(() => setLoading(false));
  }, [autoLogin]);

  async function login(email: string, password: string) {
    const u = await api.login(email, password);
    setUser(u);
    router.push('/library');
  }

  async function register(email: string, password: string, displayName: string) {
    const u = await api.register(email, password, displayName);
    setUser(u);
    router.push('/library');
  }

  function logout() {
    clearTokens();
    setUser(null);
    autoLogin();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
