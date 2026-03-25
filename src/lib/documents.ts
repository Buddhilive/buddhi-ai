"use client";

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { useDocumentStore } from "@/lib/stores/document-store";
import type { WorkerCommand, WorkerEvent } from "@/lib/document-worker";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DocumentInfo {
  id: number;
  filename: string;
  original_name: string;
  status: "pending" | "processing" | "completed" | "failed";
  chunk_count: number | null;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmbeddingResult {
  id: number;
  doc_id: number;
  chunk_index: number;
  chunk_text: string;
  score?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const IDB_NAME = "buddhi-ai-doc-store";
const IDB_STORE = "files";
const IDB_VERSION = 1;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_CONCURRENT = 5;
// ─── Module-level singletons ──────────────────────────────────────────────────

let _db: PGlite | null = null;
let _dbInitPromise: Promise<PGlite> | null = null;
// Tracks the vector dimension used when the embeddings table was last created.
let _embeddingDim: number | null = null;

/**
 * Creates (or recreates) the embeddings table with the given vector dimension.
 * Called lazily on the first chunk_batch so the dim matches actual model output.
 */
async function ensureEmbeddingsDim(dim: number): Promise<void> {
  if (_embeddingDim === dim) return;
  const db = await getDB();
  // Drop and recreate so the vector dimension is always correct.
  // ON DELETE CASCADE on doc_id means deleting a document still works cleanly.
  await db.exec(`
    DROP TABLE IF EXISTS embeddings;
    CREATE TABLE embeddings (
      id           SERIAL PRIMARY KEY,
      doc_id       INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      chunk_index  INTEGER NOT NULL,
      chunk_text   TEXT NOT NULL,
      embedding    vector(${dim}) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS embeddings_doc_id_idx ON embeddings(doc_id);
  `);
  _embeddingDim = dim;
}

let _worker: Worker | null = null;
let _activeWorkerJobs = 0;
const _processingQueue: Array<{ docId: number; resolve: () => void }> = [];

// ─── PGlite setup ─────────────────────────────────────────────────────────────

async function getDB(): Promise<PGlite> {
  if (_db) return _db;
  if (_dbInitPromise) return _dbInitPromise;

  _dbInitPromise = (async () => {
    const db = new PGlite("idb://buddhi-ai-embeddings", {
      extensions: { vector },
    });
    await db.waitReady;

    // Bootstrap schema — idempotent (IF NOT EXISTS)
    await db.exec(`
      CREATE EXTENSION IF NOT EXISTS vector;

      CREATE TABLE IF NOT EXISTS documents (
        id            INTEGER PRIMARY KEY,
        filename      TEXT NOT NULL,
        original_name TEXT NOT NULL,
        status        TEXT NOT NULL DEFAULT 'pending',
        chunk_count   INTEGER,
        error_msg     TEXT,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );

      -- embeddings table is created lazily on first chunk_batch
      -- so the vector dimension matches the actual model output
    `);

    _db = db;
    return db;
  })();

  return _dbInitPromise;
}

// ─── Worker setup ─────────────────────────────────────────────────────────────

function getWorker(): Worker {
  if (typeof Worker === "undefined") {
    throw new Error(
      "Web Workers are not available in this environment. Document processing requires a browser."
    );
  }

  if (_worker) return _worker;

  _worker = new Worker(
    new URL("@/lib/document-worker.ts", import.meta.url),
    { type: "module" }
  );

  _worker.onmessage = async (evt: MessageEvent<WorkerEvent>) => {
    const msg = evt.data;
    const store = useDocumentStore.getState();

    if (msg.type === "progress") {
      // Update status to "processing" on first non-reading progress event
      if (msg.phase !== "reading") {
        store.updateProgress(msg.docId, msg.phase, msg.overallPct);
      } else {
        store.updateProgress(msg.docId, msg.phase, msg.overallPct);
      }
    } else if (msg.type === "chunk_batch") {
      // Worker sends embedding batches here — main thread owns PGlite
      try {
        // On first batch, (re)create embeddings table with the actual model's dim
        if (msg.embeddingDim !== undefined) {
          await ensureEmbeddingsDim(msg.embeddingDim);
        }
        const db = await getDB();
        for (const chunk of msg.chunks) {
          await db.query(
            `INSERT INTO embeddings (doc_id, chunk_index, chunk_text, embedding)
             VALUES ($1, $2, $3, $4::vector)`,
            [msg.docId, chunk.index, chunk.text, `[${chunk.embedding.join(",")}]`] as unknown[]
          );
        }
        // Mark processing on first batch
        await db.query(
          `UPDATE documents SET status='processing', updated_at=$1 WHERE id=$2 AND status='pending'`,
          [new Date().toISOString(), msg.docId] as unknown[]
        );
      } catch (err) {
        console.error(`[documentsApi] Failed to write chunk batch for doc ${msg.docId}:`, err);
      }
    } else if (msg.type === "complete") {
      try {
        const db = await getDB();
        await db.query(
          `UPDATE documents SET status='completed', chunk_count=$1, updated_at=$2 WHERE id=$3`,
          [msg.chunkCount, new Date().toISOString(), msg.docId] as unknown[]
        );
      } catch (err) {
        console.error(`[documentsApi] Failed to finalize doc ${msg.docId}:`, err);
      }
      store.completeDoc(msg.docId, msg.chunkCount);
      _onWorkerJobDone();
    } else if (msg.type === "error") {
      try {
        const db = await getDB();
        await db.query(
          `UPDATE documents SET status='failed', error_msg=$1, updated_at=$2 WHERE id=$3`,
          [msg.message, new Date().toISOString(), msg.docId] as unknown[]
        );
      } catch (err) {
        console.error(`[documentsApi] Failed to persist error for doc ${msg.docId}:`, err);
      }
      store.failDoc(msg.docId, msg.message);
      _onWorkerJobDone();
    }
  };

  _worker.onerror = (err) => {
    console.error("[DocumentWorker] Worker crashed:", err);
    const store = useDocumentStore.getState();
    // Mark all pending/processing docs as failed
    Object.entries(store.docs).forEach(([id, state]) => {
      if (state.status === "processing" || state.status === "pending") {
        store.failDoc(Number(id), "Worker crashed unexpectedly. Please try again.");
      }
    });
    // Reset active job counter
    _activeWorkerJobs = 0;
    _processingQueue.length = 0;
    _worker = null; // Allow recreation on next call
  };

  return _worker;
}

function _onWorkerJobDone() {
  _activeWorkerJobs = Math.max(0, _activeWorkerJobs - 1);
  // Drain queue
  if (_processingQueue.length > 0 && _activeWorkerJobs < MAX_CONCURRENT) {
    const next = _processingQueue.shift()!;
    _activeWorkerJobs++;
    next.resolve();
  }
}

async function _acquireSlot(docId: number): Promise<void> {
  if (_activeWorkerJobs < MAX_CONCURRENT) {
    _activeWorkerJobs++;
    return;
  }
  return new Promise<void>((resolve) => {
    _processingQueue.push({
      docId,
      resolve: () => {
        _activeWorkerJobs++;
        resolve();
      },
    });
  });
}

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

interface IDBDocRecord {
  id?: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  data: ArrayBuffer;
  created_at: string;
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { autoIncrement: true, keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(
        new Error(
          `Failed to open IndexedDB "${IDB_NAME}": ${req.error?.message}`
        )
      );
  });
}

async function idbPut(record: IDBDocRecord): Promise<number> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () =>
      reject(
        new Error(`Failed to store file in IndexedDB: ${req.error?.message}`)
      );
  });
}

