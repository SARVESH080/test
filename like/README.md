# Bookbind — a Kindle-style reader for your own files

A distraction-free reading app that runs entirely in the browser. Upload a
PDF or EPUB, or paste an article link, and it opens instantly in a clean,
paginated reading view. There is no login, no database, and no cloud
storage — files are read directly in memory (via IndexedDB for the
current tab) and reading position / preferences are kept in
`localStorage` on your device only.

## Features

- **PDF** — rendered with PDF.js: smooth continuous scrolling, pinch/click
  zoom, full-text search, and automatic "resume where you left off."
- **EPUB** — rendered with epub.js as a real paginated ebook, with theming,
  font, and layout controls, plus in-book search.
- **Web articles** — paste any article URL; the page is fetched through a
  tiny stateless serverless function (to sidestep browser CORS) and then
  parsed client-side with Mozilla Readability into a clean, ad-free,
  ebook-style layout that preserves headings, images, tables, and code
  blocks.
- **Reading experience** — light / dark / sepia themes, font size, font
  family, line spacing, reading width, a reading progress bar, and
  fullscreen mode, all shared across the three formats.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS ·
shadcn/ui (Radix primitives) · Framer Motion · PDF.js · epub.js ·
Mozilla Readability.

## Project structure

```
src/
  app/
    page.tsx                 Homepage (three upload entry points)
    read/pdf/[id]/page.tsx   PDF reader route
    read/epub/[id]/page.tsx  EPUB reader route
    read/article/page.tsx    Article reader route
    api/fetch-article/       Stateless CORS-bypass fetcher (no DB, no auth)
  components/
    home/                    Homepage-specific UI
    reader/                  Shared reader chrome + the three viewers
    ui/                      shadcn/ui primitives
  hooks/                     Fullscreen, chrome auto-hide, preferences
  lib/                       Types, storage helpers, Readability, PDF.js loader
```

The `lib/` and `hooks/` layers avoid any Next.js-only APIs beyond routing,
so the reading logic (PDF.js orchestration, EPUB theming, Readability
parsing, preference persistence) can be lifted into a React Native app
later with minimal changes — only `lib/storage.ts` and `lib/blob-store.ts`
would need to swap `localStorage`/IndexedDB for `AsyncStorage`/the
filesystem.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploying

1. Download this project and push it to a new GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import that
   repository.
3. Leave all settings at their defaults (Next.js is auto-detected) and
   click **Deploy**.

No environment variables, database, or additional configuration are
required.

## Notes on the article extractor

Browsers block cross-origin `fetch` of arbitrary article pages (CORS), so
`/api/fetch-article` exists purely to retrieve the raw HTML of a pasted
URL on the same origin. It is a stateless edge function: it stores
nothing, requires no authentication, and keeps no records between
requests. All actual parsing (stripping ads/navigation/sidebars,
identifying the article body) happens client-side via Mozilla
Readability.
