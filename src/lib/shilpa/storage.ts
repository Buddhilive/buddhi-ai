/**
 * Shilpa Studio IndexedDB Storage Layer
 * Manages persistence for Shilpa books, chapters, and generated lesson assets.
 */

import {
  initializeDB,
  getItemByKey,
  getAllFromStore,
  updateItemInStore,
  deleteItemFromStore,
} from "../indexeddb";
import type { ShilpaBook, ShilpaSection } from "@/types/shilpa";

const DB_NAME = "buddhi_shilpa_db";
const DB_VERSION = 1;

export const SHILPA_STORES = {
  BOOKS: "shilpa_books",
  CHAPTERS: "shilpa_chapters",
  PDF_CACHE: "shilpa_pdf_cache",
} as const;

const STORE_CONFIGS = [
  { name: SHILPA_STORES.BOOKS },
  { name: SHILPA_STORES.CHAPTERS },
  { name: SHILPA_STORES.PDF_CACHE },
];

let _dbPromise: Promise<IDBDatabase> | null = null;

export const getShilpaDB = async (): Promise<IDBDatabase> => {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only accessible in browser client environments");
  }
  if (!_dbPromise) {
    _dbPromise = initializeDB(DB_NAME, DB_VERSION, STORE_CONFIGS);
  }
  return _dbPromise;
};

// ─── Books Storage ────────────────────────────────────────────────────────────

export const getAllShilpaBooks = async (): Promise<ShilpaBook[]> => {
  const db = await getShilpaDB();
  return getAllFromStore<ShilpaBook>(db, SHILPA_STORES.BOOKS);
};

export const getShilpaBookById = async (id: string): Promise<ShilpaBook | undefined> => {
  const db = await getShilpaDB();
  return getItemByKey<ShilpaBook>(db, SHILPA_STORES.BOOKS, id);
};

export const saveShilpaBook = async (book: ShilpaBook): Promise<void> => {
  const db = await getShilpaDB();
  await updateItemInStore(db, SHILPA_STORES.BOOKS, book, book.id);
};

export const deleteShilpaBook = async (id: string): Promise<void> => {
  const db = await getShilpaDB();
  await deleteItemFromStore(db, SHILPA_STORES.BOOKS, id);
  await deleteItemFromStore(db, SHILPA_STORES.PDF_CACHE, id);
};

// ─── Chapter Content Storage ──────────────────────────────────────────────────

export interface ShilpaChapterData {
  bookId: string;
  folder: string; // e.g. "ch01"
  section: ShilpaSection;
  extractedText?: string;
  scriptContent?: string;
  timings?: Record<string, unknown>;
  updatedAt: number;
}

export const getChapterContent = async (
  bookId: string,
  folder: string
): Promise<ShilpaChapterData | undefined> => {
  const db = await getShilpaDB();
  const key = `${bookId}::${folder}`;
  return getItemByKey<ShilpaChapterData>(db, SHILPA_STORES.CHAPTERS, key);
};

export const saveChapterContent = async (
  chapterData: ShilpaChapterData
): Promise<void> => {
  const db = await getShilpaDB();
  const key = `${chapterData.bookId}::${chapterData.folder}`;
  await updateItemInStore(db, SHILPA_STORES.CHAPTERS, chapterData, key);
};

// ─── PDF Raw ArrayBuffer Cache ────────────────────────────────────────────────

export const cacheBookPdf = async (bookId: string, buffer: ArrayBuffer): Promise<void> => {
  const db = await getShilpaDB();
  await updateItemInStore(db, SHILPA_STORES.PDF_CACHE, buffer, bookId);
};

export const getCachedBookPdf = async (bookId: string): Promise<ArrayBuffer | undefined> => {
  const db = await getShilpaDB();
  return getItemByKey<ArrayBuffer>(db, SHILPA_STORES.PDF_CACHE, bookId);
};
