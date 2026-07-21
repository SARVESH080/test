'use client';

import { useState, FormEvent, useRef } from 'react';
import { api } from '@/lib/api';

export function AddBookModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [tab, setTab] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submitUrl(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createFromUrl(url);
      onAdded();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await api.uploadFile(file);
      onAdded();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink-900">Add to your library</h2>
          <button onClick={onClose} className="text-ink-900/40 hover:text-ink-900">
            ✕
          </button>
        </div>

        <div className="mb-5 flex gap-1 rounded-md bg-linen-100 p-1">
          <button
            onClick={() => setTab('url')}
            className={`flex-1 rounded py-1.5 text-sm font-medium transition ${
              tab === 'url' ? 'bg-white shadow-sm text-ink-900' : 'text-ink-900/50'
            }`}
          >
            Paste a link
          </button>
          <button
            onClick={() => setTab('file')}
            className={`flex-1 rounded py-1.5 text-sm font-medium transition ${
              tab === 'file' ? 'bg-white shadow-sm text-ink-900' : 'text-ink-900/50'
            }`}
          >
            Upload a file
          </button>
        </div>

        {tab === 'url' ? (
          <form onSubmit={submitUrl} className="space-y-3">
            <input
              type="url"
              required
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-md border border-ink-900/15 px-3 py-2 text-sm outline-none focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-ink-900 py-2.5 text-sm font-medium text-ink-50 hover:bg-ink-700 disabled:opacity-50"
            >
              {busy ? 'Fetching…' : 'Add article'}
            </button>
          </form>
        ) : (
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="w-full rounded-md border-2 border-dashed border-ink-900/20 py-8 text-sm text-ink-900/60 hover:border-brass-500 hover:text-brass-600 disabled:opacity-50"
            >
              {busy ? 'Uploading…' : 'Click to choose a PDF, DOCX, TXT, or Markdown file'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.markdown"
              className="hidden"
              onChange={submitFile}
            />
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
