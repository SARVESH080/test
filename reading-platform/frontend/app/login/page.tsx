'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linen-100 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-3xl text-ink-900">Welcome back</h1>
        <p className="mb-8 text-sm text-ink-900/60">Pick up where you left off.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-900/60">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-ink-900/15 bg-white px-3 py-2 text-ink-900 outline-none focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-900/60">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-ink-900/15 bg-white px-3 py-2 text-ink-900 outline-none focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-ink-900 py-2.5 font-medium text-ink-50 transition hover:bg-ink-700 disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-900/60">
          New here?{' '}
          <Link href="/register" className="text-brass-600 underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
