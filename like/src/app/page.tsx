"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, BookOpen, Link2, Loader2, ArrowRight, BookMarked } from "lucide-react";
import { UploadCard } from "@/components/home/upload-card";
import { Button } from "@/components/ui/button";
import { putBlob } from "@/lib/blob-store";
import { hashId } from "@/lib/storage";

export default function HomePage() {
  const router = useRouter();
  const [urlValue, setUrlValue] = React.useState("");
  const [loading, setLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFile(file: File, kind: "pdf" | "epub") {
    setError(null);
    const expectedExt = kind === "pdf" ? ".pdf" : ".epub";
    if (!file.name.toLowerCase().endsWith(expectedExt)) {
      setError(
        `That doesn't look like a ${kind.toUpperCase()} file. Please choose a ${expectedExt} file.`
      );
      return;
    }
    setLoading(kind);
    try {
      const id = hashId(file.name + file.size + file.lastModified);
      await putBlob(id, {
        fileName: file.name,
        mimeType: file.type || (kind === "pdf" ? "application/pdf" : "application/epub+zip"),
        blob: file,
        savedAt: Date.now(),
      });
      router.push(`/read/${kind}/${id}?name=${encodeURIComponent(file.name)}`);
    } catch (e) {
      setError("Couldn't load that file. Please try again.");
      setLoading(null);
    }
  }

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let trimmed = urlValue.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = "https://" + trimmed;
    }
    try {
      new URL(trimmed);
    } catch {
      setError("That doesn't look like a valid URL.");
      return;
    }
    setLoading("article");
    router.push(`/read/article?url=${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1c1917]">
      {/* ambient texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(201,99,31,0.12), transparent 45%), radial-gradient(circle at 85% 75%, rgba(201,99,31,0.10), transparent 40%)",
        }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-14 sm:py-20">
        {/* Header / hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-14 sm:mb-20"
        >
          <div className="flex items-center gap-2 text-ember-400">
            <BookMarked className="h-5 w-5" strokeWidth={2.2} />
            <span className="font-display text-sm font-semibold tracking-wide text-ember-300">
              Bookbind
            </span>
          </div>
          <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold leading-[1.1] text-stone-50 sm:text-5xl">
            Bring your own book.
            <br />
            <span className="text-ember-400">Read it like a Kindle.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-stone-400">
            Drop in a PDF, an EPUB, or just paste a link to an article. It
            opens instantly in a clean, paginated reading view — nothing is
            uploaded anywhere, nothing is saved but on this device.
          </p>
        </motion.div>

        {/* Upload grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <UploadCard
            icon={
              loading === "pdf" ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileText className="h-6 w-6" strokeWidth={1.8} />
              )
            }
            title="Upload PDF"
            description="Crisp pages, pinch-to-zoom, and full-text search — powered by PDF.js."
            accept="application/pdf"
            onFile={(f) => handleFile(f, "pdf")}
            delay={0.05}
          />
          <UploadCard
            icon={
              loading === "epub" ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <BookOpen className="h-6 w-6" strokeWidth={1.8} />
              )
            }
            title="Upload EPUB"
            description="Reflowable text that behaves like a real ebook, page by page."
            accept="application/epub+zip,.epub"
            onFile={(f) => handleFile(f, "epub")}
            delay={0.15}
          />
          <div className="bookmark-ribbon relative rounded-xl border border-border/60 bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Link2 className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-foreground">
                Paste Article URL
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                We'll lift the article out of the page — no ads, no clutter.
              </p>
              <form onSubmit={handleUrlSubmit} className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="https://example.com/article"
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none ring-accent/40 placeholder:text-muted-foreground focus:ring-2"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="accent"
                  disabled={loading === "article"}
                  aria-label="Open article"
                >
                  {loading === "article" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-red-300"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-auto pt-16 text-xs text-stone-600">
          No sign-up. No server. No tracking. Everything runs in this browser
          tab.
        </div>
      </div>
    </main>
  );
}
