import type { GemmaTemplateVersion } from "@/types/messages";

export interface ModelConfig {
    id: string;
    name: string;
    description: string;
    type: "language" | "embedding" | "translator";
    supportsWorker?: boolean;
    device?: "webgpu" | "wasm";
    modelFile: string;
    /**
     * Which Gemma chat-template format this model uses.
     * Omit for non-language models or when the default ("gemma4") is correct.
     */
    chatTemplateVersion?: GemmaTemplateVersion;
    /**
     * Whether the model's `.task` file bundles a vision encoder.
     *
     * MediaPipe's LlmInference will throw "Image models could not be created"
     * at the very start of inference if `{ imageSource }` / `{ audioSource }`
     * entries are present in the Prompt array but the model file was packaged
     * without a multimodal encoder.  Set this to `true` only for model files
     * that explicitly include vision support.
     *
     * Defaults to `false` when omitted — all text-only models fall into this
     * category.
     */
    supportsVision?: boolean;
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
        // Vision was tested but gemma-4-E2B-it-web.task does not bundle a vision
        // encoder for web/WebGPU. The model card states "vision and audio models
        // are loaded as needed" — they are separate components not in the .task
        // file. Restore supportsVision: true and re-enable the attachment button in
        // chat-interface.tsx once a vision-capable .task file is available.
        // supportsVision: true,
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
    {
        id: "litert-community/TranslateGemma-4B-IT",
        name: "Translate Gemma 4B-IT",
        description: "Translation model supporting 56 languages. Powered by Google's TranslateGemma, built on Gemma 3 architecture.",
        type: "translator",
        device: "webgpu",
        supportsWorker: true,
        modelFile: "translategemma-4b-it-int8-web.task",
        // TranslateGemma uses a dedicated prompt format — see src/lib/translate-gemma.ts
    },
];
