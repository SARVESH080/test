'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, displayName);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linen-100 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-3xl text-ink-900">Start your library</h1>
        <p className="mb-8 text-sm text-ink-900/60">Articles, books, and PDFs — one shelf.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-900/60">
              Name
            </label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-ink-900/15 bg-white px-3 py-2 text-ink-900 outline-none focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
          </div>
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-ink-900/15 bg-white px-3 py-2 text-ink-900 outline-none focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
            <p className="mt-1 text-xs text-ink-900/40">At least 8 characters.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-ink-900 py-2.5 font-medium text-ink-50 transition hover:bg-ink-700 disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-900/60">
          Already have an account?{' '}
          <Link href="/login" className="text-brass-600 underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
