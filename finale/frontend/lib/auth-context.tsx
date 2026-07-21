'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { User } from './api';

interface AuthContextValue {
  user: User;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// No-login testing build: there is no /login or /register page, and the
// frontend never calls the backend to authenticate. Every session is this
// fixed demo user. The backend's JwtAuthGuard independently treats every
// request as this same demo account (see
// backend/src/common/guards/jwt-auth.guard.ts) — the two are just kept in
// sync for display purposes, nothing here needs to reach the network.
//
// To restore real sign-in for a production deployment, bring back
// app/login/page.tsx + app/register/page.tsx and the login()/register()/
// api.me() calls this replaced.
const DEMO_USER: User = {
  id: 'demo',
  email: 'demo@example.com',
  displayName: 'Demo Reader',
  avatarUrl: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState<User>(DEMO_USER);

  return (
    <AuthContext.Provider value={{ user, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
