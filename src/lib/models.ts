import { WorkerLoadOptions } from "@browser-ai/transformers-js";

export interface ModelConfig extends Omit<WorkerLoadOptions, "modelId"> {
    id: string;
    name: string;
    supportsWorker?: boolean;
}

export const MODELS: ModelConfig[] = [
    {
        id: "huggingworld/Qwen3.5-0.8B-ONNX",
        name: "Qwen3.5 0.8B",
        device: "webgpu",
        dtype: "q4",
        supportsWorker: true,
    },
    {
        id: "onnx-community/embeddinggemma-300m-ONNX",
        name: "Embedding Gemma 300M",
        device: "webgpu",
        dtype: "q4",
        supportsWorker: true,
    },
];