async function idbDelete(id: number): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () =>
      reject(
        new Error(
          `Failed to delete file from IndexedDB: ${req.error?.message}`
        )
      );
  });
}

// ─── Enqueue processing (internal) ───────────────────────────────────────────

function _enqueueProcessing(
  docId: number,
  filename: string,
  mimeType: string
): void {
  // Fire-and-forget; errors reported via worker events → Zustand
  (async () => {
    try {
      await _acquireSlot(docId);
      const worker = getWorker();
      worker.postMessage({
        type: "process",
        docId,
        idbKey: docId,
        filename,
        mimeType,
      } satisfies WorkerCommand);
    } catch (err) {
      const store = useDocumentStore.getState();
      store.failDoc(
        docId,
        (err as Error).message || "Failed to start processing"
      );
    }
  })();
}

// ─── Public reconciliation (call on mount) ────────────────────────────────────

/**
 * Resets any documents that were left in pending/processing state from a
 * previous session (e.g. page reload mid-processing). Call this once on
 * application startup from KnowledgeBaseTab.
 */
export async function reconcileInterruptedDocuments(): Promise<void> {
  try {
    const db = await getDB();
    await db.query(
      `UPDATE documents
       SET status = 'failed',
           error_msg = 'Interrupted by page reload',
           updated_at = $1
       WHERE status IN ('pending', 'processing')`,
      [new Date().toISOString()] as unknown[]
    );
  } catch (err) {
    console.error("[documentsApi] reconcileInterruptedDocuments failed:", err);
  }
}

// ─── Retrieve embeddings for RAG query ───────────────────────────────────────

/**
 * Search for the top-K most similar chunks to a query embedding vector.
 * The caller is responsible for generating the query embedding.
 */
export async function retrieveSimilarChunks(
  queryEmbedding: number[],
  topK = 5
): Promise<EmbeddingResult[]> {
  const db = await getDB();
  const vectorStr = `[${queryEmbedding.join(",")}]`;
  const result = await db.query<EmbeddingResult & { score: number }>(
    `SELECT e.id, e.doc_id, e.chunk_index, e.chunk_text,
            1 - (e.embedding <=> $1::vector) AS score
     FROM embeddings e
     JOIN documents d ON d.id = e.doc_id
     WHERE d.status = 'completed'
     ORDER BY e.embedding <=> $1::vector
     LIMIT $2`,
    [vectorStr, topK]
  );
  return result.rows;
}

