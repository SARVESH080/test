"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UploadZone } from "@/components/upload/UploadZone";
import { LibraryGrid } from "@/components/library/LibraryGrid";
import { extractBookFromPdf } from "@/lib/pdf/extractText";
import { saveBook, listBookSummaries, deleteBook } from "@/lib/storage/db";
import { deleteReadingPosition } from "@/lib/storage/settings";
import type { BookRecord, BookSummary } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const summaries = await listBookSummaries();
    setBooks(summaries);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      setProgress(0);
      try {
        const extracted = await extractBookFromPdf(file, setProgress);
        const wordCount = extracted.paragraphs.reduce(
          (sum, p) => sum + (p.text.trim() ? p.text.trim().split(/\s+/).length : 0),
          0
        );
        const book: BookRecord = {
          id: crypto.randomUUID(),
          title: extracted.title,
          author: extracted.author,
          pageCount: extracted.pageCount,
          paragraphs: extracted.paragraphs,
          toc: extracted.toc,
          wordCount,
          addedAt: Date.now(),
          coverPalette: Math.floor(Math.random() * 5),
        };
        if (book.paragraphs.length === 0) {
          throw new Error(
            "No readable text was found in this PDF. Scanned image-only PDFs aren't supported yet."
          );
        }
        await saveBook(book);
        router.push(`/read/${book.id}`);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Something went wrong reading that PDF."
        );
      } finally {
        setBusy(false);
      }
    },
    [router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteBook(id);
      deleteReadingPosition(id);
      refresh();
    },
    [refresh]
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-shell-950">
      <BackgroundTexture />

      <main className="relative mx-auto flex max-w-5xl flex-col px-6 pb-24 pt-16 sm:pt-24">
        <header className="animate-fade-up mb-14 flex flex-col items-center text-center">
          <div className="mb-5 flex items-center gap-2 rounded-full border border-shell-line bg-shell-900/60 px-4 py-1.5 font-ui text-xs uppercase tracking-[0.18em] text-brass-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brass-500" />
            Reading, uninterrupted
          </div>
          <h1 className="max-w-2xl font-display text-4xl font-medium leading-[1.1] text-cloud-050 sm:text-5xl">
            Turn any PDF into a book worth losing yourself in
          </h1>
          <p className="mt-4 max-w-md font-ui text-base text-cloud-100/60">
            Fernweg reflows your document into calm, paginated pages —
            typography, spacing, and stillness borrowed from the best
            e-readers.
          </p>
        </header>

        <section
          className="animate-fade-up mx-auto w-full max-w-xl"
          style={{ animationDelay: "80ms" }}
        >
          <UploadZone
            onFile={handleFile}
            busy={busy}
            progress={progress}
            progressLabel={progress < 1 ? "Extracting text…" : "Composing pages…"}
          />
          {error && (
            <p className="mt-3 text-center font-ui text-sm text-red-300/90">
              {error}
            </p>
          )}
        </section>

        {loaded && (
          <section className="mt-20">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl text-cloud-050">Your shelf</h2>
              {books.length > 0 && (
                <span className="font-ui text-xs text-cloud-100/40">
                  {books.length} {books.length === 1 ? "book" : "books"}
                </span>
              )}
            </div>
            <LibraryGrid
              books={books}
              onOpen={(id) => router.push(`/read/${id}`)}
              onDelete={handleDelete}
            />
          </section>
        )}
      </main>
    </div>
  );
}

function BackgroundTexture() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0">
      <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-brass-600/10 blur-[120px]" />
      <div className="absolute inset-0 opacity-[0.035] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:22px_22px]" />
    </div>
  );
}
