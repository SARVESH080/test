"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PdfViewer } from "@/components/reader/pdf-viewer";
import { ReaderTopBar } from "@/components/reader/reader-topbar";
import { ReaderProgressBar } from "@/components/reader/reader-progress-bar";
import { ReaderSettingsPanel } from "@/components/reader/reader-settings-panel";
import { useReaderPreferences } from "@/hooks/use-reader-preferences";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useChromeVisibility } from "@/hooks/use-chrome-visibility";
import { getBlob } from "@/lib/blob-store";
import { upsertLibraryEntry } from "@/lib/storage";
import { cn } from "@/lib/utils";

export default function PdfReaderPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      }
    >
      <PdfReaderInner />
    </React.Suspense>
  );
}

function PdfReaderInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const fileName = searchParams.get("name") || "Untitled PDF";

  const { prefs, update } = useReaderPreferences();
  const { isFullscreen, toggle } = useFullscreen();
  const { visible } = useChromeVisibility();

  const [fileData, setFileData] = React.useState<ArrayBuffer | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const zoomHandlers = React.useRef<{ zoomIn: () => void; zoomOut: () => void } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const record = await getBlob(params.id);
      if (cancelled) return;
      if (!record) {
        setNotFound(true);
        return;
      }
      const buf = await record.blob.arrayBuffer();
      if (cancelled) return;
      setFileData(buf);
      upsertLibraryEntry({
        id: params.id,
        kind: "pdf",
        title: record.fileName,
        addedAt: record.savedAt,
        lastOpenedAt: Date.now(),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const bgClass =
    prefs.theme === "dark" ? "bg-[#161311]" : prefs.theme === "sepia" ? "bg-[#e8dcc0]" : "bg-[#e5e0d8]";

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="font-display text-lg font-semibold">We couldn't find that file</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Uploaded files only live in this browser tab's memory. Please go
          back and upload the PDF again.
        </p>
        <a href="/" className="text-sm text-accent underline">
          Back to home
        </a>
      </div>
    );
  }

  return (
    <div className={cn("h-screen w-screen overflow-hidden", bgClass)}>
      <ReaderTopBar
        title={fileName}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSearch={() => setSearchOpen((s) => !s)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggle}
        visible={visible}
      />
      <ReaderProgressBar progress={progress} visible={visible} />

      <div className="h-full pt-0">
        {fileData ? (
          <PdfViewer
            bookId={params.id}
            fileData={fileData}
            theme={prefs.theme}
            chromeVisible={visible}
            searchOpen={searchOpen}
            onCloseSearch={() => setSearchOpen(false)}
            onProgress={setProgress}
            registerZoomHandlers={(h) => (zoomHandlers.current = h)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        )}
      </div>

      <ReaderSettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        prefs={prefs}
        onChange={update}
        showTypography={false}
      />
    </div>
  );
}
