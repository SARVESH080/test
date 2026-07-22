import type { BookParagraph, TocEntry } from "@/lib/types";

export interface ExtractedBook {
  title: string;
  author?: string;
  pageCount: number;
  paragraphs: BookParagraph[];
  toc: TocEntry[];
}

interface RawLine {
  text: string;
  y: number;
  fontSize: number;
  page: number;
}

/**
 * Extracts text from a PDF file and reconstructs it into readable, reflowable
 * paragraphs (rather than the original fixed page layout).
 */
export async function extractBookFromPdf(
  file: File,
  onProgress?: (fraction: number) => void
): Promise<ExtractedBook> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const metadata = await doc.getMetadata().catch(() => null);
  const info = (metadata?.info ?? {}) as Record<string, string>;
  const title = info.Title?.trim() || file.name.replace(/\.pdf$/i, "");
  const author = info.Author?.trim() || undefined;

  const rawLines: RawLine[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    let currentY: number | null = null;
    let currentLine: string[] = [];
    let currentFontSize = 0;

    const flush = () => {
      const text = currentLine.join(" ").replace(/\s+/g, " ").trim();
      if (text) {
        rawLines.push({
          text,
          y: currentY ?? 0,
          fontSize: currentFontSize,
          page: pageNum - 1,
        });
      }
      currentLine = [];
    };

    for (const item of content.items as Array<{
      str: string;
      transform: number[];
      height: number;
    }>) {
      if (!("str" in item)) continue;
      const y = Math.round(item.transform[5]);
      const fontSize = item.height || Math.abs(item.transform[3]) || 10;

      if (currentY === null) {
        currentY = y;
        currentFontSize = fontSize;
      }

      // A meaningfully different y-coordinate means a new visual line.
      if (Math.abs(y - currentY) > fontSize * 0.4) {
        flush();
        currentY = y;
        currentFontSize = fontSize;
      }

      if (item.str) {
        currentLine.push(item.str);
        currentFontSize = Math.max(currentFontSize, fontSize);
      }
    }
    flush();
    onProgress?.(pageNum / doc.numPages);
  }

  const paragraphs = linesToParagraphs(rawLines);
  const toc = await buildToc(pdfjs, doc, paragraphs);

  return {
    title,
    author,
    pageCount: doc.numPages,
    paragraphs,
    toc,
  };
}

/**
 * Groups extracted lines into paragraphs using simple, robust heuristics:
 * a new paragraph starts when a line is short (likely wrapped end) followed
 * by a line starting with an indent/capital, or when the font size changes
 * (heading), or a big vertical gap is detected.
 */
function linesToParagraphs(lines: RawLine[]): BookParagraph[] {
  const paragraphs: BookParagraph[] = [];
  const baseFontSize = medianFontSize(lines);

  let buffer: string[] = [];
  let bufferPage = 0;
  let bufferIsHeading = false;
  let prevY: number | null = null;
  let prevPage = -1;

  const pushBuffer = () => {
    const text = buffer.join(" ").replace(/\s+/g, " ").trim();
    if (text) {
      paragraphs.push({
        text,
        sourcePage: bufferPage,
        isHeading: bufferIsHeading,
      });
    }
    buffer = [];
    bufferIsHeading = false;
  };

  for (const line of lines) {
    const isHeadingLine =
      line.fontSize > baseFontSize * 1.15 && line.text.length < 120;
    const bigGap =
      prevPage === line.page && prevY !== null && Math.abs(line.y - prevY) > line.fontSize * 2.2;
    const pageChanged = line.page !== prevPage;
    const endsSentence = /[.!?:"'\u2019\u201d)]\s*$/.test(
      buffer[buffer.length - 1] ?? ""
    );
    const looksLikeListOrShort = /^([-•*\u2022]|\d+[.)])\s/.test(line.text);

    const shouldBreak =
      buffer.length === 0 ||
      isHeadingLine ||
      bufferIsHeading ||
      bigGap ||
      looksLikeListOrShort ||
      (pageChanged && endsSentence);

    if (shouldBreak) {
      pushBuffer();
      bufferPage = line.page;
      bufferIsHeading = isHeadingLine;
    }

    buffer.push(line.text);
    prevY = line.y;
    prevPage = line.page;
  }
  pushBuffer();

  return paragraphs.filter((p) => p.text.length > 0);
}

function medianFontSize(lines: RawLine[]): number {
  if (lines.length === 0) return 10;
  const sizes = lines.map((l) => l.fontSize).sort((a, b) => a - b);
  return sizes[Math.floor(sizes.length / 2)];
}

async function buildToc(
  pdfjs: typeof import("pdfjs-dist"),
  doc: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>,
  paragraphs: BookParagraph[]
): Promise<TocEntry[]> {
  try {
    const outline = await doc.getOutline();
    if (!outline || outline.length === 0) return headingsAsToc(paragraphs);

    const entries: TocEntry[] = [];
    for (const item of outline) {
      try {
        let pageIndex: number | null = null;
        if (item.dest) {
          const dest =
            typeof item.dest === "string"
              ? await doc.getDestination(item.dest)
              : item.dest;
          if (dest && dest[0]) {
            pageIndex = await doc.getPageIndex(dest[0]);
          }
        }
        if (pageIndex !== null) {
          const paragraphIndex = paragraphs.findIndex(
            (p) => p.sourcePage >= pageIndex!
          );
          entries.push({
            title: item.title,
            paragraphIndex: paragraphIndex === -1 ? 0 : paragraphIndex,
          });
        }
      } catch {
        // skip malformed outline entries
      }
    }
    return entries.length > 0 ? entries : headingsAsToc(paragraphs);
  } catch {
    return headingsAsToc(paragraphs);
  }
}

function headingsAsToc(paragraphs: BookParagraph[]): TocEntry[] {
  return paragraphs
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.isHeading)
    .slice(0, 60)
    .map(({ p, i }) => ({ title: p.text, paragraphIndex: i }));
}
