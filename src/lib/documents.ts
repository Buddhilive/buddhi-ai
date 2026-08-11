/**
 * documents.ts — Global Knowledge Base API
 *
 * Manages the full document lifecycle:
 *   1. Validate & store raw file in IndexedDB ("buddhi-ai-doc-store")
 *   2. Run the OKF ingestion pipeline (extract → build concept → index → save)
 *   3. Track real-time progress via the Zustand document-store
 *   4. Support reconciliation of documents interrupted by a page close
 */

import { extractText, fileToConcept, PRODUCER_ACTOR } from "@/lib/okf/ingest";
import { putConcept, deleteConcept, getAllConcepts } from "@/lib/okf/store";
import { indexConcept, removeFromIndex } from "@/lib/okf/search";
import { serializeFrontmatter } from "@/lib/okf/frontmatter";
import { extractFrontmatterWithLlm } from "@/lib/okf/enrich";
import { extractConceptsWithLlm, type DecomposedConcept } from "@/lib/okf/decompose";
import { uniqueConceptId } from "@/lib/okf/bundle";
import { useDocumentStore } from "@/stores/document-store";
import { useLiteRTModelStore } from "@/stores/litert-store";
import { DocPhase, DocumentInfo, DocStoreRecord } from "@/types/documents";
import type { OkfConcept, OkfFrontmatter } from "@/lib/okf/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_STORE_DB_NAME = "buddhi-ai-doc-store";
const DOC_STORE_DB_VERSION = 1;
const DOC_STORE_NAME = "documents";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const SUPPORTED_EXTENSIONS = ["pdf", "txt", "md"];

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

// ─── OKF ingestion pipeline ────────────────────────────────────────────────────

/**
 * Best-effort content classification via the on-device model. Mutates
 * `concept.frontmatter`/`concept.raw` in place; no-ops (and never throws) if
 * no model is ready or extraction fails.
 */
async function enrichConceptIfPossible(docId: number, concept: OkfConcept): Promise<void> {
    const { liteRTModelInstance, liteRTModelStatus } = useLiteRTModelStore.getState();
    if (liteRTModelStatus !== "ready" || !liteRTModelInstance) return;

    try {
        const fields = await extractFrontmatterWithLlm(liteRTModelInstance, concept.fileName, concept.body);
        if (fields) {
            Object.assign(concept.frontmatter, fields);
            concept.raw = serializeFrontmatter(concept.frontmatter, concept.body);
        }
    } catch (err) {
        console.warn(`[documents] LLM enrichment failed for doc ${docId}, keeping default frontmatter:`, err);
    }
}

/**
 * Best-effort decomposition into several cross-linked sub-concepts via the
 * on-device model. Returns `[]` (never throws) when no model is ready, the
 * document isn't eligible, or extraction fails — callers should treat that
 * as "root concept only," exactly like the pre-decomposition behavior.
 * Mutates `root.body`/`root.raw` in place to link out to whatever
 * sub-concepts are returned.
 */
