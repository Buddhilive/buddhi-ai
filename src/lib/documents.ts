/**
 * documents.ts — Global Knowledge Base API
 *
 * Manages the full document lifecycle:
 *   1. Validate & store raw file in IndexedDB ("buddhi-ai-doc-store")
 *   2. Run the vectorization pipeline (extract → chunk → embed → save to PGlite)
 *   3. Track real-time progress via the Zustand document-store
 *   4. Support reconciliation of documents interrupted by a page close
 */

import { extractTextFromPDF } from "@/lib/text-embeddings";
import {
  chunkText,
  createVectorIndexBatched,
  deleteDocumentEmbeddings,
} from "@/lib/llamaindex-provider";
import { useDocumentStore, DocPhase } from "@/stores/document-store";

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_STORE_DB_NAME = "buddhi-ai-doc-store";
const DOC_STORE_DB_VERSION = 1;
const DOC_STORE_NAME = "documents";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const SUPPORTED_EXTENSIONS = ["pdf", "txt", "md"];

/** chatId used in PGlite for all global knowledge-base documents */
export const GLOBAL_KB_CHAT_ID = "knowledge-base-global";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentInfo {
  id: number;
  original_name: string;
  file_size: number;
  status: "pending" | "processing" | "completed" | "failed";
  chunk_count: number | null;
  error_msg: string | null;
  created_at: string;
}

interface DocStoreRecord extends DocumentInfo {
  file_data: ArrayBuffer;
}

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDocStoreDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DOC_STORE_DB_NAME, DOC_STORE_DB_VERSION);

    req.onerror = () =>
      reject(new Error(`Failed to open doc store: ${req.error?.message ?? req.error}`));

    req.onsuccess = () => {
      _db = req.result;
      // Re-open on connection close (e.g. version upgrade from another tab)
      req.result.onclose = () => { _db = null; };
      resolve(req.result);
    };

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DOC_STORE_NAME)) {
        const store = db.createObjectStore(DOC_STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
      }
    };
  });
}

async function idbPut(record: DocStoreRecord): Promise<void> {
  const db = await openDocStoreDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOC_STORE_NAME, "readwrite");
    const req = tx.objectStore(DOC_STORE_NAME).put(record);
    req.onsuccess = () => resolve();
    req.onerror = () =>
      reject(new Error(`IDB put failed: ${req.error?.message ?? req.error}`));
  });
}

async function idbUpdate(id: number, patch: Partial<DocStoreRecord>): Promise<void> {
  const db = await openDocStoreDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOC_STORE_NAME, "readwrite");
    const store = tx.objectStore(DOC_STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const existing: DocStoreRecord | undefined = getReq.result;
      if (!existing) {
        // Doc may have been deleted — silently skip
        resolve();
        return;
      }
      const putReq = store.put({ ...existing, ...patch });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () =>
        reject(new Error(`IDB update failed: ${putReq.error?.message ?? putReq.error}`));
    };

    getReq.onerror = () =>
      reject(new Error(`IDB get failed: ${getReq.error?.message ?? getReq.error}`));
  });
}

async function idbGet(id: number): Promise<DocStoreRecord | null> {
  const db = await openDocStoreDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOC_STORE_NAME, "readonly");
    const req = tx.objectStore(DOC_STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () =>
      reject(new Error(`IDB get failed: ${req.error?.message ?? req.error}`));
  });
}

async function idbGetAll(): Promise<DocStoreRecord[]> {
  const db = await openDocStoreDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOC_STORE_NAME, "readonly");
    const req = tx.objectStore(DOC_STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () =>
      reject(new Error(`IDB getAll failed: ${req.error?.message ?? req.error}`));
  });
}

async function idbDelete(id: number): Promise<void> {
  const db = await openDocStoreDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOC_STORE_NAME, "readwrite");
    const req = tx.objectStore(DOC_STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () =>
      reject(new Error(`IDB delete failed: ${req.error?.message ?? req.error}`));
  });
}

/** Strip file_data before returning to callers */
function toInfo(record: DocStoreRecord): DocumentInfo {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { file_data, ...info } = record;
  return info;
}

// ─── Vectorization pipeline ───────────────────────────────────────────────────

/**
 * Runs entirely asynchronously — never awaited by the caller.
 * Updates Zustand store at each stage so the UI stays in sync.
 */
