/**
 * Single serialized queue wrapping engine calls to ensure only one WebGPU
 * inference operation runs at any time, preventing GPU device loss and memory contention.
 */

export interface QueueTask<T> {
  id: string;
  run: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  signal?: AbortSignal;
}

export class InferenceQueue {
  private queue: QueueTask<any>[] = [];
  private isProcessing = false;

  /**
   * Enqueues an async inference operation to be executed sequentially.
   */
  public enqueue<T>(run: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) {
      return Promise.reject(new Error("Inference operation was aborted before queuing."));
    }

    return new Promise<T>((resolve, reject) => {
      const task: QueueTask<T> = {
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        run,
        resolve,
        reject,
        signal,
      };

      if (signal) {
        const onAbort = () => {
          signal.removeEventListener("abort", onAbort);
          const idx = this.queue.indexOf(task);
          if (idx !== -1) {
            this.queue.splice(idx, 1);
            reject(new Error("Inference operation aborted while waiting in queue."));
          }
        };
        signal.addEventListener("abort", onAbort, { once: true });
      }

      this.queue.push(task);
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const current = this.queue.shift();

    if (!current) {
      this.isProcessing = false;
      return;
    }

    if (current.signal?.aborted) {
      current.reject(new Error("Inference operation was aborted before execution."));
      this.isProcessing = false;
      this.processNext();
      return;
    }

    try {
      const result = await current.run();
      current.resolve(result);
    } catch (err) {
      current.reject(err);
    } finally {
      this.isProcessing = false;
      this.processNext();
    }
  }

  public get pendingCount(): number {
    return this.queue.length;
  }

  public get isBusy(): boolean {
    return this.isProcessing;
  }
}

export const inferenceQueue = new InferenceQueue();
