"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ArticleViewer } from "@/components/reader/article-viewer";
import { ReaderTopBar } from "@/components/reader/reader-topbar";
import { ReaderProgressBar } from "@/components/reader/reader-progress-bar";
import { ReaderSettingsPanel } from "@/components/reader/reader-settings-panel";
import { useReaderPreferences } from "@/hooks/use-reader-preferences";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useChromeVisibility } from "@/hooks/use-chrome-visibility";
import { extractArticle } from "@/lib/readability";
import { upsertLibraryEntry, hashId } from "@/lib/storage";
import type { ArticleData } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ArticleReaderPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      }
    >
      <ArticleReaderInner />
    </React.Suspense>
  );
}

function ArticleReaderInner() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";

  const { prefs, update } = useReaderPreferences();
  const { isFullscreen, toggle } = useFullscreen();
  const { visible } = useChromeVisibility();

  const [article, setArticle] = React.useState<ArticleData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (!url) {
      setError("No article URL was provided.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/fetch-article?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch article");
        }
        const parsed = extractArticle(data.html, data.finalUrl || url);
        if (cancelled) return;
        setArticle(parsed);
        upsertLibraryEntry({
          id: hashId(url),
          kind: "article",
          title: parsed.title,
          addedAt: Date.now(),
          lastOpenedAt: Date.now(),
        });
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Couldn't extract a readable article from this page."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const bgClass =
    prefs.theme === "dark" ? "bg-[#1a1613]" : prefs.theme === "sepia" ? "bg-[#e8dcc0]" : "bg-[#faf7f0]";

  return (
    <div className={cn("h-screen w-screen overflow-hidden", bgClass)}>
      <ReaderTopBar
        title={article?.title || "Loading article…"}
        subtitle={article?.siteName || undefined}
        onOpenSettings={() => setSettingsOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggle}
        visible={visible}
      />
      <ReaderProgressBar progress={progress} visible={visible} />

      <div className="h-full">
        {loading && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Extracting the article…</p>
          </div>
        )}
        {error && !loading && (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div className="max-w-sm">
              <p className="font-display text-lg font-semibold">
                Couldn't open that article
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <a href="/" className="mt-4 inline-block text-sm text-accent underline">
                Back to home
              </a>
            </div>
          </div>
        )}
        {article && !loading && !error && (
          <ArticleViewer article={article} prefs={prefs} onProgress={setProgress} />
        )}
      </div>

      <ReaderSettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        prefs={prefs}
        onChange={update}
        showTypography
      />
    </div>
  );
}
