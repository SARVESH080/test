# Reading Platform — Foundation Build

This is **slice 1** of the full platform described in the brief. It's a real, runnable
vertical slice — not a mockup — that the rest of the 24 features get layered onto.

## What's included in this pass

**Backend** (`/backend` — NestJS + Prisma + PostgreSQL)
- Project structure (modular: auth, users, books, extraction)
- Full database schema for the *entire* platform (not just what's wired up yet —
  see `prisma/schema.prisma`), so later features don't require migrations that
  break existing data.
- Email/password auth with JWT (access + refresh tokens), password hashing (argon2)
- "Paste a URL → clean article" pipeline (Readability + jsdom), saved as a Book
- File upload → text extraction pipeline for **PDF, DOCX, TXT, Markdown**
  (EPUB/MOBI parsing is stubbed with a clear TODO — see below)
- Book CRUD + listing, reading-progress endpoint
- Global exception filter, validation pipes, config via `.env`

**Frontend** (`/frontend` — Next.js 14 App Router + TypeScript + Tailwind)
- Auth pages (login/register) wired to the backend
- Library page: grid of books, "Add from URL" and "Upload file" flows
- Reader page: clean typographic reading view with a settings panel
  (font family/size, line height, page width, theme: light/dark/sepia/AMOLED)
- Design system: see `frontend/DESIGN_NOTES.md` for the token rationale

## What's deliberately NOT in this pass

To keep this slice honest and testable rather than a wall of half-working code:
- Highlights, notes, bookmarks, dictionary, AI assistant, OCR, audio (TTS),
  offline caching, search, stats dashboard, social/collections — **schema is
  ready for all of these**, but endpoints/UI are follow-up rounds.
- Android app (Flutter/React Native) — starts once the REST API contract is
  stable, since it consumes the same backend.
- EPUB/MOBI parsing — needs a native-ish library (e.g. `epub2` /
  `@smoores/epub`) that's heavier to wire correctly; stubbed for now so the
  upload pipeline shape is already correct.

## Running it locally

### Backend
```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL and JWT secrets
npm install
npx prisma migrate dev --name init
npm run start:dev           # http://localhost:4000
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

You'll need a local Postgres instance (or `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`).

## Suggested next rounds (pick one at a time)

1. Highlights + Notes + Bookmarks (schema already supports it)
2. Search (Meilisearch, indexing on book create/update)
3. AI Assistant (summarize/explain/quiz — Claude API, streaming)
4. OCR pipeline for scanned PDFs (Tesseract)
5. Reading stats dashboard
6. Android app (Flutter) consuming this same API
7. Audio/TTS reading mode
8. Offline sync (service worker + IndexedDB on web, SQLite on mobile)

Tell me which one and I'll build it the same way — real, runnable, tested against
the existing schema and API contract.
