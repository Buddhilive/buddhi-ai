# Implementation Plan: LiteRT-LM Web Migration & OKF System Removal

**Branch**: `001-remove-okf-and` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/.buddhi/specs/001-remove-okf-and/spec.md`

---

## Summary

Migrate the client-side LLM inference runtime in Buddhi AI from the legacy MediaPipe GenAI library (`@mediapipe/tasks-genai`) to Google's official LiteRT-LM Web API (`@litert-lm/core`) targeting `gemma-4-E2B-it-web.litertlm`. Concurrently, purge all Open Knowledge Format (OKF) knowledge base subsystems, including document management, Cytoscape knowledge graph visualization, and chat RAG context injection, establishing a lean, fast, pure conversational on-device AI experience.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16.3.4 (App Router) / React 19.2.8

**Primary Dependencies**:
- Add: `@litert-lm/core` (^0.1.0 or latest)
- Remove: `@mediapipe/tasks-genai`, `cytoscape`, `minisearch`, `@xyflow/react`, `gray-matter`
- Retain: `@ai-sdk/react`, `ai`, `zustand`, `motion`, `tailwind-merge`

**Storage**:
- Retain: Browser Cache API (`buddhi-ai-models-cache-v1`) for offline `.litertlm` model file caching.
- Retain: IndexedDB (`buddhi-ai-db`) for chat session history and message persistence.
- Purge: Document and OKF IndexedDB tables/stores.

**Testing**:
- Verification via automated TypeScript compilation (`npm run build`) and ESLint (`npm run lint`).
- Manual interactive verification of model download, WebGPU engine initialization, and streaming inference.

**Target Platform**: WebGPU-enabled modern web browsers (Chrome 113+, Edge, Brave).

**Project Type**: Next.js Full-stack Web Application (Client-Side Edge AI).

**Performance Goals**:
- Time to First Token (TTFT) < 500ms on WebGPU hardware.
- Reduction in production client bundle size by eliminating Cytoscape and MiniSearch.

**Constraints**:
- Must function 100% offline once the model file is cached locally.
- Zero server-side API keys or token requirements.

---

## AGENTS.md Compliance Check

*GATE: Passed before Phase 0 research. Re-checked for Phase 1 design.*

- [x] Project build & test commands adhered to (`npm run build`, `npm run lint`).
- [x] Architectural constraints respected (zero breaking backend server requirements; pure edge client execution).
- [x] No unapproved external dependencies introduced (`@litert-lm/core` is Google's official Edge library).
- [x] Socratic Gate and SDD specification phase completed.

---

## Project Structure

### Documentation (this feature)

```text
.buddhi/specs/001-remove-okf-and/
├── spec.md              # Feature specification
├── plan.md              # This file (/plan command output)
├── research.md          # Runtime comparison & OKF deprecation analysis
├── data-model.md        # State models & configuration definitions
└── quickstart.md        # Local verification guide
```

### Source Code Modifications

```text
package.json                                             # [MODIFY] Replace @mediapipe/tasks-genai with @litert-lm/core, drop cytoscape/minisearch/xyflow
src/
├── app/
│   └── (buddhi-ai)/
│       ├── documents/                                   # [DELETE] Remove Documents page
│       │   └── page.tsx
│       └── knowledge-graph/                             # [DELETE] Remove Knowledge Graph page
│           └── page.tsx
├── components/
│   └── custom/
│       ├── document-manager.tsx                         # [DELETE] Document upload & listing UI
│       ├── knowledge-graph-view.tsx                     # [DELETE] Cytoscape knowledge graph view
│       └── chat/
│           ├── chat-session.tsx                         # [MODIFY] Remove RAG retrieval pipeline & sources state; use LiteRT-LM Engine
│           └── chat-messages.tsx                        # [MODIFY] Remove Sources drawer & RagSourceItem references
├── const/
│   ├── models.ts                                        # [MODIFY] Update model registry to gemma-4-E2B-it-web.litertlm
│   └── sidebar-data.ts                                  # [MODIFY] Remove Documents and Knowledge Graph navigation items
├── hooks/
│   ├── use-ai-model.ts                                  # [MODIFY] Rewrite to initialize Engine.create() from @litert-lm/core
│   ├── use-navigation.ts                                # [MODIFY] Clean route path matching
│   └── chat/
│       ├── use-chat-memory.ts                           # [MODIFY] Update instance typing to Engine
│       └── use-chat-storage.ts                          # [MODIFY] Update instance typing to Engine
├── lib/
│   ├── buddhi-ai-core/
│   │   └── chat-api.ts                                  # [MODIFY] Implement LiteRTChatTransport with conversation.sendMessageStreaming()
│   ├── memory.ts                                        # [MODIFY] Run summarization using LiteRT-LM Engine conversation
│   ├── model-manager.ts                                 # [MODIFY] Support .litertlm cache check & object URL provisioning
│   ├── documents.ts                                     # [DELETE] OKF document indexing logic
│   ├── rag.ts                                           # [DELETE] OKF RAG retrieval logic
│   └── okf/                                             # [DELETE] Remove entire OKF directory
│       ├── decompose.ts
│       ├── enrich.ts
│       ├── graph.ts
│       ├── ingest.ts
│       └── search.ts
├── stores/
│   ├── document-store.ts                                # [DELETE] OKF document store
│   └── litert-store.ts                                  # [MODIFY] Store Engine instance instead of LlmInference
├── types/
│   ├── documents.ts                                     # [DELETE] OKF document types
│   └── messages.ts                                      # [MODIFY] Remove RAG source references
└── workers/
    └── model-download-worker.ts                         # [MODIFY] Ensure .litertlm downloads & cache persistence
