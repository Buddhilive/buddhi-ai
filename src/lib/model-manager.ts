"use client";

import { MODELS, ModelConfig } from "@/const/models";
import { useModelStore, ModelState } from "@/stores/model-store";
import type {
    WorkerRequest,
    WorkerMessage,
    ProgressMessage,
    CompleteMessage,
    ErrorMessage,
    CacheStatusMessage,
    DeletedMessage,
} from "@/workers/model-download-worker";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ModelDownloadRequest {
    model: string;
    accessToken?: string; // HuggingFace access token — required for gated models
}

export interface ModelInfo {
    id: string;
    name: string;
    type: "language" | "embedding" | "translator";
    status: "not_installed" | "downloading" | "completed" | "failed" | "unavailable";
    progress: number;
    error?: string;
}

// ─── Worker singleton ─────────────────────────────────────────────────────────
//
// The worker is created once per browser session (module-level) so it survives
// component unmounts and cross-page navigation. Progress updates are routed to
// the Zustand store, which is subscribed to by the UI.

let _worker: Worker | null = null;

// Pending cache-check promises, keyed by modelId
const cacheCheckResolvers = new Map<string, (cached: boolean) => void>();

// Pending delete promises, keyed by modelId
const deleteResolvers = new Map<string, () => void>();

function getWorker(): Worker {
    if (typeof window === "undefined") {
        throw new Error("Model worker is only available in browser context.");
    }
    if (!_worker) {
        _worker = new Worker(
            new URL("../workers/model-download-worker.ts", import.meta.url),
            { type: "module" }
        );
        _worker.addEventListener("message", onWorkerMessage);
        _worker.addEventListener("error", onWorkerError);
    }
    return _worker;
}

function onWorkerMessage(event: MessageEvent<WorkerMessage>): void {
    const msg = event.data;
    const store = useModelStore.getState();

    switch (msg.type) {
        case "progress": {
            const { modelId, percentage } = msg as ProgressMessage;
            store.setModel(modelId, { status: "downloading", progress: percentage });
            break;
        }

        case "complete": {
            const { modelId } = msg as CompleteMessage;
            store.setModel(modelId, { status: "completed", progress: 100, error: undefined });
            break;
        }

        case "error": {
            const { modelId, message, code } = msg as ErrorMessage;
            if (code === "CANCELLED") {
                // User-initiated cancel — reset to not_installed instead of failed
                store.setModel(modelId, { status: "not_installed", progress: 0, error: undefined });
            } else {
                store.setModel(modelId, { status: "failed", progress: 0, error: message });
            }
            break;
        }

        case "cache-status": {
            const { modelId, cached } = msg as CacheStatusMessage;
            const resolver = cacheCheckResolvers.get(modelId);
            if (resolver) {
                resolver(cached);
                cacheCheckResolvers.delete(modelId);
            }
            break;
        }

        case "deleted": {
            const { modelId } = msg as DeletedMessage;
            store.removeModel(modelId);
            const resolver = deleteResolvers.get(modelId);
            if (resolver) {
                resolver();
                deleteResolvers.delete(modelId);
            }
            break;
        }
    }
}

function onWorkerError(event: ErrorEvent): void {
    console.error("[model-manager] Worker error:", event.message, event.error);
}