// ─── Main API ─────────────────────────────────────────────────────────────────

export const documentsApi = {
  /**
   * Upload a document, store it in IndexedDB, register it in PGlite,
   * and kick off the processing pipeline in the Web Worker.
   */
  async uploadDocument(file: File): Promise<DocumentInfo> {
    // ── Validate size ──────────────────────────────────────────────────────
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File exceeds the 25 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB). ` +
          `Please reduce the file size and try again.`
      );
    }

    // ── Validate type ──────────────────────────────────────────────────────
    const isAllowedExt = /\.(txt|md|pdf)$/i.test(file.name);
    const isAllowedMime = [
      "text/plain",
      "text/markdown",
      "text/x-markdown",
      "application/pdf",
    ].includes(file.type);
    if (!isAllowedExt && !isAllowedMime) {
      throw new Error(
        `"${file.name}" is not supported. Only .txt, .md, and .pdf files are accepted.`
      );
    }

    // ── Read bytes ─────────────────────────────────────────────────────────
    let data: ArrayBuffer;
    try {
      data = await file.arrayBuffer();
    } catch {
      throw new Error(
        `Failed to read "${file.name}". The file may be locked or inaccessible.`
      );
    }

    const now = new Date().toISOString();
    // Sanitize filename: prefix with timestamp to avoid collisions
    const sanitizedName = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;

    // ── Write to IndexedDB — this generates the canonical ID ───────────────
    const idbKey = await idbPut({
      filename: sanitizedName,
      original_name: file.name,
      mime_type: file.type || "text/plain",
      size: file.size,
      data,
      created_at: now,
    });

    // ── Insert into PGlite documents table ─────────────────────────────────
    const db = await getDB();
    try {
      await db.query(
        `INSERT INTO documents (id, filename, original_name, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'pending', $4, $4)`,
        [idbKey, sanitizedName, file.name, now] as unknown[]
      );
    } catch (pgErr) {
      // Roll back IDB record if PGlite insert fails
      try {
        await idbDelete(idbKey);
      } catch {
        /* ignore secondary failure */
      }
      throw new Error(
        `Failed to register document in database: ${(pgErr as Error).message}`
      );
    }

    // ── Register in Zustand store (pending) ────────────────────────────────
    useDocumentStore.getState().initDoc(idbKey);

    // ── Enqueue for processing ─────────────────────────────────────────────
    _enqueueProcessing(idbKey, sanitizedName, file.type || "text/plain");

    return {
      id: idbKey,
      filename: sanitizedName,
      original_name: file.name,
      status: "pending",
      chunk_count: null,
      error_msg: null,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * List all documents ordered by creation time (newest first).
   */
  async listDocuments(): Promise<DocumentInfo[]> {
    const db = await getDB();
    const result = await db.query<DocumentInfo>(
      `SELECT id, filename, original_name, status, chunk_count, error_msg,
              created_at, updated_at
       FROM documents
       ORDER BY created_at DESC`
    );
    return result.rows;
  },

  /**
   * Get a single document by ID.
   */
  async getDocument(id: number): Promise<DocumentInfo> {
    const db = await getDB();
    const result = await db.query<DocumentInfo>(
      `SELECT id, filename, original_name, status, chunk_count, error_msg,
              created_at, updated_at
       FROM documents WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      throw new Error(`Document with id ${id} was not found.`);
    }
    return result.rows[0];
  },

  /**
   * Delete a document: cancels processing if active, removes from PGlite
   * (CASCADE deletes all embeddings), and deletes the raw file from IndexedDB.
   */
  async deleteDocument(id: number): Promise<void> {
    // Cancel any in-flight processing
    if (_worker) {
      _worker.postMessage({ type: "cancel", docId: id } satisfies WorkerCommand);
    }
    // Also remove from processing queue
    const queueIdx = _processingQueue.findIndex((q) => q.docId === id);
    if (queueIdx !== -1) {
      _processingQueue.splice(queueIdx, 1);
    }

    // Remove from Zustand store (decrements activeCount if applicable)
    useDocumentStore.getState().removeDoc(id);

    // Delete from PGlite (CASCADE removes embeddings)
    try {
      const db = await getDB();
      await db.query(`DELETE FROM documents WHERE id = $1`, [id] as unknown[]);
    } catch (err) {
      console.error(`[documentsApi] PGlite delete failed for doc ${id}:`, err);
      throw new Error(
        `Failed to remove document from database: ${(err as Error).message}`
      );
    }

    // Delete raw file from IndexedDB (non-fatal if it fails)
    try {
      await idbDelete(id);
    } catch (err) {
      console.warn(
        `[documentsApi] IDB delete failed for doc ${id} (non-fatal):`,
        err
      );
    }
  },

  /**
   * Returns how many processing slots are currently in use (0–5).
   * The component subscribes to useDocumentStore directly for live progress.
   */
  getActiveCount(): number {
    return _activeWorkerJobs;
  },
};
