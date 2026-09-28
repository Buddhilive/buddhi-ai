"use client";

import { nanoid } from "nanoid";
import { getModelObjectURL } from "@/lib/model-manager";
import type {
  WorkerInMessage,
  WorkerOutMessage,
} from "@/workers/embedding-worker";

class EmbeddingManager {
  private worker: Worker | null = null;
  private isModelReady = false;
  private initPromise: Promise<void> | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (emb: number[]) => void; reject: (err: Error) => void }
  >();

  private getWorker(): Worker {
    if (typeof window === "undefined") {
      throw new Error("EmbeddingManager is only available in browser context");
    }
    if (!this.worker) {
      this.worker = new Worker(
        new URL("../workers/embedding-worker.ts", import.meta.url),
        { type: "module" }
      );
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = (err) => {
        console.error("[EmbeddingManager] Worker uncaught error:", err);
      };
    }
    return this.worker;
  }

  private handleMessage(event: MessageEvent<WorkerOutMessage>) {
    const msg = event.data;

    switch (msg.type) {
      case "model-ready": {
        this.isModelReady = true;
        break;
      }
      case "load-error": {
        console.error("[EmbeddingManager] Model load error:", msg.message);
        break;
      }
      case "embed-result": {
        const handler = this.pendingRequests.get(msg.requestId);
        if (handler) {
          handler.resolve(msg.embedding);
          this.pendingRequests.delete(msg.requestId);
        }
        break;
      }
      case "embed-error": {
        const handler = this.pendingRequests.get(msg.requestId);
        if (handler) {
          handler.reject(new Error(msg.message));
          this.pendingRequests.delete(msg.requestId);
        }
        break;
      }
    }
  }

  public async initialize(): Promise<void> {
    if (this.isModelReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>(async (resolve, reject) => {
      try {
        const modelId = "litert-community/embeddinggemma-300m";
        const modelUrl = await getModelObjectURL(modelId);

        if (!modelUrl) {
          throw new Error(
            "EmbeddingGemma 300M model binary not found in Cache API. Please install it on the Models page."
          );
        }

        const worker = this.getWorker();

        const onReady = (event: MessageEvent<WorkerOutMessage>) => {
          if (event.data.type === "model-ready") {
            worker.removeEventListener("message", onReady);
            this.isModelReady = true;
            resolve();
          } else if (event.data.type === "load-error") {
            worker.removeEventListener("message", onReady);
            this.initPromise = null;
            reject(new Error(event.data.message));
          }
        };

        const wasmPath = typeof window !== "undefined"
          ? new URL("/litert-wasm/", window.location.origin).href
          : "/litert-wasm/";

        worker.addEventListener("message", onReady);
        worker.postMessage({
          type: "load-model",
          modelUrl,
          wasmPath,
        } satisfies WorkerInMessage);
      } catch (err) {
        this.initPromise = null;
        reject(err);
      }
    });

    return this.initPromise;
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isModelReady) {
      await this.initialize();
    }

    const requestId = nanoid();
    const worker = this.getWorker();

    return new Promise<number[]>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      worker.postMessage({
        type: "embed",
        requestId,
        text,
      } satisfies WorkerInMessage);
    });
  }

  public isReady(): boolean {
    return this.isModelReady;
  }

  public unload(): void {
    if (this.worker) {
      this.worker.postMessage({ type: "unload" } satisfies WorkerInMessage);
      this.worker.terminate();
      this.worker = null;
      this.isModelReady = false;
      this.initPromise = null;
    }
  }
}

export const embeddingManager = new EmbeddingManager();
