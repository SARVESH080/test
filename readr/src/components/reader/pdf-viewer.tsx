"use client";

import * as React from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { ZoomIn, ZoomOut, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPdfJs } from "@/lib/pdfjs-loader";
import { loadProgress, saveProgress } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface PdfViewerProps {
  bookId: string;
  fileData: ArrayBuffer;
  theme: "light" | "dark" | "sepia";
  chromeVisible: boolean;
  searchOpen: boolean;
  onCloseSearch: () => void;
  onProgress: (percent: number) => void;
  registerZoomHandlers?: (handlers: { zoomIn: () => void; zoomOut: () => void }) => void;
}

interface SearchMatch {
  page: number;
  snippet: string;
}

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.6;
const SWIPE_THRESHOLD = 90;

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "38%" : "-38%",
    rotateY: direction > 0 ? 22 : -22,
    opacity: 0,
    scale: 0.94,
  }),
  center: {
    x: 0,
    rotateY: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-38%" : "38%",
    rotateY: direction > 0 ? -18 : 18,
    opacity: 0,
    scale: 0.94,
  }),
};

export function PdfViewer({
  bookId,
  fileData,
  theme,
  chromeVisible,
  searchOpen,
  onCloseSearch,
  onProgress,
  registerZoomHandlers,
}: PdfViewerProps) {
  const pdfRef = React.useRef<PDFDocumentProxy | null>(null);
  const cacheRef = React.useRef<Map<number, string>>(new Map());
  const renderingRef = React.useRef<Set<number>>(new Set());

  const [numPages, setNumPages] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [direction, setDirection] = React.useState(1);
  const [scale, setScale] = React.useState(1.15);
  const [estimatedSize, setEstimatedSize] = React.useState<{ w: number; h: number } | null>(null);
  const [currentImg, setCurrentImg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [pageBusy, setPageBusy] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchMatch[]>([]);
  const [searching, setSearching] = React.useState(false);

  const scaleRef = React.useRef(scale);
  scaleRef.current = scale;
  const currentPageRef = React.useRef(currentPage);
  currentPageRef.current = currentPage;

  // Load the PDF document once.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await getPdfJs();
        const pdf = await pdfjs.getDocument({ data: fileData.slice(0) }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);

        const firstPage = await pdf.getPage(1);
        const vp = firstPage.getViewport({ scale: scaleRef.current });
        if (!cancelled) setEstimatedSize({ w: vp.width, h: vp.height });

        const saved = loadProgress<{ page: number; zoom: number }>(bookId);
        const startPage = saved?.page && saved.page <= pdf.numPages ? saved.page : 1;
        if (saved?.zoom) setScale(saved.zoom);
        setCurrentPage(startPage);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoadError("This PDF couldn't be opened. It may be corrupted or password-protected.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      pdfRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileData]);

  // Render a page (with cache) to a data URL.
  const renderPage = React.useCallback(async (pageNum: number): Promise<string | null> => {
    const pdf = pdfRef.current;
    if (!pdf || pageNum < 1 || pageNum > pdf.numPages) return null;
    const cacheKey = pageNum;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) return cached;
    if (renderingRef.current.has(pageNum)) return null;
    renderingRef.current.add(pageNum);
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: scaleRef.current });
      const outputScale = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
      await page.render({ canvasContext: ctx, viewport, transform }).promise;
      const dataUrl = canvas.toDataURL("image/png");
      cacheRef.current.set(cacheKey, dataUrl);
      // Keep the cache small — drop pages far from the current one.
      if (cacheRef.current.size > 7) {
        const keep = new Set([
          currentPageRef.current - 2,
          currentPageRef.current - 1,
          currentPageRef.current,
          currentPageRef.current + 1,
          currentPageRef.current + 2,
        ]);
        Array.from(cacheRef.current.keys()).forEach((k) => {
          if (!keep.has(k)) cacheRef.current.delete(k);
        });
      }
      return dataUrl;
    } finally {
      renderingRef.current.delete(pageNum);
    }
  }, []);

  // Whenever the current page or scale changes: show it (rendering if needed)
  // and warm the cache for its neighbors so page turns feel instant.
  React.useEffect(() => {
    if (!numPages) return;
    let cancelled = false;
    setPageBusy(!cacheRef.current.has(currentPage));
    renderPage(currentPage).then((url) => {
      if (!cancelled && url) {
        setCurrentImg(url);
        setPageBusy(false);
      }
    });
    renderPage(currentPage + 1);
    renderPage(currentPage - 1);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, numPages, scale]);

  // Persist progress.
  React.useEffect(() => {
    if (!numPages) return;
    onProgress(Math.round((currentPage / numPages) * 100));
    saveProgress(bookId, { page: currentPage, zoom: scale });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, numPages, scale]);

  const goToPage = React.useCallback(
    (target: number) => {
      setDirection(target > currentPageRef.current ? 1 : -1);
      setCurrentPage(() => Math.min(Math.max(1, target), numPages || 1));
    },
    [numPages]
  );

  const nextPage = React.useCallback(() => goToPage(currentPageRef.current + 1), [goToPage]);
  const prevPage = React.useCallback(() => goToPage(currentPageRef.current - 1), [goToPage]);

  // Keyboard navigation.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") nextPage();
      if (e.key === "ArrowLeft") prevPage();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextPage, prevPage]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -SWIPE_THRESHOLD) nextPage();
    else if (info.offset.x > SWIPE_THRESHOLD) prevPage();
  }

  // Rebuild the cache whenever zoom changes (rendered bitmaps are stale).
  React.useEffect(() => {
    cacheRef.current.clear();
  }, [scale]);

  const zoomIn = React.useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, +(s + 0.15).toFixed(2)));
  }, []);
  const zoomOut = React.useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, +(s - 0.15).toFixed(2)));
  }, []);

  React.useEffect(() => {
    registerZoomHandlers?.({ zoomIn, zoomOut });
  }, [registerZoomHandlers, zoomIn, zoomOut]);

  // Search across all pages (independent of what's currently rendered).
  const runSearch = React.useCallback(async () => {
    const pdf = pdfRef.current;
    if (!pdf || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const query = searchQuery.trim().toLowerCase();
    const results: SearchMatch[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
        const lowerText = text.toLowerCase();
        const idx = lowerText.indexOf(query);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(text.length, idx + query.length + 40);
          results.push({
            page: i,
            snippet: (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : ""),
          });
        }
      } catch {
        // skip page on error
      }
      if (results.length >= 40) break;
    }
    setSearchResults(results);
    setSearching(false);
  }, [searchQuery]);

  function jumpToResult(pageNum: number) {
    goToPage(pageNum);
    onCloseSearch();
  }

  const themeFilter =
    theme === "dark"
      ? "invert(0.93) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(1.05)"
      : theme === "sepia"
      ? "sepia(0.4) brightness(0.97) contrast(0.98)"
      : "none";

  const bgColor = theme === "dark" ? "#161311" : theme === "sepia" ? "#e8dcc0" : "#e5e0d8";

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full" style={{ backgroundColor: bgColor }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ backgroundColor: bgColor }}>
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      )}

      {!loading && (
        <div
          className="flex h-full w-full items-center justify-center overflow-hidden px-2 py-16 sm:px-8"
          style={{ perspective: 1800 }}
        >
          <div
            className="relative"
            style={{
              width: estimatedSize
                ? `min(calc(100vw - 32px), calc((100dvh - 170px) * ${estimatedSize.w / estimatedSize.h}))`
                : "80%",
              aspectRatio: estimatedSize ? `${estimatedSize.w} / ${estimatedSize.h}` : undefined,
            }}
          >
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={currentPage}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 280, damping: 32 },
                  rotateY: { type: "spring", stiffness: 280, damping: 32 },
                  opacity: { duration: 0.18 },
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                style={{ transformStyle: "preserve-3d" }}
                className="pdf-page-shadow absolute inset-0 flex items-center justify-center rounded-[2px] bg-white"
              >
                {currentImg && !pageBusy ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentImg}
                    alt={`Page ${currentPage}`}
                    draggable={false}
                    className="h-full w-full select-none rounded-[2px] object-contain"
                    style={{ filter: themeFilter }}
                  />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Invisible tap zones for click-to-turn */}
            <button
              aria-label="Previous page"
              onClick={prevPage}
              className="absolute left-0 top-0 z-10 h-full w-[15%] cursor-w-resize"
            />
            <button
              aria-label="Next page"
              onClick={nextPage}
              className="absolute right-0 top-0 z-10 h-full w-[15%] cursor-e-resize"
            />
          </div>
        </div>
      )}

      {/* Page indicator + nav controls */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-6 z-20 flex items-center justify-center gap-3 transition-opacity duration-300",
          chromeVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <Button variant="secondary" size="icon" className="rounded-full shadow-lg" onClick={prevPage} aria-label="Previous page">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="rounded-full border border-border bg-card/95 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow backdrop-blur-sm">
          {currentPage} / {numPages || "…"}
        </span>
        <Button variant="secondary" size="icon" className="rounded-full shadow-lg" onClick={nextPage} aria-label="Next page">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Zoom controls */}
      <div
        className={cn(
          "fixed bottom-6 right-4 z-20 flex flex-col overflow-hidden rounded-full border border-border bg-card/95 shadow-lg backdrop-blur-sm transition-opacity duration-300 sm:right-6",
          chromeVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <Button variant="ghost" size="icon" className="rounded-none" onClick={zoomIn} aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="border-t border-border" />
        <Button variant="ghost" size="icon" className="rounded-none" onClick={zoomOut} aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Search panel */}
      {searchOpen && (
        <div className="fixed inset-x-0 top-[52px] z-30 flex justify-center px-3 sm:top-[60px]">
          <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center gap-2 border-b border-border p-2.5">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Search in this PDF…"
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
                    onClick={() => jumpToResult(r.page)}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <span className="mr-2 font-medium text-accent">p.{r.page}</span>
                    <span className="text-muted-foreground">{r.snippet}</span>
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
