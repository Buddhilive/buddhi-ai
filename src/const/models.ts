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
    /**
     * Whether the model bundles a vision encoder.
     */
    supportsVision?: boolean;
}

export const MODELS: ModelConfig[] = [
    {
        id: "litert-community/gemma-4-E2B-it-litert-lm",
        name: "Gemma 4 E2B",
        description: "Lightweight language model optimised for fast inference on edge devices.",
        type: "language",
        device: "webgpu",
        supportsWorker: true,
        modelFile: "gemma-4-E2B-it-web.litertlm",
        chatTemplateVersion: "gemma4",
    },
];
