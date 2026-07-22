"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBook } from "@/lib/storage/db";
import {
  getSettings,
  saveSettings,
  getReadingPosition,
  saveReadingPosition,
} from "@/lib/storage/settings";
import type { BookRecord, ReaderSettings } from "@/lib/types";
import { usePagination } from "@/hooks/usePagination";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { SettingsPanel } from "@/components/reader/SettingsPanel";
import { TocPanel } from "@/components/reader/TocPanel";
import { ProgressSpine } from "@/components/reader/ProgressSpine";

export function ReaderShell({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [book, setBook] = useState<BookRecord | null | undefined>(undefined);
  const [settings, setSettings] = useState<ReaderSettings>(getSettings());
  const [chromeVisible, setChromeVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const restoredRef = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    getBook(bookId).then((b) => {
      if (active) setBook(b ?? null);
    });
    return () => {
      active = false;
    };
  }, [bookId]);

  const {
    frameRef,
    columnsRef,
    page,
    totalPages,
    goTo,
    next,
    prev,
    fraction,
    pageWidth,
  } = usePagination({
    deps: [
      book?.id,
      settings.fontSizePx,
      settings.lineHeight,
      settings.contentWidth,
      settings.fontFamily,
    ],
  });

  // Restore reading position once, after the book & first pagination pass are ready.
  useEffect(() => {
    if (!book || restoredRef.current || totalPages <= 1) return;
    const saved = getReadingPosition(book.id);
    if (saved) {
      const el = columnsRef.current?.querySelector<HTMLElement>(
        `[data-p="${saved.paragraphIndex}"]`
      );
      if (el && pageWidth > 0) {
        goTo(Math.floor(el.offsetLeft / pageWidth));
      } else {
        goTo(Math.round(saved.fraction * (totalPages - 1)));
      }
    }
    restoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, totalPages, pageWidth]);

  // Persist position (debounced) whenever the page changes.
  useEffect(() => {
    if (!book || !restoredRef.current) return;
    const timeout = setTimeout(() => {
      const columns = columnsRef.current;
      let paragraphIndex = 0;
      if (columns && pageWidth > 0) {
        const nodes = columns.querySelectorAll<HTMLElement>("[data-p]");
        for (const node of nodes) {
          if (Math.floor(node.offsetLeft / pageWidth) >= page) {
            paragraphIndex = Number(node.dataset.p);
            break;
          }
          paragraphIndex = Number(node.dataset.p);
        }
      }
      saveReadingPosition({
        bookId: book.id,
        fraction,
        paragraphIndex,
        updatedAt: Date.now(),
      });
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, book, fraction, pageWidth]);

  const updateSettings = useCallback((next: ReaderSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  // Auto-hide chrome after a moment of inactivity while reading.
  const bumpChrome = useCallback((show: boolean) => {
    setChromeVisible(show);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (show) {
      hideTimer.current = setTimeout(() => setChromeVisible(false), 2800);
    }
  }, []);

  useEffect(() => {
    bumpChrome(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") {
        setSettingsOpen(false);
        setTocOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const third = rect.width / 3;
      if (x < third) {
        prev();
        bumpChrome(false);
      } else if (x > third * 2) {
        next();
        bumpChrome(false);
      } else {
        bumpChrome(!chromeVisible);
      }
    },
    [prev, next, chromeVisible, bumpChrome]
  );

  if (book === undefined) {
    return <LoadingState />;
  }
  if (book === null) {
    return <NotFoundState onBack={() => router.push("/")} />;
  }

  const readingFontFamily =
    settings.fontFamily === "serif" ? "var(--font-reading)" : "var(--font-ui)";

  return (
    <div className="fixed inset-0 flex flex-col bg-shell-950">
      <ProgressSpine fraction={fraction} hidden={settingsOpen || tocOpen} />

      <ReaderToolbar
        visible={chromeVisible && !settingsOpen && !tocOpen}
        title={book.title}
        onBack={() => router.push("/")}
        onToggleToc={() => setTocOpen((v) => !v)}
        onToggleSettings={() => setSettingsOpen((v) => !v)}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-3 py-3 sm:px-8 sm:py-8"
        onClick={handleTap}
      >
        <div
          ref={frameRef}
          data-theme={settings.theme}
          className="relative h-full max-h-[900px] w-full overflow-hidden rounded-[22px] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.65)] transition-colors duration-300"
          style={{
            background: "var(--read-bg)",
            maxWidth: settings.contentWidth,
            padding: "clamp(28px, 6vw, 64px) clamp(20px, 5vw, 48px)",
          }}
        >
          <div
            ref={columnsRef}
            className="transition-transform duration-300 ease-out will-change-transform"
            style={{
              color: "var(--read-fg)",
              fontFamily: readingFontFamily,
              fontSize: settings.fontSizePx,
              lineHeight: settings.lineHeight,
              columnGap: 0,
            }}
          >
            {book.paragraphs.map((p, i) =>
              p.isHeading ? (
                <h2
                  key={i}
                  data-p={i}
                  className="mb-4 mt-2 break-inside-avoid font-display text-[1.35em] font-medium leading-snug"
                  style={{ color: "var(--read-accent)" }}
                >
                  {p.text}
                </h2>
              ) : (
                <p key={i} data-p={i} className="mb-[1em] text-justify [text-indent:1.4em]">
                  {p.text}
                </p>
              )
            )}
          </div>
        </div>
      </div>

      <footer
        className={`pointer-events-none fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-4 transition-opacity duration-300 ${
          chromeVisible && !settingsOpen && !tocOpen ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="rounded-full border border-shell-line bg-shell-900/85 px-4 py-1.5 font-ui text-xs text-cloud-100/60 backdrop-blur-md">
          Page {page + 1} of {totalPages} · {Math.round(fraction * 100)}%
        </div>
      </footer>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={updateSettings}
      />
      <TocPanel
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        toc={book.toc}
        onSelect={(paragraphIndex) => {
          const el = columnsRef.current?.querySelector<HTMLElement>(
            `[data-p="${paragraphIndex}"]`
          );
          if (el && pageWidth > 0) {
            goTo(Math.floor(el.offsetLeft / pageWidth));
          }
          setTocOpen(false);
        }}
        currentParagraph={(() => {
          const columns = columnsRef.current;
          if (!columns || pageWidth <= 0) return 0;
          const nodes = columns.querySelectorAll<HTMLElement>("[data-p]");
          let idx = 0;
          for (const node of nodes) {
            if (Math.floor(node.offsetLeft / pageWidth) > page) break;
            idx = Number(node.dataset.p);
          }
          return idx;
        })()}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-shell-950">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-brass-600/30 border-t-brass-300" />
    </div>
  );
}

function NotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-shell-950 text-center">
      <p className="font-display text-xl text-cloud-050">
        This book isn&rsquo;t on the shelf
      </p>
      <button
        onClick={onBack}
        className="rounded-full bg-brass-500 px-5 py-2 font-ui text-sm font-medium text-shell-950 transition-transform hover:scale-105"
      >
        Back to shelf
      </button>
    </div>
  );
}
