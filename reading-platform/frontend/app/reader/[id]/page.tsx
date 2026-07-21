'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api, BookDetail } from '@/lib/api';
import { ReaderSettingsPanel, ReaderSettings } from '@/components/ReaderSettingsPanel';

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'light',
  fontFamily: 'reading',
  fontSize: 19,
  lineHeight: 1.7,
  pageWidth: 680,
};

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [book, setBook] = useState<BookDetail | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const contentRef = useRef<HTMLDivElement>(null);
  const secondsSpentRef = useRef(0);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api.getBook(id).then(setBook);
  }, [id, user]);

  useEffect(() => {
    const saved = localStorage.getItem('reader-settings');
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('reader-settings', JSON.stringify(settings));
  }, [settings]);

  // Track time spent and scroll-based progress; save periodically.
  useEffect(() => {
    if (!book) return;
    const interval = setInterval(() => {
      secondsSpentRef.current += 5;
    }, 5000);

    const onScroll = () => {
      const el = document.documentElement;
      const percent = Math.min(
        100,
        Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight || 1)) * 100),
      );
      saveProgressDebounced(percent);
    };
    window.addEventListener('scroll', onScroll);

    const saveInterval = setInterval(() => {
      if (secondsSpentRef.current > 0) {
        api.updateProgress(book.id, currentPercentRef.current, secondsSpentRef.current);
        secondsSpentRef.current = 0;
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      clearInterval(saveInterval);
      window.removeEventListener('scroll', onScroll);
    };
  }, [book]);

  const currentPercentRef = useRef(0);
  function saveProgressDebounced(percent: number) {
    currentPercentRef.current = percent;
  }

  if (loading || !user || !book) return null;

  const chapter = book.chapters[0];

  return (
    <div data-reader-theme={settings.theme} className="reading-surface min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-current/10 px-6 py-3">
        <Link href="/library" className="text-sm opacity-60 hover:opacity-100">
          ← Library
        </Link>
        <p className="truncate text-sm font-medium opacity-80">{book.title}</p>
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-md border border-current/15 px-3 py-1.5 text-sm opacity-80 hover:opacity-100"
        >
          Aa
        </button>
      </header>

      <main
        ref={contentRef}
        className="mx-auto px-6 py-12"
        style={{ maxWidth: settings.pageWidth }}
      >
        {book.author && <p className="mb-1 text-sm opacity-60">{book.author}</p>}
        <h1 className="mb-8 font-display text-3xl leading-tight">{book.title}</h1>
        <div
          className={settings.fontFamily === 'reading' ? 'font-reading' : 'font-sans'}
          style={{ fontSize: settings.fontSize, lineHeight: settings.lineHeight }}
          dangerouslySetInnerHTML={{ __html: chapter?.contentHtml || '' }}
        />
      </main>

      <ReaderSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
      />
    </div>
  );
}
