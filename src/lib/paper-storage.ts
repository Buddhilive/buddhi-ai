import {
  initializeDB,
  getItemByKey,
  getAllFromStore,
  updateItemInStore,
  deleteItemFromStore,
  BuddhiIDBStore,
} from "./indexeddb";
import { deletePaperVectors } from "./pglite-vector-store";
import type { Paper, Chunk, ChunkEmbedding } from "@/types/research";

const DB_NAME = "buddhi_research_db";
const DB_VERSION = 1;

export const STORES = {
  PAPERS: "papers",
  CHUNKS: "chunks",
  EMBEDDINGS: "embeddings",
  SETTINGS: "settings",
} as const;

const STORE_CONFIGS: BuddhiIDBStore[] = [
  { name: STORES.PAPERS },
  { name: STORES.CHUNKS },
  { name: STORES.EMBEDDINGS },
  { name: STORES.SETTINGS },
];

let _dbPromise: Promise<IDBDatabase> | null = null;

export const getResearchDB = async (): Promise<IDBDatabase> => {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only accessible in browser client environments");
  }
  if (!_dbPromise) {
    _dbPromise = initializeDB(DB_NAME, DB_VERSION, STORE_CONFIGS);
  }
  return _dbPromise;
};

// --- Settings Storage ---
export const getSetting = async (key: string): Promise<string | null> => {
  const db = await getResearchDB();
  const res = await getItemByKey<{ value: string } | string>(db, STORES.SETTINGS, key);
  if (!res) return null;
  return typeof res === "string" ? res : res.value;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  const db = await getResearchDB();
  await updateItemInStore(db, STORES.SETTINGS, { value }, key);
};

export const deleteSetting = async (key: string): Promise<void> => {
  const db = await getResearchDB();
  await deleteItemFromStore(db, STORES.SETTINGS, key);
};

// --- Papers Storage ---
export const getAllPapers = async (): Promise<Paper[]> => {
  const db = await getResearchDB();
  return getAllFromStore<Paper>(db, STORES.PAPERS);
};

export const getPaperById = async (id: string): Promise<Paper | null> => {
  const db = await getResearchDB();
  const paper = await getItemByKey<Paper>(db, STORES.PAPERS, id);
  return paper || null;
};

export const getPaperByHash = async (hash: string): Promise<Paper | null> => {
  const papers = await getAllPapers();
  return papers.find((p) => p.hash === hash) || null;
};

export const savePaper = async (paper: Paper): Promise<Paper> => {
  const db = await getResearchDB();
  return updateItemInStore(db, STORES.PAPERS, paper, paper.id);
};

export const deletePaperAndData = async (paperId: string): Promise<void> => {
  const db = await getResearchDB();
  await deleteItemFromStore(db, STORES.PAPERS, paperId);

  // Cascading cleanup of chunks and embeddings in IndexedDB
  const allChunks = await getAllFromStore<Chunk>(db, STORES.CHUNKS);
  const paperChunks = allChunks.filter((c) => c.paperId === paperId);
  for (const chunk of paperChunks) {
    await deleteItemFromStore(db, STORES.CHUNKS, chunk.id);
    await deleteItemFromStore(db, STORES.EMBEDDINGS, chunk.id);
  }

  // Cascading cleanup of vectors in PGlite
  try {
    await deletePaperVectors(paperId);
  } catch (err) {
    console.warn(`[paper-storage] Warning: could not delete PGlite vectors for paper ${paperId}:`, err);
  }
};

// --- Chunks Storage ---
export const saveChunks = async (chunks: Chunk[]): Promise<void> => {
  const db = await getResearchDB();
  for (const chunk of chunks) {
    await updateItemInStore(db, STORES.CHUNKS, chunk, chunk.id);
  }
};

export const getChunksByPaperId = async (paperId: string): Promise<Chunk[]> => {
  const db = await getResearchDB();
  const allChunks = await getAllFromStore<Chunk>(db, STORES.CHUNKS);
  return allChunks
    .filter((c) => c.paperId === paperId)
    .sort((a, b) => a.chunkIndex - b.chunkIndex);
};

// --- Embeddings Storage ---
export const saveEmbedding = async (
  paperId: string,
  chunkIndex: number,
  embedding: number[]
): Promise<void> => {
  const db = await getResearchDB();
  const id = `${paperId}::${chunkIndex}`;
  await updateItemInStore(
    db,
    STORES.EMBEDDINGS,
    { id, paperId, chunkIndex, embedding } as ChunkEmbedding,
    id
  );
};

export const getEmbeddingsByPaperId = async (
  paperId: string
): Promise<ChunkEmbedding[]> => {
  const db = await getResearchDB();
  const allEmbeddings = await getAllFromStore<ChunkEmbedding>(db, STORES.EMBEDDINGS);
  return allEmbeddings.filter((e) => e.paperId === paperId);
};

export const getAllEmbeddings = async (): Promise<ChunkEmbedding[]> => {
  const db = await getResearchDB();
  return getAllFromStore<ChunkEmbedding>(db, STORES.EMBEDDINGS);
};
