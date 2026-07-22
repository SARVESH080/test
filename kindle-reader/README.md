# Fernweg — a Kindle-like PDF reading experience

Upload a PDF and read it as a clean, reflowable, paginated book — not a PDF viewer.

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- `pdfjs-dist` for client-side PDF text extraction (no server/backend needed)
- IndexedDB (`idb-keyval`) for storing parsed books, `localStorage` for settings & reading position

## Getting started
```bash
npm install
npm run dev
```
Open http://localhost:3000, drop in a PDF, and it will be converted into a book and opened in the reader.

## How it works
1. **Upload** — a PDF is parsed entirely in the browser with `pdfjs-dist`.
2. **Extraction** (`src/lib/pdf/extractText.ts`) — raw text lines are reconstructed into paragraphs
   using font-size and vertical-position heuristics (heading detection, paragraph breaks, list items),
   and a table of contents is built from the PDF outline (or detected headings as a fallback).
3. **Storage** — the parsed book (paragraphs + TOC) is saved to IndexedDB so it persists across reloads
   without needing a server.
4. **Reading** (`src/hooks/usePagination.ts`, `src/components/reader/ReaderShell.tsx`) — paragraphs are
   laid out with CSS multi-columns inside a fixed-size "page frame." Page margins live on the frame
   (not the column container) to avoid the common CSS-columns bug where only the first/last column gets
   padding. Turning a page translates the column canvas by exactly one page width, so it works uniformly
   whether the book has 10 pages or 10,000.
5. **Position & settings** — font size, line height, page width, theme, and typeface are stored in
   `localStorage` and applied instantly. Reading position is saved per-book (anchored to a paragraph, so
   it survives changes to font size/width) and restored automatically on return.

## Project structure
```
src/
  app/
    page.tsx              Library / upload screen
    read/[id]/page.tsx     Reader route
    layout.tsx, globals.css
  components/
    upload/UploadZone.tsx
    library/LibraryGrid.tsx
    reader/ReaderShell.tsx      Core reading experience
    reader/ReaderToolbar.tsx
    reader/SettingsPanel.tsx
    reader/TocPanel.tsx
    reader/ProgressSpine.tsx
  hooks/
    usePagination.ts        CSS-columns pagination engine
  lib/
    pdf/extractText.ts       PDF → paragraphs + TOC
    storage/db.ts             IndexedDB book storage
    storage/settings.ts       localStorage settings & position
    types.ts
```

## Notes
- Scanned/image-only PDFs (no embedded text layer) aren't supported — the app tells the user when no
  text is found.
- `npm audit` reports 0 vulnerabilities (package.json includes `overrides` to pin transitive `postcss`/
  `sharp` versions bundled inside Next.js's own dependency tree).
