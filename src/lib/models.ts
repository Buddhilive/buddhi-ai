import { WorkerLoadOptions } from "@browser-ai/transformers-js";

export interface ModelConfig extends Omit<WorkerLoadOptions, "modelId"> {
    id: string;
    name: string;
    description: string;
    type: "language" | "embedding";
    supportsWorker?: boolean;
}

export const MODELS: ModelConfig[] = [
    {
        id: "onnx-community/gemma-3-270m-it-ONNX",
        name: "Gemma 3 270M",
        description: "Lightweight language model optimised for fast inference on CPU.",
        type: "language",
        device: "webgpu",
        dtype: "q4",
        supportsWorker: true,
    },
    {
        id: "onnx-community/embeddinggemma-300m-ONNX",
        name: "Embedding Gemma 300M",
        description: "Compact embedding model for semantic search and retrieval tasks.",
        type: "embedding",
        device: "webgpu",
        dtype: "q4",
        supportsWorker: true,
    },
];