import type * as PdfJsLib from "pdfjs-dist";

let pdfjsPromise: Promise<typeof PdfJsLib> | null = null;

/**
 * Lazily loads pdfjs-dist and wires up its worker using a bundler-relative
 * URL. This keeps everything self-contained (no CDN dependency, works
 * fully offline once the page is loaded) and avoids version-mismatch
 * errors between the main thread and worker bundles.
 */
export async function getPdfJs(): Promise<typeof PdfJsLib> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      return mod;
    });
  }
  return pdfjsPromise;
}