async function decomposeConceptIfPossible(
    docId: number,
    root: OkfConcept,
    text: string,
    existingIds: Set<string>
): Promise<OkfConcept[]> {
    const { liteRTModelInstance, liteRTModelStatus } = useLiteRTModelStore.getState();
    if (liteRTModelStatus !== "ready" || !liteRTModelInstance) return [];

    let decomposed: DecomposedConcept[] | null = null;
    try {
        decomposed = await extractConceptsWithLlm(liteRTModelInstance, root.fileName, text);
    } catch (err) {
        console.warn(`[documents] LLM decomposition failed for doc ${docId}, keeping single concept:`, err);
    }
    if (!decomposed) {
        // extractConceptsWithLlm returns null when model runs but produces invalid output;
        // see console for [okf/decompose] warnings about why
        return [];
    }
    if (decomposed.length === 0) return [];

    const slugToId = new Map<string, string>();
    for (const d of decomposed) {
        const id = uniqueConceptId(`${root.id}--${d.slug}`, existingIds);
        existingIds.add(id);
        slugToId.set(d.slug, id);
    }

    const now = new Date().toISOString();
    const subConcepts: OkfConcept[] = decomposed.map((d) => {
        const id = slugToId.get(d.slug)!;
        const relatedLinks = d.relatesTo
            .map((slug) => slugToId.get(slug))
            .filter((relId): relId is string => Boolean(relId) && relId !== id);

        let body = d.body.trim();
        body += `\n\nPart of [${root.frontmatter.title ?? root.id}](/${root.id}.md).`;
        if (relatedLinks.length > 0) {
            body += `\n\nSee also: ${relatedLinks.map((relId) => `[${relId}](/${relId}.md)`).join(", ")}.`;
        }

        const frontmatter: OkfFrontmatter = {
            type: d.type,
            title: d.title,
            ...(d.description ? { description: d.description } : {}),
            ...(d.tags.length > 0 ? { tags: d.tags } : {}),
            generated: { by: PRODUCER_ACTOR, at: now },
        };

        return {
            id,
            frontmatter,
            body,
            raw: serializeFrontmatter(frontmatter, body),
            fileName: root.fileName,
            fileSize: body.length,
            createdAt: now,
        };
    });

    root.body = `${root.body.trim()}\n\n# Concepts\n\n${subConcepts
        .map((c) => `- [${c.frontmatter.title ?? c.id}](/${c.id}.md)`)
        .join("\n")}\n`;
    root.raw = serializeFrontmatter(root.frontmatter, root.body);

    return subConcepts;
}
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
        const text = await extractText(file);

        // ── Stage 2: build OKF concept ─────────────────────────────────────────
        store.updateProgress(doc.id, "parsing" as DocPhase, 30);
        const existingIds = new Set((await getAllConcepts()).map((c) => c.id));
        const { concept, enrichable } = fileToConcept(file, text, existingIds);
        existingIds.add(concept.id);

        // ── Stage 2b: optional on-device LLM classification ────────────────────
        if (enrichable) {
            store.updateProgress(doc.id, "enriching" as DocPhase, 45);
            await enrichConceptIfPossible(doc.id, concept);
        }

        // ── Stage 2c: optional on-device decomposition into linked sub-concepts ─
        let subConcepts: OkfConcept[] = [];
        if (enrichable) {
            store.updateProgress(doc.id, "enriching" as DocPhase, 60);
            subConcepts = await decomposeConceptIfPossible(doc.id, concept, text, existingIds);
        }
        const allConcepts = [concept, ...subConcepts];

        // ── Stage 3: keyword-index every concept ─────────────────────────────────
        store.updateProgress(doc.id, "indexing" as DocPhase, 70);
        for (const c of allConcepts) {
            await indexConcept(c);
        }

        // ── Stage 4: persist every concept ────────────────────────────────────────
        store.updateProgress(doc.id, "saving" as DocPhase, 90);
        for (const c of allConcepts) {
            await putConcept(c);
        }

        // ── Done ─────────────────────────────────────────────────────────────
        await idbUpdate(doc.id, {
            status: "completed",
            concept_id: concept.id,
            concept_ids: allConcepts.map((c) => c.id),
            error_msg: null,
        });
        store.completeDoc(doc.id);
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
            concept_id: null,
            concept_ids: null,
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
     * Remove a document — deletes its OKF concept from the store/search index,
     * then removes the IDB record and Zustand state.
     */
    async deleteDocument(id: number): Promise<void> {
        const record = await idbGet(id);

        const conceptIds = record?.concept_ids ?? (record?.concept_id ? [record.concept_id] : []);

        for (const conceptId of conceptIds) {
            try {
                await deleteConcept(conceptId);
                await removeFromIndex(conceptId);
            } catch (err) {
                console.error(
                    `[documents] Failed to delete OKF concept "${conceptId}" for doc ${id} — continuing with IDB deletion:`,
                    err
                );
            }
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



