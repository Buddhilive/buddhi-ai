/**
 * document-worker.ts
 *
 * Dedicated Web Worker for the CPU/GPU-intensive parts of RAG ingestion:
 *  1. Read raw file bytes from IndexedDB (buffered)
 *  2. Chunk text with LlamaIndex SentenceSplitter
 *  3. Generate embeddings with @browser-ai/transformers-js
 *
 * All PGlite writes happen on the main thread — the worker sends embedding
 * results back via postMessage so there is only ONE PGlite connection.
 */

import { SentenceSplitter, Document } from "llamaindex";
import { transformersJS, type TransformersJSEmbeddingModel } from "@browser-ai/transformers-js";
import { embedMany } from "ai";
import { MODELS } from "./models";

// ─── Constants ────────────────────────────────────────────────────────────────

const IDB_NAME = "buddhi-ai-doc-store";
const IDB_STORE = "files";
const READ_BUFFER_SIZE = 64 * 1024; // 64 KB per decode pass
const CHUNK_SIZE = 200;
const CHUNK_OVERLAP = 20;
const EMBED_BATCH_SIZE = 32;
// Find the embedding model from configuration (not the language model)
const _embeddingModelConfig = MODELS.find((m) => m.type === "embedding");
if (!_embeddingModelConfig) throw new Error("No embedding model found in MODELS config");
const EMBEDDING_MODEL_ID = _embeddingModelConfig.id;

// ─── Message types (also exported and imported by documents.ts) ───────────────

export type DocPhase = "reading" | "chunking" | "embedding" | null;

export type WorkerCommand =
  | {
    type: "process";
    docId: number;
    idbKey: number;
    filename: string;
    mimeType: string;
  }
  | { type: "cancel"; docId: number };

export type ChunkResult = {
  index: number;
  text: string;
  embedding: number[];
};

export type WorkerEvent =
  | {
    type: "progress";
    docId: number;
    phase: DocPhase;
    pct: number;
    overallPct: number;
  }
  | {
    // Batch of embedded chunks — main thread writes these to PGlite.
    // embeddingDim is only set on the very first batch so the main thread
    // can (re)create the embeddings table with the correct vector dimension.
    type: "chunk_batch";
    docId: number;
    chunks: ChunkResult[];
    embeddingDim?: number;
  }
  | { type: "complete"; docId: number; chunkCount: number }
  | { type: "error"; docId: number; message: string };

// ─── Embedding model singleton ────────────────────────────────────────────────

let _embedder: TransformersJSEmbeddingModel | null = null;
let _embedderInitPromise: Promise<void> | null = null;

async function ensureEmbedder(): Promise<void> {
  if (_embedder) return;
  if (_embedderInitPromise) return _embedderInitPromise;

  _embedderInitPromise = (async () => {
    // Try WebGPU first, fall back to CPU
    // transformersJS.embedding() returns EmbeddingModelV3 but the runtime
    // object is TransformersJSEmbeddingModel which has createSessionWithProgress
    try {
      const m = transformersJS.embedding(EMBEDDING_MODEL_ID, {
        device: "webgpu",
        dtype: "q4",
      }) as unknown as TransformersJSEmbeddingModel;
      await m.createSessionWithProgress(() => { });
      _embedder = m;
    } catch {
      const m = transformersJS.embedding(EMBEDDING_MODEL_ID, {
        device: "wasm",
        dtype: "q4",
      }) as unknown as TransformersJSEmbeddingModel;
      await m.createSessionWithProgress(() => { });
      _embedder = m;
    }
  })();

  return _embedderInitPromise;
}

// ─── Cancellation flags ───────────────────────────────────────────────────────

const cancelFlags = new Set<number>();

// ─── Serial processing queue ──────────────────────────────────────────────────

const queue: WorkerCommand[] = [];
let isProcessing = false;

async function drainQueue() {
  if (isProcessing) return;
  isProcessing = true;
  while (queue.length > 0) {
    const cmd = queue.shift()!;
    if (cmd.type === "process") {
      await processDocument(cmd);
    }
  }
  isProcessing = false;
}

// ─── Buffered IDB file reader ─────────────────────────────────────────────────

function readFileFromIDB(
  key: number,
  onProgress: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const openReq = indexedDB.open(IDB_NAME, 1);

    openReq.onerror = () =>
      reject(
        new Error(`Failed to open IndexedDB: ${openReq.error?.message ?? "unknown error"}`)
      );

    openReq.onsuccess = () => {
      const idb = openReq.result;
      const tx = idb.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(key);

      getReq.onerror = () =>
        reject(
          new Error(
            `Failed to read file from IndexedDB: ${getReq.error?.message ?? "unknown error"}`
          )
        );

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (!record) {
          reject(new Error(`File record ${key} not found in IndexedDB`));
          return;
        }

        const buffer: ArrayBuffer = record.data;
        const total = buffer.byteLength;
        const decoder = new TextDecoder("utf-8");
        const parts: string[] = [];
        let offset = 0;

        while (offset < total) {
          const end = Math.min(offset + READ_BUFFER_SIZE, total);
          const isLast = end === total;
          parts.push(decoder.decode(buffer.slice(offset, end), { stream: !isLast }));
          offset = end;
          onProgress(Math.round((offset / total) * 100));
        }

        resolve(parts.join(""));
      };
    };
  });
}

