# Data Model: LiteRT-LM Engine & Conversational State

## 1. Engine State (`src/stores/litert-store.ts`)

```typescript
import { Engine } from '@litert-lm/core';

interface LiteRTModelState {
    liteRTModelInstance?: Engine;
    liteRTModelModel?: string; // Model identifier, e.g. "litert-community/gemma-4-E2B-it-litert-lm"
    liteRTModelStatus: "idle" | "loading" | "ready" | "error";
    setLiteRTModelInstance: (instance?: Engine) => void;
    setLiteRTModelModel: (model?: string) => void;
    setLiteRTModelStatus: (status: "idle" | "loading" | "ready" | "error") => void;
}
```

## 2. Model Configuration (`src/const/models.ts`)

```typescript
export interface ModelConfig {
    id: string;
    name: string;
    description: string;
    type: "language" | "embedding";
    supportsWorker?: boolean;
    device?: "webgpu" | "wasm";
    modelFile: string;
    chatTemplateVersion?: GemmaTemplateVersion;
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
```

## 3. Deprecated Entities (Eliminated)

The following entities and schemas are completely removed:
- `Concept` / `OKFConcept` (`src/types/documents.ts`)
- `DocumentRecord` / `DocumentMeta` (`src/types/documents.ts`)
- `RagSegment` / `RagSourceItem` (`src/lib/rag.ts`)
- `KnowledgeGraphNode` / `KnowledgeGraphEdge`
