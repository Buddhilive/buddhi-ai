/**
 * store.ts — IndexedDB-backed OKF concept store.
 *
 * One object store ("concepts"), one record per concept, keyed by concept id.
 * Replaces PGlite's idb://buddhi-ai-embeddings-v2 vector table entirely.
 */

import type { OkfConcept } from "@/lib/okf/types";

const DB_NAME = "buddhi-ai-okf-store";
const DB_VERSION = 1;
const STORE_NAME = "concepts";

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
    if (_db) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onerror = () =>
            reject(new Error(`Failed to open OKF store: ${req.error?.message ?? req.error}`));

        req.onsuccess = () => {
            _db = req.result;
            req.result.onclose = () => { _db = null; };
            resolve(req.result);
        };

        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
    });
}

export async function putConcept(concept: OkfConcept): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const req = tx.objectStore(STORE_NAME).put(concept);
        req.onsuccess = () => resolve();
        req.onerror = () =>
            reject(new Error(`OKF store put failed: ${req.error?.message ?? req.error}`));
    });
}

export async function getConcept(id: string): Promise<OkfConcept | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () =>
            reject(new Error(`OKF store get failed: ${req.error?.message ?? req.error}`));
    });
}

export async function getAllConcepts(): Promise<OkfConcept[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () =>
            reject(new Error(`OKF store getAll failed: ${req.error?.message ?? req.error}`));
    });
}

export async function deleteConcept(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const req = tx.objectStore(STORE_NAME).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () =>
            reject(new Error(`OKF store delete failed: ${req.error?.message ?? req.error}`));
    });
}

/** Cheap existence check — avoids hydrating the search index unnecessarily. */
export async function hasConcepts(): Promise<boolean> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const req = tx.objectStore(STORE_NAME).count();
            req.onsuccess = () => resolve(req.result > 0);
            req.onerror = () =>
                reject(new Error(`OKF store count failed: ${req.error?.message ?? req.error}`));
        });
    } catch {
        return false;
    }
}
