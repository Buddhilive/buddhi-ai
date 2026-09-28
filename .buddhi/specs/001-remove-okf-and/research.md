# Research: LiteRT-LM (Web) Migration & OKF System Deprecation

## 1. Inference Runtime: MediaPipe vs LiteRT-LM (Web)

### Background & Motivation
MediaPipe's GenAI task (`@mediapipe/tasks-genai`) has been deprecated in favor of Google AI Edge's unified LiteRT-LM library (`@litert-lm/core`). LiteRT-LM delivers optimized WebGPU execution specifically built for modern edge models like Gemma 4 (`gemma-4-E2B-it-web.litertlm`).

### API Architecture Comparison

| Feature | MediaPipe GenAI (`@mediapipe/tasks-genai`) | LiteRT-LM Web (`@litert-lm/core`) |
| :--- | :--- | :--- |
| **Package** | `@mediapipe/tasks-genai` | `@litert-lm/core` |
| **Model Format** | `.task` files | `.litertlm` files |
| **Setup Pipeline** | `FilesetResolver.forGenAiTasks(wasmUrl)` → `LlmInference.createFromOptions(...)` | `Engine.create({ model: urlOrPath, mainExecutorSettings: { maxNumTokens } })` |
| **Execution** | `llm.generateResponse(prompt, callback)` | `const conversation = await engine.createConversation({ preface });` `const stream = conversation.sendMessageStreaming(prompt);` |
| **Streaming Style** | Push-based callback `(chunk, done) => void` | Async Iterable `for await (const chunk of stream)` |
| **Stop / Abort** | Limited cancellation support | Native abort and session cleanup |

### Model Packaging & Delivery
- **Model Repo**: `litert-community/gemma-4-E2B-it-litert-lm`
- **Model File**: `gemma-4-E2B-it-web.litertlm`
- **Storage Strategy**: Retain existing background service worker / cache download mechanism via browser Cache API (`buddhi-ai-models-cache-v1`) and serve as a `blob:` Object URL to `Engine.create({ model: objectUrl })`.

---

## 2. OKF (Open Knowledge Format) Knowledge System Deprecation

### Inventory of Removed Components
1. **Routes**:
   - `src/app/(buddhi-ai)/documents/page.tsx`
   - `src/app/(buddhi-ai)/knowledge-graph/page.tsx`
2. **Components**:
   - `src/components/custom/document-manager.tsx`
   - `src/components/custom/knowledge-graph-view.tsx`
   - `src/components/ai-elements/sources.tsx` (or remove usage in `chat-messages.tsx`)
3. **Libraries & Stores**:
   - `src/lib/okf/` (ingest.ts, decompose.ts, enrich.ts, graph.ts, search.ts)
   - `src/lib/documents.ts`
   - `src/lib/rag.ts`
   - `src/stores/document-store.ts`
   - `src/types/documents.ts`
4. **Dependencies to Remove**:
   - `cytoscape`
   - `minisearch`
   - `@xyflow/react`
   - `gray-matter`

### Chat Interface Decoupling
- Remove `retrieveRagContext` and `buildRagContextBlock` from `handleSubmit` in `chat-session.tsx`.
- Remove `ragContextPromise` from `MediaPipeChatTransport` (now `LiteRTChatTransport`).
- Remove `sources` prop and `<Sources>` drawer in `chat-messages.tsx`.
- Chat becomes direct, zero-overhead client-side LLM inference with session memory intact.
