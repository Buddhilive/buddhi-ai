export interface ModelConfig {
    id: string;
    name: string;
    description: string;
    type: "language" | "embedding";
    supportsWorker?: boolean;
    device?: "webgpu" | "wasm";
    dtype?: "q4" | "f16";
    modelFile: string;
}

export const MODELS: ModelConfig[] = [
    {
        id: "google/gemma-3n-E2B-it-litert-lm",
        name: "Gemma 3n E2B",
        description: "Lightweight language model optimised for fast inference on CPU.",
        type: "language",
        device: "webgpu",
        dtype: "q4",
        supportsWorker: true,
        modelFile: "gemma-3n-E2B-it-int4-Web.litertlm",
    },
    {
        id: "litert-community/embeddinggemma-300m",
        name: "Embedding Gemma 300M",
        description: "Compact embedding model for semantic search and retrieval tasks.",
        type: "embedding",
        device: "webgpu",
        dtype: "q4",
        supportsWorker: true,
        modelFile: "embeddinggemma-300M_seq2048_mixed-precision.tflite",
    },
];