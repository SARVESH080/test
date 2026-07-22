import { createStore, get, set, del, keys } from "idb-keyval";
import type { BookRecord, BookSummary } from "@/lib/types";
import { getReadingPosition } from "@/lib/storage/settings";

const bookStore = createStore("kindle-reader-db", "books");

export async function saveBook(book: BookRecord): Promise<void> {
  await set(book.id, book, bookStore);
}

export async function getBook(id: string): Promise<BookRecord | undefined> {
  return get<BookRecord>(id, bookStore);
}

export async function deleteBook(id: string): Promise<void> {
  await del(id, bookStore);
}

export async function listBookSummaries(): Promise<BookSummary[]> {
  const ids = await keys(bookStore);
  const summaries: BookSummary[] = [];
  for (const id of ids) {
    const book = await get<BookRecord>(id as string, bookStore);
    if (!book) continue;
    const position = getReadingPosition(book.id);
    summaries.push({
      id: book.id,
      title: book.title,
      author: book.author,
      wordCount: book.wordCount,
      addedAt: book.addedAt,
      coverPalette: book.coverPalette,
      progressFraction: position?.fraction ?? 0,
    });
  }
  return summaries.sort((a, b) => b.addedAt - a.addedAt);
}