// ─── Core pipeline ────────────────────────────────────────────────────────────

async function processDocument(
  cmd: Extract<WorkerCommand, { type: "process" }>
) {
  const { docId, idbKey, mimeType, filename } = cmd;

  function postProgress(phase: DocPhase, pct: number, overallPct: number) {
    self.postMessage({
      type: "progress",
      docId,
      phase,
      pct,
      overallPct,
    } satisfies WorkerEvent);
  }

  try {
    // ── Validate MIME type ────────────────────────────────────────────────
    if (
      mimeType === "application/pdf" ||
      filename.toLowerCase().endsWith(".pdf")
    ) {
      throw new Error(
        "PDF text extraction is not yet supported. Please convert to .txt or .md first."
      );
    }

    // ── Phase 1: Read from IndexedDB (buffered) ───────────────────────────
    postProgress("reading", 0, 0);

    const text = await readFileFromIDB(idbKey, (pct) => {
      postProgress("reading", pct, Math.round(pct * 0.1));
    });

    if (cancelFlags.has(docId)) {
      cancelFlags.delete(docId);
      return;
    }

    if (text.trim().length === 0) {
      throw new Error("Document is empty or contains no extractable text.");
    }

    // ── Phase 2: Chunk with LlamaIndex ───────────────────────────────────
    postProgress("chunking", 0, 10);

    const splitter = new SentenceSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });
    const doc = new Document({ text, id_: String(docId) });
    const nodes = await splitter.getNodesFromDocuments([doc]);

    if (cancelFlags.has(docId)) {
      cancelFlags.delete(docId);
      return;
    }

    if (nodes.length === 0) {
      throw new Error("Document produced no text chunks after splitting.");
    }

    postProgress("chunking", 100, 30);

    // ── Phase 3: Embed + stream batches back to main thread ───────────────
    await ensureEmbedder();

    const totalChunks = nodes.length;
    let embeddedCount = 0;
    let firstBatch = true;

    for (let i = 0; i < nodes.length; i += EMBED_BATCH_SIZE) {
      if (cancelFlags.has(docId)) {
        cancelFlags.delete(docId);
        return;
      }

      const batch = nodes.slice(i, i + EMBED_BATCH_SIZE);
      const texts = batch.map((n) => n.getContent());

      let vectors: number[][];
      try {
        const result = await embedMany({
          model: _embedder!,
          values: texts,
        });
        vectors = result.embeddings;
      } catch (embErr) {
        throw new Error(
          `Embedding failed at chunk ${i}: ${(embErr as Error).message}. ` +
          `Ensure the "${EMBEDDING_MODEL_ID}" model is installed on the Models page.`
        );
      }

      // Send batch to main thread for PGlite storage.
      // On first batch, include embeddingDim so main thread can (re)create
      // the embeddings table with the correct vector dimension.
      const chunks: ChunkResult[] = batch.map((_, j) => ({
        index: i + j,
        text: texts[j],
        embedding: vectors[j],
      }));

      self.postMessage({
        type: "chunk_batch",
        docId,
        chunks,
        ...(firstBatch ? { embeddingDim: vectors[0].length } : {}),
      } satisfies WorkerEvent);
      firstBatch = false;

      embeddedCount += batch.length;
      const embPct = Math.round((embeddedCount / totalChunks) * 100);
      const overallPct = 30 + Math.round(embPct * 0.7);
      postProgress("embedding", embPct, overallPct);
    }

    self.postMessage({
      type: "complete",
      docId,
      chunkCount: totalChunks,
    } satisfies WorkerEvent);
  } catch (err) {
    const message =
      (err as Error).message || "An unknown error occurred during processing.";
    self.postMessage({ type: "error", docId, message } satisfies WorkerEvent);
  }
}

// ─── Message dispatcher ───────────────────────────────────────────────────────

self.onmessage = (evt: MessageEvent<WorkerCommand>) => {
  const msg = evt.data;

  if (msg.type === "process") {
    queue.push(msg);
    drainQueue();
  } else if (msg.type === "cancel") {
    cancelFlags.add(msg.docId);
    const idx = queue.findIndex(
      (c) => c.type === "process" && c.docId === msg.docId
    );
    if (idx !== -1) queue.splice(idx, 1);
  }
};