async function runPipeline(doc: DocumentInfo, fileData: ArrayBuffer): Promise<void> {
  const store = useDocumentStore.getState();

  try {
    // ── Stage 1: text extraction ──────────────────────────────────────────
    store.updateProgress(doc.id, "reading" as DocPhase, 5);
    await idbUpdate(doc.id, { status: "processing" });

    const file = new File([fileData], doc.original_name);
    const ext = doc.original_name.split(".").pop()?.toLowerCase();

    let text: string;
    if (ext === "pdf") {
      text = await extractTextFromPDF(file);
    } else {
      text = await file.text();
    }

    if (!text || text.trim().length === 0) {
      throw new Error(
        ext === "pdf"
          ? "No extractable text found. Scanned/image-only PDFs are not supported — please use a text-based PDF."
          : "File appears to be empty."
      );
    }

    // ── Stage 2: chunking ────────────────────────────────────────────────
    store.updateProgress(doc.id, "chunking" as DocPhase, 30);
    const chunks = await chunkText(text, 200, 20, doc.id.toString());

    if (chunks.length === 0) {
      throw new Error("No chunks were generated — the document may contain only whitespace.");
    }

    // ── Stage 3: embedding + storage (batched, 50 chunks at a time) ──────
    store.updateProgress(doc.id, "embedding" as DocPhase, 35);

    let totalChunks = 0;
    await createVectorIndexBatched(
      chunks,
      GLOBAL_KB_CHAT_ID,
      doc.id.toString(),
      doc.original_name,
      (processed, total) => {
        // Map 0-100% onto the 35-95% window
        const pct = 35 + Math.round((processed / total) * 60);
        store.updateProgress(doc.id, "embedding" as DocPhase, Math.min(pct, 95));
        totalChunks = total;
      }
    );

    // ── Done ─────────────────────────────────────────────────────────────
    await idbUpdate(doc.id, {
      status: "completed",
      chunk_count: totalChunks,
      error_msg: null,
    });
    store.completeDoc(doc.id, totalChunks);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "An unknown error occurred during processing.";
    console.error(`[documents] Pipeline error for doc ${doc.id} ("${doc.original_name}"):`, error);

    // Persist failure state
    try {
      await idbUpdate(doc.id, { status: "failed", error_msg: msg });
    } catch (updateErr) {
      console.error("[documents] Could not persist failure to IDB:", updateErr);
    }

    // Clean up any partial embeddings written before the failure
    try {
      await deleteDocumentEmbeddings(doc.id.toString());
    } catch (cleanupErr) {
      console.error("[documents] Could not clean up partial embeddings:", cleanupErr);
    }

    store.failDoc(doc.id, msg);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const documentsApi = {
  /**
   * Validate, persist, and begin processing a file.
   * Returns immediately with the new DocumentInfo — progress is tracked via Zustand.
   */
  async uploadDocument(file: File): Promise<DocumentInfo> {
    // ── Validate extension ────────────────────────────────────────────────
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      throw new Error(
        `Unsupported file type ".${ext}". Please upload a PDF, TXT, or MD file.`
      );
    }

    // ── Validate size ─────────────────────────────────────────────────────
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — ` +
          `files must be 25 MB or smaller.`
      );
    }

    // ── Capacity check ────────────────────────────────────────────────────
    const activeCount = useDocumentStore.getState().activeCount;
    if (activeCount >= 5) {
      throw new Error(
        "Processing queue is full (5/5 slots in use). Wait for a document to finish before uploading more."
      );
    }

    // ── Read bytes ────────────────────────────────────────────────────────
    let fileData: ArrayBuffer;
    try {
      fileData = await file.arrayBuffer();
    } catch {
      throw new Error(`Could not read "${file.name}". The file may be locked or corrupted.`);
    }

    // ── Build record ──────────────────────────────────────────────────────
    const id = Date.now();
    const doc: DocumentInfo = {
      id,
      original_name: file.name,
      file_size: file.size,
      status: "pending",
      chunk_count: null,
      error_msg: null,
      created_at: new Date().toISOString(),
    };

    // ── Persist to IDB ────────────────────────────────────────────────────
    try {
      await idbPut({ ...doc, file_data: fileData });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("quota")) {
        throw new Error(
          "Browser storage quota exceeded. Delete some documents to free space before uploading."
        );
      }
      throw new Error(`Failed to save document to local storage: ${msg}`);
    }

    // ── Register in Zustand & kick off pipeline ───────────────────────────
    useDocumentStore.getState().initDoc(id);
    runPipeline(doc, fileData); // intentionally not awaited

    return doc;
  },

  /** List all documents (metadata only, sorted newest-first). */
  async listDocuments(): Promise<DocumentInfo[]> {
    try {
      const records = await idbGetAll();
      return records
        .map(toInfo)
        .sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    } catch (err) {
      throw new Error(
        `Failed to load documents: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  },

  /** Fetch a single document's current metadata. */
  async getDocument(id: number): Promise<DocumentInfo> {
    const record = await idbGet(id);
    if (!record) throw new Error(`Document ${id} not found.`);
    return toInfo(record);
  },

  /**
   * Remove a document — deletes its vector embeddings from PGlite,
   * then removes the IDB record and Zustand state.
   */
  async deleteDocument(id: number): Promise<void> {
    // Remove vector embeddings first (best-effort)
    try {
      await deleteDocumentEmbeddings(id.toString());
    } catch (err) {
      console.error(
        `[documents] Failed to delete embeddings for doc ${id} — continuing with IDB deletion:`,
        err
      );
    }

    await idbDelete(id);
    useDocumentStore.getState().removeDoc(id);
  },
};

// ─── Reconciliation ───────────────────────────────────────────────────────────

/**
 * Call on app/page mount to handle documents that were stuck in "pending" or
 * "processing" state because the tab was closed or refreshed mid-pipeline.
 *
 * - If there are free processing slots, re-queues the interrupted documents.
 * - If the queue is already full, marks them as failed with an actionable message.
 */
export async function reconcileInterruptedDocuments(): Promise<void> {
  try {
    const records = await idbGetAll();
    const interrupted = records.filter(
      (r) => r.status === "pending" || r.status === "processing"
    );

    if (interrupted.length === 0) return;

    console.info(
      `[documents] Reconciling ${interrupted.length} interrupted document(s)…`
    );

    const store = useDocumentStore.getState();

    for (const record of interrupted) {
      if (store.activeCount < 5) {
        store.initDoc(record.id);
        runPipeline(toInfo(record), record.file_data);
      } else {
        // Queue is full — mark as failed so the user can re-upload
        await idbUpdate(record.id, {
          status: "failed",
          error_msg:
            "Processing was interrupted (page was closed or refreshed). Please re-upload the file.",
        });
      }
    }
  } catch (err) {
    console.error("[documents] reconcileInterruptedDocuments failed:", err);
  }
}
