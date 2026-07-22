import type { ReaderSettings, ReadingPosition } from "@/lib/types";

const SETTINGS_KEY = "kr:settings";
const POSITION_PREFIX = "kr:position:";

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSizePx: 19,
  lineHeight: 1.7,
  contentWidth: 640,
  theme: "sepia",
  fontFamily: "serif",
};

export function getSettings(): ReaderSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ReaderSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ReaderSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getReadingPosition(bookId: string): ReadingPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(POSITION_PREFIX + bookId);
    if (!raw) return null;
    return JSON.parse(raw) as ReadingPosition;
  } catch {
    return null;
  }
}

export function saveReadingPosition(position: ReadingPosition): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    POSITION_PREFIX + position.bookId,
    JSON.stringify(position)
  );
}

export function deleteReadingPosition(bookId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(POSITION_PREFIX + bookId);
}
