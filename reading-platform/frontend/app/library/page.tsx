'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { api, Book } from '@/lib/api';
import { BookCard } from '@/components/BookCard';
import { AddBookModal } from '@/components/AddBookModal';

export default function LibraryPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'reading' | 'favorites'>('all');

  const refresh = useCallback(() => {
    api
      .listBooks()
      .then(setBooks)
      .finally(() => setLoadingBooks(false));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  // Poll briefly while anything is still processing, so covers/titles fill in.
  useEffect(() => {
    if (!books.some((b) => b.status === 'PROCESSING')) return;
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [books, refresh]);

  if (loading || !user) return null;

  const visible = books.filter((b) => {
    if (filter === 'favorites') return b.isFavorite;
    if (filter === 'reading') return (b.progress?.[0]?.percent ?? 0) > 0 && (b.progress?.[0]?.percent ?? 0) < 100;
    return true;
  });

  return (
    <div className="min-h-screen bg-linen-100">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-900/10 bg-linen-100/90 px-6 py-4 backdrop-blur">
        <h1 className="font-display text-2xl text-ink-900">Your library</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-md bg-ink-900 px-4 py-2 text-sm font-medium text-ink-50 hover:bg-ink-700"
          >
            + Add
          </button>
          <button onClick={logout} className="text-sm text-ink-900/50 hover:text-ink-900">
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6 flex gap-1 rounded-md bg-white p-1 w-fit ring-1 ring-ink-900/5">
          {(['all', 'reading', 'favorites'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-3 py-1.5 text-sm font-medium capitalize transition ${
                filter === f ? 'bg-ink-900 text-ink-50' : 'text-ink-900/50 hover:text-ink-900'
              }`}
            >
              {f === 'all' ? 'Recently added' : f}
            </button>
          ))}
        </div>

        {loadingBooks ? (
          <p className="text-sm text-ink-900/40">Loading your shelf…</p>
        ) : visible.length === 0 ? (
          <div className="shelf-row py-16 text-center">
            <p className="font-display text-lg text-ink-900">This shelf is empty</p>
            <p className="mt-1 text-sm text-ink-900/50">
              Paste an article link or upload a book to get started.
            </p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.03 } } }}
            className="shelf-row grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
          >
            {visible.map((book) => (
              <motion.div
                key={book.id}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              >
                <BookCard book={book} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {showAddModal && (
        <AddBookModal onClose={() => setShowAddModal(false)} onAdded={refresh} />
      )}
    </div>
  );
}
