"use client";

import * as React from "react";
import { ZoomIn, ZoomOut, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPdfJs } from "@/lib/pdfjs-loader";
import { loadProgress, saveProgress } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

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

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pdfRef = React.useRef<PDFDocumentProxy | null>(null);
  const pageRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());
  const renderedPages = React.useRef<Set<number>>(new Set());
  const renderTasks = React.useRef<Map<number, ReturnType<PDFPageProxy["render"]>>>(new Map());

  const [numPages, setNumPages] = React.useState(0);
  const [scale, setScale] = React.useState(1.1);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [estimatedSize, setEstimatedSize] = React.useState<{ w: number; h: number } | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchMatch[]>([]);
  const [searching, setSearching] = React.useState(false);
  const scaleRef = React.useRef(scale);
  scaleRef.current = scale;

  // Load the PDF document once.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await getPdfJs();
        const loadingTask = pdfjs.getDocument({ data: fileData.slice(0) });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        try {
          const firstPage = await pdf.getPage(1);
          const vp = firstPage.getViewport({ scale: scaleRef.current });
          if (!cancelled) setEstimatedSize({ w: vp.width, h: vp.height });
        } catch {
          // non-fatal; pages will just size themselves once rendered
        }
        setLoading(false);
      } catch (err) {
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

  const renderPage = React.useCallback(async (pageNum: number) => {
    const pdf = pdfRef.current;
    const container = pageRefs.current.get(pageNum);
    if (!pdf || !container) return;

    const canvas = container.querySelector("canvas") as HTMLCanvasElement | null;
    const textLayerDiv = container.querySelector(".pdf-text-layer") as HTMLDivElement | null;
    if (!canvas) return;

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: scaleRef.current });
    const outputScale = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    container.style.width = `${Math.floor(viewport.width)}px`;
    container.style.height = `${Math.floor(viewport.height)}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

    const prevTask = renderTasks.current.get(pageNum);
    if (prevTask) {
      try {
        prevTask.cancel();
      } catch {
        // ignore
      }
    }

    const task = page.render({
      canvasContext: ctx,
      viewport,
      transform,
    });
    renderTasks.current.set(pageNum, task);

    try {
      await task.promise;
    } catch {
      return;
    }

    // Text layer for selection + search highlighting.
    if (textLayerDiv) {
      textLayerDiv.innerHTML = "";
      textLayerDiv.style.width = `${Math.floor(viewport.width)}px`;
      textLayerDiv.style.height = `${Math.floor(viewport.height)}px`;
      textLayerDiv.style.setProperty("--scale-factor", String(scaleRef.current));
      try {
        const pdfjs = await getPdfJs();
        const textContent = await page.getTextContent();
        const pdfjsAny = pdfjs as unknown as Record<string, any>;
        if (pdfjsAny.TextLayer) {
          // pdfjs-dist v4.x API
          const layer = new pdfjsAny.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          });
          await layer.render();
        } else if (typeof pdfjsAny.renderTextLayer === "function") {
          // older pdfjs-dist API, kept as a fallback
          const renderTask = pdfjsAny.renderTextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
            textDivs: [],
          });
          await renderTask.promise;
        }
      } catch {
        // text layer is a progressive enhancement (selection + highlight
        // only) — search itself uses getTextContent directly, so ignore
        // failures here.
      }
    }

    renderedPages.current.add(pageNum);
  }, []);

  // Re-render all currently rendered pages when scale changes.
  React.useEffect(() => {
    if (!pdfRef.current) return;
    if (estimatedSize) {
      const ratio = estimatedSize.h / estimatedSize.w;
      pdfRef.current.getPage(1).then((p) => {
        const vp = p.getViewport({ scale });
        setEstimatedSize({ w: vp.width, h: vp.width * ratio });
      });
    }
    const toRerender = Array.from(renderedPages.current);
    renderedPages.current.clear();
    toRerender.forEach((p) => renderPage(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // Intersection-based lazy rendering + progress tracking.
  React.useEffect(() => {
    if (loading || !numPages) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = Number(entry.target.getAttribute("data-page"));
          if (entry.isIntersecting) {
            if (!renderedPages.current.has(pageNum)) {
              renderPage(pageNum);
            }
          }
        });

        // Determine most-visible page for progress tracking.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const pageNum = Number(visible.target.getAttribute("data-page"));
          const percent = Math.round((pageNum / numPages) * 100);
          onProgress(percent);
          saveProgress(bookId, { page: pageNum, zoom: scaleRef.current });
        }
      },
      { root: container, rootMargin: "600px 0px 600px 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, numPages]);

  // Restore last page on load.
  React.useEffect(() => {
    if (loading || !numPages) return;
    const saved = loadProgress<{ page: number; zoom: number }>(bookId);
    if (saved?.zoom) setScale(saved.zoom);
    if (saved?.page) {
      requestAnimationFrame(() => {
        const el = pageRefs.current.get(saved.page);
        el?.scrollIntoView({ block: "start" });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, numPages]);

  const zoomIn = React.useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, +(s + 0.15).toFixed(2)));
  }, []);
  const zoomOut = React.useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, +(s - 0.15).toFixed(2)));
  }, []);

  React.useEffect(() => {
    registerZoomHandlers?.({ zoomIn, zoomOut });
  }, [registerZoomHandlers, zoomIn, zoomOut]);

  // Search across all pages.
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
        const text = content.items
          .map((it) => ("str" in it ? it.str : ""))
          .join(" ");
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

  function jumpToPage(pageNum: number) {
    const el = pageRefs.current.get(pageNum);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    onCloseSearch();
  }

  const themeFilter =
    theme === "dark"
      ? "invert(0.92) hue-rotate(180deg) brightness(0.95) contrast(0.95)"
      : theme === "sepia"
      ? "sepia(0.35) brightness(0.98)"
      : "none";

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
        ref={containerRef}
        className="reading-scroll h-full overflow-y-auto overflow-x-hidden"
        style={{ backgroundColor: theme === "dark" ? "#161311" : theme === "sepia" ? "#e8dcc0" : "#e5e0d8" }}
      >
        <div className="flex flex-col items-center gap-6 px-3 py-24 sm:px-6">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              data-page={pageNum}
              ref={(el) => {
                if (el) pageRefs.current.set(pageNum, el);
                else pageRefs.current.delete(pageNum);
              }}
              className="pdf-page-shadow relative bg-white"
              style={{
                filter: themeFilter,
                width: estimatedSize ? `${Math.floor(estimatedSize.w)}px` : undefined,
                height: estimatedSize ? `${Math.floor(estimatedSize.h)}px` : undefined,
              }}
            >
              <canvas className="block" />
              <div
                className="pdf-text-layer pointer-events-auto absolute left-0 top-0 select-text overflow-hidden opacity-100 [&>span]:absolute [&>span]:cursor-text [&>span]:whitespace-pre [&>span]:text-transparent [&>span]:origin-[0%_0%]"
              />
            </div>
          ))}
        </div>
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
                    onClick={() => jumpToPage(r.page)}
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
