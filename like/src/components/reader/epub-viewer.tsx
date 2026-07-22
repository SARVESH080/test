"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadProgress, saveProgress } from "@/lib/storage";
import type { ReaderPreferences } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EpubViewerProps {
  bookId: string;
  fileData: ArrayBuffer;
  prefs: ReaderPreferences;
  chromeVisible: boolean;
  searchOpen: boolean;
  onCloseSearch: () => void;
  onProgress: (percent: number) => void;
  onTitle: (title: string) => void;
}

interface SearchMatch {
  cfi: string;
  excerpt: string;
}

const THEME_COLORS: Record<
  ReaderPreferences["theme"],
  { bg: string; fg: string; link: string }
> = {
  light: { bg: "#faf7f0", fg: "#241f19", link: "#c9631f" },
  dark: { bg: "#1a1613", fg: "#e3ddd3", link: "#e8945a" },
  sepia: { bg: "#e8dcc0", fg: "#3d2b12", link: "#a34c18" },
};

const FONT_STACKS: Record<ReaderPreferences["fontFamily"], string> = {
  reading: "Literata, Georgia, serif",
  serif: "'Source Serif 4', Georgia, serif",
  sans: "Inter, system-ui, sans-serif",
  dyslexic: "Verdana, sans-serif",
};

const WIDTH_MAP: Record<ReaderPreferences["readingWidth"], string> = {
  narrow: "440px",
  medium: "620px",
  wide: "820px",
};

export function EpubViewer({
  bookId,
  fileData,
  prefs,
  chromeVisible,
  searchOpen,
  onCloseSearch,
  onProgress,
  onTitle,
}: EpubViewerProps) {
  const viewerRef = React.useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookRef = React.useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renditionRef = React.useRef<any>(null);
  const locationsReady = React.useRef(false);

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchMatch[]>([]);
  const [searching, setSearching] = React.useState(false);

  // Initialize book + rendition once.
  React.useEffect(() => {
    let cancelled = false;
    let rendition: any;
    let book: any;

    (async () => {
      try {
        const ePub = (await import("epubjs")).default;
        book = ePub(fileData.slice(0));
        bookRef.current = book;

        await book.ready;
        if (cancelled || !viewerRef.current) return;

        rendition = book.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "none",
          allowScriptedContent: false,
        });
        renditionRef.current = rendition;

        registerThemes(rendition);
        applyTheme(rendition, prefs);

        const saved = loadProgress<{ cfi: string }>(bookId);
        await rendition.display(saved?.cfi || undefined);

        rendition.on("relocated", (location: any) => {
          if (location?.start?.cfi) {
            saveProgress(bookId, { cfi: location.start.cfi });
            if (locationsReady.current) {
              const percent = Math.round(
                book.locations.percentageFromCfi(location.start.cfi) * 100
              );
              onProgress(percent);
            }
          }
        });

        book.loaded.metadata.then((meta: any) => {
          if (meta?.title) onTitle(meta.title);
        });

        // Generate locations in the background for accurate progress %.
        book.locations.generate(1600).then(() => {
          locationsReady.current = true;
        });

        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            "This EPUB couldn't be opened. The file may be corrupted or in an unsupported format."
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        rendition?.destroy();
      } catch {
        // ignore
      }
      try {
        book?.destroy();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileData, bookId]);

  // Re-apply theme / typography whenever prefs change.
  React.useEffect(() => {
    if (renditionRef.current) {
      applyTheme(renditionRef.current, prefs);
    }
  }, [prefs]);

  function registerThemes(rendition: any) {
    (Object.keys(THEME_COLORS) as ReaderPreferences["theme"][]).forEach((key) => {
      const c = THEME_COLORS[key];
      rendition.themes.register(key, {
        body: {
          background: `${c.bg} !important`,
          color: `${c.fg} !important`,
        },
        a: { color: `${c.link} !important` },
        "::selection": { background: `${c.link}55` },
      });
    });
  }

  function applyTheme(rendition: any, p: ReaderPreferences) {
    rendition.themes.select(p.theme);
    rendition.themes.fontSize(`${p.fontSize}px`);
    rendition.themes.font(FONT_STACKS[p.fontFamily]);
    rendition.themes.override("line-height", String(p.lineSpacing));
    rendition.themes.override("max-width", WIDTH_MAP[p.readingWidth]);
    rendition.themes.override("margin", "0 auto");
  }

  function nextPage() {
    renditionRef.current?.next();
  }
  function prevPage() {
    renditionRef.current?.prev();
  }

  // Keyboard navigation.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") nextPage();
      if (e.key === "ArrowLeft") prevPage();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function runSearch() {
    const book = bookRef.current;
    if (!book || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const query = searchQuery.trim();
    const results: SearchMatch[] = [];
    try {
      const spineItems: any[] = book.spine.spineItems;
      for (const item of spineItems) {
        try {
          await item.load(book.load.bind(book));
          const matches = item.find ? item.find(query) : [];
          matches.forEach((m: any) => {
            results.push({ cfi: m.cfi, excerpt: m.excerpt });
          });
          item.unload();
        } catch {
          // skip section on error
        }
        if (results.length >= 40) break;
      }
    } catch {
      // ignore
    }
    setSearchResults(results);
    setSearching(false);
  }

  function jumpToResult(cfi: string) {
    renditionRef.current?.display(cfi);
    onCloseSearch();
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      )}

      <div
        ref={viewerRef}
        className="h-full w-full"
        style={{ backgroundColor: THEME_COLORS[prefs.theme].bg }}
      />

      {/* Tap zones for page turn (desktop uses buttons; mobile can tap edges) */}
      <button
        aria-label="Previous page"
        onClick={prevPage}
        className="absolute left-0 top-0 h-full w-[12%] cursor-w-resize"
      />
      <button
        aria-label="Next page"
        onClick={nextPage}
        className="absolute right-0 top-0 h-full w-[12%] cursor-e-resize"
      />

      <div
        className={cn(
          "fixed inset-x-0 bottom-6 z-20 flex justify-center gap-3 transition-opacity duration-300",
          chromeVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <Button variant="secondary" size="icon" className="rounded-full shadow-lg" onClick={prevPage} aria-label="Previous page">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button variant="secondary" size="icon" className="rounded-full shadow-lg" onClick={nextPage} aria-label="Next page">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {searchOpen && (
        <div className="fixed inset-x-0 top-[52px] z-30 flex justify-center px-3 sm:top-[60px]">
          <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center gap-2 border-b border-border p-2.5">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Search in this book…"
                className="h-8 flex-1 bg-transparent px-2 text-sm outline-none"
              />
              <Button size="sm" variant="secondary" onClick={runSearch} disabled={searching}>
                {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
              </Button>
              <Button size="icon" variant="ghost" onClick={onCloseSearch} aria-label="Close search">
                <X className="h-4 w-4" />
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="reading-scroll max-h-72 overflow-y-auto p-1.5">
                {searchResults.map((r, idx) => (
                  <button
                    key={idx}
                    onClick={() => jumpToResult(r.cfi)}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <span className="text-muted-foreground">{r.excerpt}</span>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && !searching && searchResults.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">No matches found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
