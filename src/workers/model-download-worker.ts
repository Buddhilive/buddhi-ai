/**
 * Model Download Worker
 *
 * Downloads HuggingFace model files using plain fetch with streaming progress.
 * Auth for gated models is handled via the `Authorization: Bearer` header on
 * the initial request — HuggingFace redirects to a presigned CDN URL so auth
 * is only needed on the first hop.
 *
 * Supports concurrent downloads via per-modelId AbortController.
 */

// ─── Message types ────────────────────────────────────────────────────────────

export interface DownloadRequest {
    type: "download";
    modelId: string;      // Zustand key — same as HF repo ID
    repoId: string;       // HuggingFace repo ID, e.g. "litert-community/gemma-3-270m-it"
    filename: string;     // File path inside the repo, e.g. "gemma3-270m-it-q8-web.task"
    accessToken?: string; // HF access token — required for gated models (Gemma, etc.)
}

export interface CancelRequest {
    type: "cancel";
    modelId: string;
}

export interface DeleteRequest {
    type: "delete";
    modelId: string;
}

export interface CheckCacheRequest {
    type: "check-cache";
    modelId: string;
}

export type WorkerRequest =
    | DownloadRequest
    | CancelRequest
    | DeleteRequest
    | CheckCacheRequest;

export interface ProgressMessage {
    type: "progress";
    modelId: string;
    percentage: number;
    loaded: number;
    total: number;
    fromCache: boolean;
}

export interface CompleteMessage {
    type: "complete";
    modelId: string;
    fromCache: boolean;
}

export interface ErrorMessage {
    type: "error";
    modelId: string;
    message: string;
    code: string;
}

export interface CacheStatusMessage {
    type: "cache-status";
    modelId: string;
    cached: boolean;
}

export interface DeletedMessage {
    type: "deleted";
    modelId: string;
}

export type WorkerMessage =
    | ProgressMessage
    | CompleteMessage
    | ErrorMessage
    | CacheStatusMessage
    | DeletedMessage;

// ─── Cache config ─────────────────────────────────────────────────────────────

const CACHE_NAME = "buddhi-ai-models-cache-v1";

// ─── Active downloads ─────────────────────────────────────────────────────────

const activeDownloads = new Map<string, AbortController>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function send(msg: WorkerMessage): void {
    self.postMessage(msg);
}

function cacheKey(modelId: string): string {
    return `https://cache.buddhi-ai.local/models/${modelId.replace(/\//g, "_")}`;
}

async function openCache(): Promise<Cache> {
    try {
        return await caches.open(CACHE_NAME);
    } catch (err) {
        throw new Error(
            `Failed to open Cache API: ${err instanceof Error ? err.message : String(err)}. ` +
            "Ensure the app is served over HTTPS or localhost."
        );
    }
}

// ─── Operations ───────────────────────────────────────────────────────────────

async function checkCache(modelId: string): Promise<boolean> {
    try {
        const cache = await openCache();
        const response = await cache.match(new Request(cacheKey(modelId)));
        return !!response;
    } catch {
        return false;
    }
}

async function downloadModel(req: DownloadRequest): Promise<void> {
    const { modelId, repoId, filename, accessToken } = req;

    // Cancel any stale download for this model
    if (activeDownloads.has(modelId)) {
        activeDownloads.get(modelId)!.abort();
        activeDownloads.delete(modelId);
    }

    // Cache hit — skip download
    const cached = await checkCache(modelId);
    if (cached) {
        send({ type: "progress", modelId, percentage: 100, loaded: 0, total: 0, fromCache: true });
        send({ type: "complete", modelId, fromCache: true });
        return;
    }

    const controller = new AbortController();
    activeDownloads.set(modelId, controller);

    try {
        // HuggingFace resolve URL: handles CDN redirect to presigned URL internally.
        // Auth is only needed on this first hop — the redirect target is presigned.
        const url = `https://huggingface.co/${repoId}/resolve/main/${filename}`;

        const headers: HeadersInit = {};
        if (accessToken) {
            headers["Authorization"] = `Bearer ${accessToken}`;
        }

        const response = await fetch(url, {
            headers,
            signal: controller.signal,
            // redirect: 'follow' is the default — browser follows the CDN redirect
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error(
                    `Access denied (401). The model "${repoId}" requires authentication. ` +
                    "Accept the model licence on huggingface.co and provide your access token."
                );
            }
            if (response.status === 403) {
                throw new Error(
                    `Forbidden (403). You have not accepted the licence for "${repoId}" ` +
                    "on huggingface.co, or your token lacks read permission."
                );
            }
            if (response.status === 404) {
                throw new Error(
                    `Not found (404). File "${filename}" does not exist in repo "${repoId}". ` +
                    "Check the model configuration in models.ts."
                );
            }
            throw new Error(
                `HTTP ${response.status} — failed to download "${filename}" from "${repoId}".`
            );
        }

        const contentLength = response.headers.get("content-length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        if (!response.body) {
            throw new Error("Response body is null — server does not support streaming.");
        }

        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            loaded += value.length;

            const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
            send({ type: "progress", modelId, percentage, loaded, total, fromCache: false });
        }

        // Persist to Cache API
        const blob = new Blob(chunks as BlobPart[], { type: "application/octet-stream" });
        const cache = await openCache();
        const cacheHeaders = new Headers({
            "content-type": "application/octet-stream",
            "content-length": blob.size.toString(),
            "x-cache-date": new Date().toISOString(),
            "x-model-id": modelId,
            "x-repo-id": repoId,
            "x-filename": filename,
        });
        await cache.put(
            new Request(cacheKey(modelId)),
            new Response(blob, { headers: cacheHeaders })
        );

        send({ type: "complete", modelId, fromCache: false });
    } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            send({ type: "error", modelId, message: "Download cancelled.", code: "CANCELLED" });
        } else {
            const message = err instanceof Error ? err.message : String(err);
            send({ type: "error", modelId, message, code: "DOWNLOAD_ERROR" });
        }
    } finally {
        activeDownloads.delete(modelId);
    }
}

async function cancelDownload(modelId: string): Promise<void> {
    const controller = activeDownloads.get(modelId);
    if (controller) {
        controller.abort();
        activeDownloads.delete(modelId);
    }
}

async function deleteModel(modelId: string): Promise<void> {
    await cancelDownload(modelId);

    try {
        const cache = await openCache();

        // Primary key match
        await cache.delete(new Request(cacheKey(modelId)));

        // Fallback: scan all entries for x-model-id header match
        const keys = await cache.keys();
        for (const req of keys) {
            const resp = await cache.match(req);
            if (resp?.headers.get("x-model-id") === modelId) {
                await cache.delete(req);
            }
        }

        send({ type: "deleted", modelId });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({
            type: "error",
            modelId,
            message: `Failed to delete model: ${message}`,
            code: "DELETE_ERROR",
        });
    }
}

// ─── Message handler ──────────────────────────────────────────────────────────

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
    const req = event.data;

    switch (req.type) {
        case "download":
            await downloadModel(req);
            break;

        case "cancel":
            await cancelDownload(req.modelId);
            break;

        case "delete":
            await deleteModel(req.modelId);
            break;

        case "check-cache": {
            const cached = await checkCache(req.modelId);
            send({ type: "cache-status", modelId: req.modelId, cached });
            break;
        }

        default:
            console.warn("[model-worker] Unknown message type:", (req as WorkerRequest).type);
    }
});

self.addEventListener("error", (event: ErrorEvent) => {
    console.error("[model-worker] Unhandled error:", event.error);
});

self.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    console.error("[model-worker] Unhandled rejection:", event.reason);
});
