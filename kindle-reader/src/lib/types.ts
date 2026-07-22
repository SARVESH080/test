export interface BookParagraph {
  /** Plain text content of the paragraph */
  text: string;
  /** Index of the source PDF page this paragraph originated from (0-based) */
  sourcePage: number;
  /** True if this paragraph looks like a heading (short, larger font in source) */
  isHeading: boolean;
}

export interface TocEntry {
  title: string;
  /** Index into the paragraphs array to jump to */
  paragraphIndex: number;
}

export interface BookRecord {
  id: string;
  title: string;
  author?: string;
  pageCount: number;
  paragraphs: BookParagraph[];
  toc: TocEntry[];
  wordCount: number;
  addedAt: number;
  coverPalette: number;
}

export interface BookSummary {
  id: string;
  title: string;
  author?: string;
  wordCount: number;
  addedAt: number;
  coverPalette: number;
  progressFraction: number;
}

export type ThemeName = "light" | "dark" | "sepia";

export interface ReaderSettings {
  fontSizePx: number;
  lineHeight: number;
  contentWidth: number; // percentage-ish scale factor, maps to a max-width
  theme: ThemeName;
  fontFamily: "serif" | "sans";
}

export interface ReadingPosition {
  bookId: string;
  fraction: number; // 0..1 overall progress
  paragraphIndex: number; // anchor paragraph for accurate reflow restoration
  updatedAt: number;
}
