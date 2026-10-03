import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import type { PGliteVectorRecord } from "@/types/research";

let _dbInstance: PGlite | null = null;
let _initPromise: Promise<PGlite> | null = null;

const VECTOR_DB_NAME = "idb://buddhi_vectors";

/**
 * Initializes and returns the PGlite vector database singleton.
 * Configures the pgvector extension and ensures schema tables exist.
 */
export async function getVectorDb(): Promise<PGlite> {
  if (typeof window === "undefined") {
    throw new Error("PGlite vector store is only accessible in browser client environments");
  }

  if (_dbInstance) {
    return _dbInstance;
  }

  if (_initPromise) {
    return _initPromise;
  }

  _initPromise = (async () => {
    try {
      const db = await PGlite.create({
        dataDir: VECTOR_DB_NAME,
        extensions: {
          vector,
        },
      });

      // Enable pgvector extension
      await db.exec("CREATE EXTENSION IF NOT EXISTS vector;");

      // Create documents tracking table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          paper_id TEXT NOT NULL UNIQUE,
          title TEXT,
          file_name TEXT NOT NULL,
          file_size INTEGER,
          page_count INTEGER,
          uploaded_at BIGINT,
          embedding_status TEXT DEFAULT 'idle',
          total_chunks INTEGER DEFAULT 0,
          embedded_chunks INTEGER DEFAULT 0
        );
      `);

      // Create chunks table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS chunks (
          id TEXT PRIMARY KEY,
          paper_id TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          page_number INTEGER,
          section_heading TEXT,
          text TEXT NOT NULL,
          token_count INTEGER
        );
      `);

      // Create chunk embeddings table with pgvector column
      await db.exec(`
        CREATE TABLE IF NOT EXISTS chunk_embeddings (
          id TEXT PRIMARY KEY,
          paper_id TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          page_number INTEGER,
          text TEXT,
          embedding vector(768)
        );
      `);

      // Create index for fast paper filtering
      await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_chunk_embeddings_paper_id 
        ON chunk_embeddings(paper_id);
      `);

      _dbInstance = db;
      return db;
    } catch (err) {
      _initPromise = null;
      console.error("[pglite-vector-store] Database initialization failed:", err);
      throw err;
    }
  })();

  return _initPromise;
}

/**
 * Formats a JavaScript number array into pgvector string format: '[x1, x2, x3...]'
 */
export function formatVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * Batch inserts chunk embeddings into PGlite
 */
export async function saveChunkEmbeddings(records: PGliteVectorRecord[]): Promise<void> {
  if (records.length === 0) return;
  const db = await getVectorDb();

  for (const record of records) {
    const formattedVec = formatVector(record.embedding);
    await db.query(
      `INSERT INTO chunk_embeddings (id, paper_id, chunk_index, page_number, text, embedding)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET 
         embedding = EXCLUDED.embedding,
         text = EXCLUDED.text;`,
      [
        record.id,
        record.paper_id,
        record.chunk_index,
        record.page_number,
        record.text,
        formattedVec,
      ]
    );
  }
}

/**
 * Permanently deletes all chunk embeddings belonging to a paper
 */
export async function deletePaperVectors(paperId: string): Promise<void> {
  try {
    const db = await getVectorDb();
    await db.query(`DELETE FROM chunk_embeddings WHERE paper_id = $1;`, [paperId]);
    await db.query(`DELETE FROM chunks WHERE paper_id = $1;`, [paperId]);
    await db.query(`DELETE FROM documents WHERE paper_id = $1;`, [paperId]);
  } catch (err) {
    console.error(`[pglite-vector-store] Failed to delete vectors for paper ${paperId}:`, err);
    throw err;
  }
}

/**
 * Returns the number of embedded vectors saved for a specific paper
 */
export async function getPaperVectorCount(paperId: string): Promise<number> {
  try {
    const db = await getVectorDb();
    const res = await db.query<{ count: string | number }>(
      `SELECT COUNT(*) as count FROM chunk_embeddings WHERE paper_id = $1;`,
      [paperId]
    );
    const raw = res.rows[0]?.count ?? 0;
    return typeof raw === "string" ? parseInt(raw, 10) : raw;
  } catch (err) {
    console.warn(`[pglite-vector-store] Could not get vector count for paper ${paperId}:`, err);
    return 0;
  }
}

/**
 * Returns the total count of all vectors in the store
 */
export async function getTotalVectorCount(): Promise<number> {
  try {
    const db = await getVectorDb();
    const res = await db.query<{ count: string | number }>(
      `SELECT COUNT(*) as count FROM chunk_embeddings;`
    );
    const raw = res.rows[0]?.count ?? 0;
    return typeof raw === "string" ? parseInt(raw, 10) : raw;
  } catch (err) {
    console.warn("[pglite-vector-store] Could not get total vector count:", err);
    return 0;
  }
}

/**
 * Searches chunks matching a query vector using cosine distance (<=> operator in pgvector).
 * Returns results ordered by similarity descending.
 */
export async function searchVectorChunks(
  queryVector: number[],
  paperId?: string | string[],
  limit = 5
): Promise<Array<{
  id: string;
  paperId: string;
  chunkIndex: number;
  pageNumber: number;
  text: string;
  similarity: number;
}>> {
  const db = await getVectorDb();
  const formattedVec = formatVector(queryVector);

  let query: string;
  let params: unknown[];

  const idList = Array.isArray(paperId)
    ? paperId.filter(Boolean)
    : paperId
    ? [paperId]
    : [];

  if (idList.length > 0) {
    query = `
      SELECT id, paper_id, chunk_index, page_number, text,
             1 - (embedding <=> $1) AS similarity
      FROM chunk_embeddings
      WHERE paper_id = ANY($2::text[])
      ORDER BY embedding <=> $1 ASC
      LIMIT $3;
    `;
    params = [formattedVec, idList, limit];
  } else {
    query = `
      SELECT id, paper_id, chunk_index, page_number, text,
             1 - (embedding <=> $1) AS similarity
      FROM chunk_embeddings
      ORDER BY embedding <=> $1 ASC
      LIMIT $2;
    `;
    params = [formattedVec, limit];
  }

  const res = await db.query<{
    id: string;
    paper_id: string;
    chunk_index: number;
    page_number: number;
    text: string;
    similarity: number;
  }>(query, params);

  return res.rows.map((row) => ({
    id: row.id,
    paperId: row.paper_id,
    chunkIndex: row.chunk_index,
    pageNumber: row.page_number,
    text: row.text,
    similarity: typeof row.similarity === "string" ? parseFloat(row.similarity) : row.similarity,
  }));
}
