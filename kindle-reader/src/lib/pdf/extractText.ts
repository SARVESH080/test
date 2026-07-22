import type { BookParagraph, TocEntry } from "@/lib/types";

export interface ExtractedBook {
  title: string;
  author?: string;
  pageCount: number;
  paragraphs: BookParagraph[];
  toc: TocEntry[];
}

interface RawLine {
  kind: "line";
  text: string;
  y: number;
  fontSize: number;
  page: number;
}

interface RawImage {
  kind: "image";
  y: number;
  page: number;
  src: string;
  width: number;
  height: number;
}

type RawItem = RawLine | RawImage;

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

  const rawItems: RawItem[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    let currentY: number | null = null;
    let currentLine: string[] = [];
    let currentFontSize = 0;
    const pageLines: RawLine[] = [];

    const flush = () => {
      const text = currentLine.join(" ").replace(/\s+/g, " ").trim();
      if (text) {
        pageLines.push({
          kind: "line",
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

    const pageImages = await extractPageImages(pdfjs, page, pageNum - 1);

    // Both lines and images carry a `y` in the same PDF user-space coordinate
    // system (y increases upward), so merge them into reading order (top of
    // page first) before appending to the book-wide sequence.
    const merged: RawItem[] = [...pageLines, ...pageImages].sort((a, b) => b.y - a.y);
    rawItems.push(...merged);

    onProgress?.(pageNum / doc.numPages);
  }

  const paragraphs = linesToParagraphs(rawItems);
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
function linesToParagraphs(items: RawItem[]): BookParagraph[] {
  const lines = items.filter((it): it is RawLine => it.kind === "line");
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

  for (const item of items) {
    if (item.kind === "image") {
      // Flush whatever text paragraph is in progress, then insert the image
      // as its own standalone paragraph, preserving its position in reading
      // order relative to the surrounding text.
      pushBuffer();
      paragraphs.push({
        text: "",
        sourcePage: item.page,
        isHeading: false,
        image: { src: item.src, width: item.width, height: item.height },
      });
      prevY = item.y;
      prevPage = item.page;
      continue;
    }

    const line = item;
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

  return paragraphs.filter((p) => p.text.length > 0 || p.image);
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

type Matrix = [number, number, number, number, number, number];

function multiplyMatrix(m1: Matrix, m2: Matrix): Matrix {
  return [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ];
}

/**
 * Extracts embedded raster images from a single PDF page.
 *
 * Images aren't part of `getTextContent()`, so without this step every image
 * in the source PDF silently disappears from the reflowed book. We find each
 * image's placement by walking the page's operator list and tracking the
 * content stream's current transformation matrix through save/restore/
 * transform ops (mirroring what the PDF renderer itself does), then
 * rasterize the whole page once and crop each image's region out of that —
 * which avoids having to hand-decode PDF image colour spaces/masks
 * ourselves, since pdf.js's own renderer already does that correctly.
 */
async function extractPageImages(
  // Using a loose structural type here rather than importing pdf.js's page
  // type directly, since the exact type name/shape has moved across major
  // pdfjs-dist versions.
  pdfjs: typeof import("pdfjs-dist"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  pageIndex: number
): Promise<RawImage[]> {
  const images: RawImage[] = [];

  let opList: { fnArray: number[]; argsArray: unknown[][] };
  try {
    opList = await page.getOperatorList();
  } catch {
    return images;
  }

  const OPS = pdfjs.OPS;
  // A couple of the image-related op codes have moved around across
  // pdfjs-dist major versions (e.g. `paintJpegXObject` was folded into
  // `paintImageXObject` in v6). Look those up loosely so a future version
  // bump degrades gracefully (just misses that op) instead of failing the
  // whole build the way a missing static property does.
  const opsLoose = OPS as unknown as Record<string, number | undefined>;
  const paintInlineImageOp = opsLoose.paintInlineImageXObject;

  const identity: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  let ctm: Matrix = identity;
  const placements: Matrix[] = [];

  const { fnArray, argsArray } = opList;
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    if (fn === OPS.save) {
      stack.push(ctm);
    } else if (fn === OPS.restore) {
      ctm = stack.pop() ?? identity;
    } else if (fn === OPS.transform) {
      const args = argsArray[i] as number[];
      ctm = multiplyMatrix([args[0], args[1], args[2], args[3], args[4], args[5]], ctm);
    } else if (
      fn === OPS.paintImageXObject ||
      (paintInlineImageOp !== undefined && fn === paintInlineImageOp)
    ) {
      placements.push(ctm);
    }
  }

  if (placements.length === 0) return images;

  // Rasterize the full page once at a modest upscale for reasonable crop
  // quality, then reuse it for every image found on this page.
  const scale = 1.5;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return images;

  try {
    await page.render({ canvasContext: ctx, viewport }).promise;
  } catch {
    return images;
  }

  const vt = viewport.transform as number[];
  const toViewportPoint = (x: number, y: number): [number, number] => [
    vt[0] * x + vt[2] * y + vt[4],
    vt[1] * x + vt[3] * y + vt[5],
  ];

  for (const m of placements) {
    // Images are painted into the unit square [0,1]x[0,1], transformed by
    // the accumulated matrix `m`. Map its four corners into pixel space to
    // get a crop rectangle on the rendered page canvas.
    const corners = [
      toViewportPoint(m[4], m[5]),
      toViewportPoint(m[0] + m[4], m[1] + m[5]),
      toViewportPoint(m[2] + m[4], m[3] + m[5]),
      toViewportPoint(m[0] + m[2] + m[4], m[1] + m[3] + m[5]),
    ];
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    const sx = Math.max(0, Math.floor(Math.min(...xs)));
    const sy = Math.max(0, Math.floor(Math.min(...ys)));
    const sw = Math.min(canvas.width - sx, Math.ceil(Math.max(...xs) - Math.min(...xs)));
    const sh = Math.min(canvas.height - sy, Math.ceil(Math.max(...ys) - Math.min(...ys)));

    // Skip slivers (decorative rules, 1px hairlines) and anything that's
    // essentially the whole page (a full-bleed background rather than a
    // meaningful figure).
    if (sw < 24 || sh < 24) continue;
    if (sw * sh > canvas.width * canvas.height * 0.92) continue;

    const crop = document.createElement("canvas");
    crop.width = sw;
    crop.height = sh;
    const cctx = crop.getContext("2d");
    if (!cctx) continue;
    cctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    // PDF user-space y (same coordinate system text lines use) for merging
    // this image into reading order: top edge of the unit square is (0,1).
    const pdfTopY = m[3] + m[5];

    images.push({
      kind: "image",
      y: pdfTopY,
      page: pageIndex,
      src: crop.toDataURL("image/jpeg", 0.85),
      width: sw,
      height: sh,
    });
  }

  return images;
}
