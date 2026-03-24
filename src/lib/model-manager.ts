"use client";

import {
  transformersJS,
  doesBrowserSupportTransformersJS,
} from "@browser-ai/transformers-js";
import { MODELS, ModelConfig } from "./models";
import { useModelStore, ModelState } from "./stores/model-store";

export interface ModelDownloadRequest {
  model: string; // HuggingFace model ID, e.g. "huggingworld/Qwen3.5-0.8B-ONNX"
}

export interface ModelInfo {
  id: string;
  name: string;
  quantization: string;
  type: "language" | "embedding";
  status: "not_installed" | "downloading" | "completed" | "failed" | "unavailable";
  progress: number; // 0–100
  error?: string;
}

// Map to cache model instances (avoid recreating)
const modelCache = new Map<string, any>();

// Map to track ongoing downloads so they continue even if component unmounts
const ongoingDownloads = new Map<string, Promise<any>>();

// Get or create a model instance
function getModelInstance(id: string, config: ModelConfig): any {
  if (modelCache.has(id)) {
    return modelCache.get(id)!;
  }

  const commonOptions = {
    device: config.device as "auto" | "cpu" | "webgpu" | "gpu",
    dtype: (typeof config.dtype === "string" ? config.dtype : "auto") as
      | "auto"
      | "fp32"
      | "fp16"
      | "q8"
      | "q4"
      | "q4f16",
    ...(config.supportsWorker && typeof Worker !== "undefined"
      ? {
        worker: new Worker(new URL("@/lib/worker.ts", import.meta.url), {
          type: "module",
        }),
      }
      : {}),
  };

  const model =
    config.type === "embedding"
      ? transformersJS.embedding(id, commonOptions)
      : transformersJS(id, commonOptions);

  modelCache.set(id, model);
  return model;
}

// Convert ModelState + config to ModelInfo
function toModelInfo(id: string, state: ModelState, config: ModelConfig): ModelInfo {
  return {
    id,
    name: config.name,
    quantization: config.dtype as any,
    type: config.type,
    status: state.status,
    progress: state.progress,
    error: state.error,
  };
}

// Delete cached model files from browser Cache Storage
async function clearModelFromCache(id: string): Promise<void> {
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    for (const request of requests) {
      if (request.url.includes(id)) {
        await cache.delete(request);
      }
    }
  }
}

export const modelsApi = {
  /**
   * List all models with reconciliation between store and actual browser cache
   */
  async listModels(): Promise<ModelInfo[]> {
    // Check browser support
    if (!doesBrowserSupportTransformersJS()) {
      return MODELS.map((config) => ({
        id: config.id,
        name: config.name,
        quantization: config.dtype as any,
        type: config.type,
        status: "unavailable",
        progress: 0,
        error: "Browser does not support Transformers.js",
      }));
    }

    const store = useModelStore.getState();
    const result: ModelInfo[] = [];

    for (const config of MODELS) {
      let storeState = store.models[config.id];
      let finalState: ModelState;

      try {
        const instance = getModelInstance(config.id, config);
        const availability = await instance.availability();

        if (!storeState) {
          // No store entry - initialize based on actual cache
          if (availability === "available") {
            finalState = { status: "completed", progress: 100 };
          } else if (availability === "downloadable") {
            finalState = { status: "not_installed", progress: 0 };
          } else {
            finalState = { status: "unavailable", progress: 0 };
          }
          store.setModel(config.id, finalState);
        } else {
          // Reconcile existing store state with actual cache
          if (storeState.status === "downloading") {
            // Download still in progress - keep current state to show progress
            // The background download will continue updating store.progress via the callback
            finalState = storeState;
          } else if (storeState.status === "completed" && availability === "downloadable") {
            // Was marked complete but cache says not available - likely cleared
            finalState = { status: "not_installed", progress: 0 };
            store.setModel(config.id, finalState);
          } else if (storeState.status === "not_installed" && availability === "available") {
            // Was marked not installed but cache says available - likely completed elsewhere
            finalState = { status: "completed", progress: 100 };
            store.setModel(config.id, finalState);
          } else {
            // For other statuses, use store state as-is
            finalState = storeState;
          }
        }
      } catch (err) {
        // Error during reconciliation
        if (storeState) {
          finalState = storeState;
        } else {
          finalState = {
            status: "unavailable",
            progress: 0,
            error: (err as Error).message,
          };
          store.setModel(config.id, finalState);
        }
      }

      result.push(toModelInfo(config.id, finalState, config));
    }

    return result;
  },

  /**
   * Start a model download
   */
  async downloadModel(data: ModelDownloadRequest): Promise<ModelInfo> {
    const modelId = data.model;
    const config = MODELS.find((m) => m.id === modelId);

    if (!config) {
      throw new Error(`Model ${modelId} not found in configuration`);
    }

    // Check if download is already in progress
    if (ongoingDownloads.has(modelId)) {
      await ongoingDownloads.get(modelId)!;
      const store = useModelStore.getState();
      const state = store.models[modelId];
      return toModelInfo(modelId, state || { status: "completed", progress: 100 }, config);
    }

    const store = useModelStore.getState();
    store.setModel(modelId, { status: "downloading", progress: 0 });

    // Create the download promise and track it
    const downloadPromise = (async () => {
      try {
        const instance = getModelInstance(modelId, config);

        await instance.createSessionWithProgress((progress: number) => {
          const percent = Math.round(progress * 100);
          store.setModel(modelId, { progress: percent });
        });

        store.setModel(modelId, { status: "completed", progress: 100 });
      } catch (err) {
        const errorMsg = (err as Error).message || "Failed to download model";
        store.setModel(modelId, { status: "failed", progress: 0, error: errorMsg });
        throw new Error(errorMsg);
      } finally {
        // Clean up the ongoing download tracker
        ongoingDownloads.delete(modelId);
      }
    })();

    ongoingDownloads.set(modelId, downloadPromise);

    try {
      await downloadPromise;
      const finalState = store.models[modelId];
      return toModelInfo(
        modelId,
        finalState || { status: "completed", progress: 100 },
        config
      );
    } catch (err) {
      throw err;
    }
  },

  /**
   * Check download status by ID
   */
  async getModelStatus(id: string): Promise<ModelInfo> {
    const config = MODELS.find((m) => m.id === id);

    if (!config) {
      throw new Error(`Model ${id} not found in configuration`);
    }

    const store = useModelStore.getState();
    const state = store.models[id] || { status: "not_installed", progress: 0 };

    return toModelInfo(id, state, config);
  },

  /**
   * Delete a model record and its files from cache
   */
  async deleteModel(id: string): Promise<void> {
    const config = MODELS.find((m) => m.id === id);

    if (!config) {
      throw new Error(`Model ${id} not found in configuration`);
    }

    try {
      await clearModelFromCache(id);
    } catch (err) {
      console.error(`Failed to clear model from cache: ${err}`);
    }

    const store = useModelStore.getState();
    store.removeModel(id);
  },
};