function toModelInfo(id: string, state: ModelState, config: ModelConfig): ModelInfo {
    return {
        id,
        name: config.name,
        type: config.type,
        status: state.status,
        progress: state.progress,
        error: state.error,
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Ask worker to check the Cache API; returns a promise that resolves when worker replies. */
function checkCacheForModel(modelId: string): Promise<boolean> {
    return new Promise((resolve) => {
        cacheCheckResolvers.set(modelId, resolve);
        getWorker().postMessage({ type: "check-cache", modelId } satisfies WorkerRequest);
    });
}

// ─── Cache access (main thread) ───────────────────────────────────────────────
//
// Must mirror the constants in model-download-worker.ts exactly.

const CACHE_NAME = "buddhi-ai-models-cache-v1";
function modelCacheKey(modelId: string): string {
    return `https://cache.buddhi-ai.local/models/${modelId.replace(/\//g, "_")}`;
}

/**
 * Retrieve the downloaded model from the Cache API and return a blob: URL.
 * The caller is responsible for calling URL.revokeObjectURL() when done.
 * Returns null if the model is not in the cache.
 */
export async function getModelObjectURL(modelId: string): Promise<string | null> {
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(new Request(modelCacheKey(modelId)));
        if (!response) return null;
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch {
        return null;
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const modelsApi = {
    /**
     * Reconcile Zustand store state with actual browser Cache API.
     *
     * Must be called on page load (after store rehydration). Handles the case
     * where a download was interrupted by a page reload:
     *   - `downloading` in store + no active worker download → reset to `failed`
     *   - `completed` in store but not in cache → reset to `not_installed`
     *   - `not_installed` in store but found in cache → mark as `completed`
     */
    async listModels(): Promise<ModelInfo[]> {
        const store = useModelStore.getState();
        const result: ModelInfo[] = [];

        // Kick off all cache checks in parallel
        const cacheChecks = await Promise.all(
            MODELS.map((config) => checkCacheForModel(config.id).catch(() => false))
        );

        MODELS.forEach((config, i) => {
            const cachedOnDisk = cacheChecks[i];
            const storeState = store.models[config.id];
            let finalState: ModelState;

            if (!storeState) {
                // No store entry — derive from cache
                finalState = cachedOnDisk
                    ? { status: "completed", progress: 100 }
                    : { status: "not_installed", progress: 0 };
                store.setModel(config.id, finalState);
            } else if (storeState.status === "downloading") {
                // Worker was killed (page reload) — no active download can exist for this model
                // since the worker is freshly created. Mark as interrupted.
                finalState = {
                    status: "failed",
                    progress: 0,
                    error: "Download was interrupted (page reloaded). Click Retry to restart.",
                };
                store.setModel(config.id, finalState);
            } else if (storeState.status === "completed" && !cachedOnDisk) {
                // Store says complete but cache is empty (e.g., browser cleared cache)
                finalState = { status: "not_installed", progress: 0 };
                store.setModel(config.id, finalState);
            } else if (storeState.status === "not_installed" && cachedOnDisk) {
                // Downloaded in another tab or manually
                finalState = { status: "completed", progress: 100 };
                store.setModel(config.id, finalState);
            } else {
                finalState = storeState;
            }

            result.push(toModelInfo(config.id, finalState, config));
        });

        return result;
    },

    /**
     * Start downloading a model. Returns immediately; progress arrives via
     * the Zustand store (subscribed to by ModelCard components).
     */
    async downloadModel(data: ModelDownloadRequest): Promise<ModelInfo> {
        const { model: modelId } = data;
        const config = MODELS.find((m) => m.id === modelId);

        if (!config) {
            throw new Error(`Model "${modelId}" not found in configuration.`);
        }

        const store = useModelStore.getState();
        const current = store.models[modelId];

        if (current?.status === "downloading") {
            throw new Error(`Model "${config.name}" is already downloading.`);
        }

        // Optimistically set store before worker confirms
        store.setModel(modelId, { status: "downloading", progress: 0, error: undefined });

        try {
            getWorker().postMessage({
                type: "download",
                modelId,
                repoId: config.id,
                filename: config.modelFile,
                accessToken: data.accessToken,
            } satisfies WorkerRequest);
        } catch (err) {
            // Worker creation failed (e.g., unsupported browser)
            store.setModel(modelId, {
                status: "failed",
                progress: 0,
                error: `Failed to start download worker: ${(err as Error).message}`,
            });
            throw err;
        }

        const state = store.models[modelId]!;
        return toModelInfo(modelId, state, config);
    },

    /**
     * Cancel an in-progress download for a model.
     * The store will be reset to `not_installed` by the worker's error callback.
     */
    async cancelDownload(modelId: string): Promise<void> {
        const config = MODELS.find((m) => m.id === modelId);
        if (!config) throw new Error(`Model "${modelId}" not found in configuration.`);

        getWorker().postMessage({ type: "cancel", modelId } satisfies WorkerRequest);
    },

    /**
     * Delete a model's cached files and remove it from the store.
     * Returns when the worker confirms deletion.
     */
    async deleteModel(id: string): Promise<void> {
        const config = MODELS.find((m) => m.id === id);
        if (!config) throw new Error(`Model "${id}" not found in configuration.`);

        return new Promise<void>((resolve, reject) => {
            deleteResolvers.set(id, resolve);

            // Timeout guard — if worker doesn't respond in 10 s, fall back to store removal
            const timer = setTimeout(() => {
                deleteResolvers.delete(id);
                useModelStore.getState().removeModel(id);
                reject(new Error("Delete operation timed out; model removed from store anyway."));
            }, 10_000);

            // Wrap resolver so we also clear the timer
            const originalResolve = deleteResolvers.get(id)!;
            deleteResolvers.set(id, () => {
                clearTimeout(timer);
                originalResolve();
            });

            getWorker().postMessage({ type: "delete", modelId: id } satisfies WorkerRequest);
        });
    },

    /**
     * Get current status of a single model (reads from store only).
     */
    getModelStatus(id: string): ModelInfo {
        const config = MODELS.find((m) => m.id === id);
        if (!config) throw new Error(`Model "${id}" not found in configuration.`);

        const store = useModelStore.getState();
        const state = store.models[id] ?? { status: "not_installed", progress: 0 };
        return toModelInfo(id, state, config);
    },
};