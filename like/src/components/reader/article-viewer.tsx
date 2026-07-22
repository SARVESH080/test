"use client";

import * as React from "react";
import type { ArticleData, ReaderPreferences } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ArticleViewerProps {
  article: ArticleData;
  prefs: ReaderPreferences;
  onProgress: (percent: number) => void;
}

const WIDTH_MAP: Record<ReaderPreferences["readingWidth"], string> = {
  narrow: "max-w-[38rem]",
  medium: "max-w-[46rem]",
  wide: "max-w-[58rem]",
};

const FONT_MAP: Record<ReaderPreferences["fontFamily"], string> = {
  reading: "font-reading",
  serif: "font-serif",
  sans: "font-sans",
  dyslexic: "font-sans",
};

export function ArticleViewer({ article, prefs, onProgress }: ArticleViewerProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function handleScroll() {
      if (!el) return;
      const scrollable = el.scrollHeight - el.clientHeight;
      const percent = scrollable > 0 ? Math.round((el.scrollTop / scrollable) * 100) : 100;
      onProgress(percent);
    }
    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article]);

  const readingMinutes = Math.max(1, Math.round(article.length / 1000));

  return (
    <div
      ref={scrollRef}
      className={cn(
        "reading-scroll reader-surface h-full overflow-y-auto",
        prefs.theme === "dark" && "reader-theme-dark",
        prefs.theme === "sepia" && "reader-theme-sepia",
        prefs.theme === "light" && "reader-theme-light"
      )}
    >
      <article
        className={cn(
          "article-content mx-auto px-6 pb-32 pt-24 sm:px-8",
          WIDTH_MAP[prefs.readingWidth],
          FONT_MAP[prefs.fontFamily]
        )}
        style={{
          fontSize: `${prefs.fontSize}px`,
          lineHeight: prefs.lineSpacing,
        }}
      >
        <header className="mb-8 border-b border-current/10 pb-6">
          {article.siteName && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider opacity-60">
              {article.siteName}
            </p>
          )}
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            {article.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm opacity-60">
            {article.byline && <span>{article.byline}</span>}
            {article.byline && <span>·</span>}
            <span>{readingMinutes} min read</span>
          </div>
        </header>

        <div dangerouslySetInnerHTML={{ __html: article.contentHtml }} />

        <footer className="mt-12 border-t border-current/10 pt-6 text-xs opacity-50">
          Original article:{" "}
          <a href={article.sourceUrl} target="_blank" rel="noreferrer" className="underline">
            {article.sourceUrl}
          </a>
        </footer>
      </article>
    </div>
  );
}
