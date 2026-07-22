/**
 * Thin wrapper around localStorage / IndexedDB so the rest of the app
 * never touches `window` directly. Swapping this module out for
 * AsyncStorage (React Native) is the only change needed to reuse the
 * rest of `lib` and `components` on mobile.
 */
import type { ReaderPreferences } from "./types";
import { DEFAULT_PREFERENCES } from "./types";

const PREFS_KEY = "bookbind:preferences";
const PROGRESS_PREFIX = "bookbind:progress:";
const LIBRARY_KEY = "bookbind:library";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadPreferences(): ReaderPreferences {
  if (!isBrowser()) return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: ReaderPreferences) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota errors
  }
}

export function saveProgress(bookId: string, data: unknown) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PROGRESS_PREFIX + bookId, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function loadProgress<T>(bookId: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PROGRESS_PREFIX + bookId);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export interface LibraryRecord {
  id: string;
  kind: "pdf" | "epub" | "article";
  title: string;
  addedAt: number;
  lastOpenedAt: number;
}

export function getLibrary(): LibraryRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LibraryRecord[];
  } catch {
    return [];
  }
}

export function upsertLibraryEntry(entry: LibraryRecord) {
  if (!isBrowser()) return;
  const lib = getLibrary().filter((e) => e.id !== entry.id);
  lib.unshift(entry);
  try {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib.slice(0, 50)));
  } catch {
    // ignore
  }
}

/**
 * Deterministic id for a given source so re-opening the same file/URL
 * resumes progress. Uses a lightweight string hash (no crypto dependency
 * needed, and works identically on RN).
 */
export function hashId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return "b" + Math.abs(hash).toString(36);
}
