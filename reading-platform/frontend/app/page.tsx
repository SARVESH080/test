'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/library' : '/login');
  }, [loading, user, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-ink-900 text-ink-50">
      <p className="font-display text-lg tracking-wide">Reader</p>
    </div>
  );
}
