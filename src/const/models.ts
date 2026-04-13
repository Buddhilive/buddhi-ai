import type { GemmaTemplateVersion } from "@/types/messages";

export interface ModelConfig {
    id: string;
    name: string;
    description: string;
    type: "language" | "embedding";
    supportsWorker?: boolean;
    device?: "webgpu" | "wasm";
    modelFile: string;
    /**
     * Which Gemma chat-template format this model uses.
     * Omit for non-language models or when the default ("gemma4") is correct.
     */
    chatTemplateVersion?: GemmaTemplateVersion;
}

export const MODELS: ModelConfig[] = [
    {
        id: "litert-community/gemma-4-E2B-it-litert-lm",
        name: "Gemma 4 E2B",
        description: "Lightweight language model optimised for fast inference on CPU.",
        type: "language",
        device: "webgpu",
        supportsWorker: true,
        modelFile: "gemma-4-E2B-it-web.task",
        chatTemplateVersion: "gemma4",
    },
    {
        id: "litert-community/embeddinggemma-300m",
        name: "Embedding Gemma 300M",
        description: "Compact embedding model for semantic search and retrieval tasks.",
        type: "embedding",
        device: "webgpu",
        supportsWorker: true,
        modelFile: "embeddinggemma-300M_seq2048_mixed-precision.tflite",
    },
];
