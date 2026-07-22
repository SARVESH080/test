/**
 * Core domain types for the reader.
 *
 * These types are framework-agnostic (no Next.js / DOM-only assumptions
 * beyond what's unavoidable for a browser reader), so the same shapes can
 * be reused by a future React Native / mobile client that shares this
 * `lib` layer.
 */

export type BookKind = "pdf" | "epub" | "article";

export type ReaderTheme = "light" | "dark" | "sepia";

export type ReadingWidth = "narrow" | "medium" | "wide";

export type FontFamilyKey = "serif" | "sans" | "reading" | "dyslexic";

export interface ReaderPreferences {
  theme: ReaderTheme;
  fontSize: number; // px, applies to article/epub body text
  fontFamily: FontFamilyKey;
  lineSpacing: number; // unitless line-height multiplier
  readingWidth: ReadingWidth;
}

export const DEFAULT_PREFERENCES: ReaderPreferences = {
  theme: "light",
  fontSize: 19,
  fontFamily: "reading",
  lineSpacing: 1.7,
  readingWidth: "medium",
};

export interface ArticleData {
  title: string;
  byline: string | null;
  siteName: string | null;
  contentHtml: string;
  excerpt: string | null;
  length: number;
  sourceUrl: string;
}

export interface LibraryEntryMeta {
  id: string;
  kind: BookKind;
  title: string;
  addedAt: number;
  lastOpenedAt: number;
  /** For PDFs/EPUBs: last known position marker; for articles: scroll ratio */
  progress?: number;
}

export interface PdfPosition {
  page: number;
  zoom: number;
}

export interface EpubPosition {
  cfi: string;
}
