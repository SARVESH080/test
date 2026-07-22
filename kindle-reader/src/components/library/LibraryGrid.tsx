"use client";

import type { BookSummary } from "@/lib/types";

const PALETTES = [
  ["#8a6a2f", "#f1e4c8"],
  ["#2a4a3a", "#e6c98a"],
  ["#5c3a2e", "#f6f0e2"],
  ["#3a4a5c", "#e8e0cd"],
  ["#4a3a5c", "#f1e4c8"],
];

interface LibraryGridProps {
  books: BookSummary[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function LibraryGrid({ books, onOpen, onDelete }: LibraryGridProps) {
  if (books.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-shell-line px-8 py-14 text-center">
        <p className="font-display text-lg text-cloud-100/70">
          Your shelf is empty
        </p>
        <p className="mt-1 font-ui text-sm text-cloud-100/45">
          Books you upload will appear here, ready to pick back up.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {books.map((book, i) => {
        const [spine, textColor] = PALETTES[book.coverPalette % PALETTES.length];
        return (
          <div
            key={book.id}
            className="animate-fade-up group relative"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <button
              onClick={() => onOpen(book.id)}
              className="relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-2xl border border-shell-line p-4 text-left shadow-[0_10px_30px_-14px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:-translate-y-1.5"
              style={{ background: spine }}
            >
              <div
                className="absolute inset-y-0 left-0 w-2 bg-black/15"
                aria-hidden
              />
              <span
                className="font-display text-base leading-snug"
                style={{ color: textColor }}
              >
                {book.title}
              </span>
              <div className="space-y-2">
                {book.author && (
                  <p
                    className="font-ui text-xs opacity-70"
                    style={{ color: textColor }}
                  >
                    {book.author}
                  </p>
                )}
                <div className="h-1 w-full overflow-hidden rounded-full bg-black/20">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, Math.round(book.progressFraction * 100))}%`,
                      background: textColor,
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(book.id);
              }}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-shell-950 text-cloud-100/60 opacity-0 shadow transition-opacity duration-200 hover:text-brass-300 group-hover:opacity-100"
              aria-label={`Remove ${book.title}`}
              title="Remove from shelf"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