```

---

## Phase Breakdown

### Phase 1: Dependency Updates & OKF Pruning
1. Update `package.json`:
   - Add `@litert-lm/core`.
   - Remove `@mediapipe/tasks-genai`, `cytoscape`, `minisearch`, `@xyflow/react`, `gray-matter`.
2. Run `npm install` to regenerate `package-lock.json`.
3. Delete deprecated OKF and document files:
   - `src/app/(buddhi-ai)/documents/`
   - `src/app/(buddhi-ai)/knowledge-graph/`
   - `src/components/custom/document-manager.tsx`
   - `src/components/custom/knowledge-graph-view.tsx`
   - `src/lib/okf/`
   - `src/lib/documents.ts`
   - `src/lib/rag.ts`
   - `src/stores/document-store.ts`
   - `src/types/documents.ts`
4. Clean navigation & sidebar:
   - `src/const/sidebar-data.ts`
   - `src/hooks/use-navigation.ts`

### Phase 2: LiteRT-LM Core Engine Integration
1. Update `src/const/models.ts`:
   - Change `modelFile` from `"gemma-4-E2B-it-web.task"` to `"gemma-4-E2B-it-web.litertlm"`.
2. Update `src/stores/litert-store.ts`:
   - Replace `LlmInference` with `Engine` from `@litert-lm/core`.
3. Update `src/hooks/use-ai-model.ts`:
   - Replace MediaPipe `FilesetResolver` and `LlmInference` with `Engine.create({ model: objectUrl, mainExecutorSettings: { maxNumTokens: 8192 } })`.
4. Update `src/lib/buddhi-ai-core/chat-api.ts`:
   - Refactor transport to `LiteRTChatTransport` using `Engine`.
   - Use `engine.createConversation({ preface: { messages: [...] } })` and `conversation.sendMessageStreaming(prompt)`.
   - Remove `ragContextPromise` and retrieval hooks.
5. Update `src/lib/memory.ts`:
   - Refactor `runSummarization` to use the `Engine` instance and conversation streaming/message generation.
6. Update chat hooks and components:
   - `src/components/custom/chat/chat-session.tsx`
   - `src/components/custom/chat/chat-messages.tsx`
   - `src/hooks/chat/use-chat-memory.ts`
   - `src/hooks/chat/use-chat-storage.ts`
   - `src/types/messages.ts`

### Phase 3: Verification & Polish
1. Run `npm run build` to confirm zero TypeScript compilation errors.
2. Run `npm run lint` to confirm code style and lint compliance.
3. Test local model download flow and offline chat inference in browser.

---

## Complexity Tracking

| Change | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| Deleting OKF files completely rather than deprecation comments | Keeps codebase clean, eliminates dead bundle code, reduces attack surface and build size | Retaining dead code creates confusing types and maintenance drag |
| Retaining local Cache API download worker | Models are 1.5GB - 3GB+; downloading every session would be unusable | Streaming direct from Hugging Face on every page load consumes excessive bandwidth and breaks offline capability |
