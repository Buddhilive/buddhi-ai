import { loadLiteRt, loadAndCompile, CompiledModel, Tensor } from "@litertjs/core";

export type WorkerInMessage =
  | { type: "load-model"; modelUrl: string; wasmPath?: string }
  | { type: "embed"; requestId: string; text: string }
  | { type: "unload" };

export type WorkerOutMessage =
  | { type: "model-ready" }
  | { type: "embed-result"; requestId: string; embedding: number[] }
  | { type: "embed-error"; requestId: string; message: string }
  | { type: "load-error"; message: string };

let compiledModel: CompiledModel | null = null;
let isInitializing = false;

// Simple deterministic feature-hashing tokenizer fallback for browser environment
// when full sentencepiece binary is not embedded in worker.
// Produces 256 tokens padded/truncated.
function tokenizeText(text: string, maxSeqLen = 256): Int32Array {
  const tokens = new Int32Array(maxSeqLen);
  // Token 2 is often <bos> in Gemma
  tokens[0] = 2;
  
  // Normalize and clean text
  const clean = text.toLowerCase().replace(/[^\w\s]/g, " ");
  const words = clean.split(/\s+/).filter(Boolean);
  
  let idx = 1;
  for (const word of words) {
    if (idx >= maxSeqLen - 1) break;
    // FNV-1a hash mod token vocabulary range (e.g. 256000)
    let hash = 2166136261;
    for (let i = 0; i < word.length; i++) {
      hash ^= word.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const tokenId = (Math.abs(hash) % 250000) + 10;
    tokens[idx++] = tokenId;
  }
  // Token 1 is often <eos>
  if (idx < maxSeqLen) {
    tokens[idx] = 1;
  }
  return tokens;
}

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case "load-model": {
      if (compiledModel) {
        self.postMessage({ type: "model-ready" } satisfies WorkerOutMessage);
        return;
      }
      if (isInitializing) return;
      isInitializing = true;

      try {
        const wasmDir = msg.wasmPath || "/litert-wasm/";
        await loadLiteRt(wasmDir);
        compiledModel = await loadAndCompile(msg.modelUrl);
        isInitializing = false;
        self.postMessage({ type: "model-ready" } satisfies WorkerOutMessage);
      } catch (err) {
        isInitializing = false;
        console.error("[embedding-worker] Failed to load model:", err);
        self.postMessage({
          type: "load-error",
          message: (err as Error).message || "Failed to load embedding model",
        } satisfies WorkerOutMessage);
      }
      break;
    }

    case "embed": {
      if (!compiledModel) {
        self.postMessage({
          type: "embed-error",
          requestId: msg.requestId,
          message: "Model not loaded",
        } satisfies WorkerOutMessage);
        return;
      }

      try {
        const tokenArray = tokenizeText(msg.text, 256);
        const inputTensor = new Tensor(tokenArray, [1, 256]);

        let outputTensors: Tensor[] | Record<string, Tensor>;
        try {
          outputTensors = await compiledModel.run([inputTensor]);
        } catch {
          // If positional input fails, try named input commonly used by LiteRT TFLite models
          const inputDetails = compiledModel.getInputDetails();
          const inputName = inputDetails[0]?.name || "input_ids";
          outputTensors = await compiledModel.run({ [inputName]: inputTensor });
        }

        let rawOutput: Tensor;
        if (Array.isArray(outputTensors)) {
          rawOutput = outputTensors[0];
        } else {
          const keys = Object.keys(outputTensors);
          rawOutput = outputTensors[keys[0]];
        }

        const outData = (await rawOutput.data()) as Float32Array;
        // L2 normalize embedding vector
        let norm = 0;
        for (let i = 0; i < outData.length; i++) {
          norm += outData[i] * outData[i];
        }
        norm = Math.sqrt(norm) || 1e-12;

        const normalized = new Array<number>(outData.length);
        for (let i = 0; i < outData.length; i++) {
          normalized[i] = outData[i] / norm;
        }

        self.postMessage({
          type: "embed-result",
          requestId: msg.requestId,
          embedding: normalized,
        } satisfies WorkerOutMessage);
      } catch (err) {
        console.error("[embedding-worker] Inference error:", err);
        self.postMessage({
          type: "embed-error",
          requestId: msg.requestId,
          message: (err as Error).message || "Embedding inference failed",
        } satisfies WorkerOutMessage);
      }
      break;
    }

    case "unload": {
      if (compiledModel) {
        try {
          compiledModel.delete();
        } catch (e) {
          console.warn("[embedding-worker] Error deleting model:", e);
        }
        compiledModel = null;
      }
      break;
    }
  }
};
