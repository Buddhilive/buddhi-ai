# Tasks: LiteRT-LM Web Migration & OKF System Removal

**Branch**: `001-remove-okf-and` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup (Dependencies & Infrastructure)

**Purpose**: Update project package manifests to install `@litert-lm/core` and prune deprecated dependencies.

- [x] T001 Update dependencies in `package.json` to add `@litert-lm/core` and remove `@mediapipe/tasks-genai`, `cytoscape`, `@types/cytoscape`, `minisearch`, `@xyflow/react`, and `gray-matter`
- [x] T002 Run `npm install` to update `package-lock.json` with `@litert-lm/core` and clean pruned packages

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Purge deprecated OKF subsystems, files, and types that block clean builds and compilation across user stories.

**⚠️ CRITICAL**: Must be completed before implementing user stories to ensure clean imports and unified type contracts.

- [x] T003 Delete legacy OKF route directories `src/app/(buddhi-ai)/documents/` and `src/app/(buddhi-ai)/knowledge-graph/`
- [x] T004 [P] Delete legacy OKF UI components `src/components/custom/document-manager.tsx` and `src/components/custom/knowledge-graph-view.tsx`
- [x] T005 [P] Delete legacy OKF library directory `src/lib/okf/` (including `decompose.ts`, `enrich.ts`, `graph.ts`, `ingest.ts`, `search.ts`)
- [x] T006 [P] Delete legacy OKF indexing and RAG modules `src/lib/documents.ts` and `src/lib/rag.ts`
- [x] T007 [P] Delete legacy OKF store `src/stores/document-store.ts` and document types `src/types/documents.ts`
- [x] T008 [P] Update navigation definition in `src/const/sidebar-data.ts` to remove Documents and Knowledge Graph sidebar items
- [x] T009 [P] Update route matching logic in `src/hooks/use-navigation.ts` to remove `/documents` and `/knowledge-graph`
- [x] T010 [P] Clean `src/types/messages.ts` to remove `RagSourceItem` and RAG metadata fields

**Checkpoint**: OKF legacy code completely purged; foundation ready for LiteRT-LM engine and chat integration.

---

## Phase 3: User Story 1 - In-Browser LLM Inference via LiteRT-LM (Priority: P1) 🎯 MVP

**Goal**: Enable in-browser, WebGPU-accelerated LLM inference using Google's official `@litert-lm/core` Web engine with `gemma-4-E2B-it-web.litertlm`.

**Independent Test**: Download `gemma-4-E2B-it-web.litertlm` from the Models page, verify engine initializes with status `"ready"`, and confirm WebGPU token generation works via `@litert-lm/core`.

### Implementation for User Story 1

- [x] T011 [P] [US1] Update model configuration in `src/const/models.ts` to register `gemma-4-E2B-it-web.litertlm` from repo `litert-community/gemma-4-E2B-it-litert-lm`
- [x] T012 [P] [US1] Update model cache management and object URL generation for `.litertlm` files in `src/lib/model-manager.ts`
- [x] T013 [P] [US1] Update model download background worker in `src/workers/model-download-worker.ts` to download and cache `.litertlm` model files in Cache API
- [x] T014 [US1] Refactor `src/stores/litert-store.ts` to type and store LiteRT-LM `Engine` instance from `@litert-lm/core` instead of MediaPipe `LlmInference`
- [x] T015 [US1] Refactor `src/hooks/use-ai-model.ts` to instantiate LiteRT-LM via `Engine.create({ model: objectUrl, mainExecutorSettings: { maxNumTokens: 8192 } })` with WebGPU validation and error reporting (depends on T012, T014)

**Checkpoint**: At this point, LiteRT-LM engine model download, caching, and WebGPU instantiation is fully functional and testable independently.

---

## Phase 4: User Story 2 - Removal of OKF Knowledge System & Navigation Simplification (Priority: P2)

**Goal**: Deliver a clean, simplified navigation and application shell free of obsolete OKF document management and knowledge graph dependencies.

**Independent Test**: Navigate through sidebar links and attempt direct access to `/documents` and `/knowledge-graph`; verify they do not render broken views and that Cytoscape/MiniSearch are completely absent from client bundles.

### Implementation for User Story 2

- [x] T016 [P] [US2] Update `src/components/app-sidebar.tsx` to verify sidebar navigation renders cleanly without document and knowledge graph references
- [x] T017 [P] [US2] Verify and clean any lingering references to document stores or OKF concepts across storage hooks (`src/hooks/chat/use-chat-storage.ts`)

**Checkpoint**: Navigation is unencumbered, bundle is stripped of heavy graph/indexing libraries, and only active core routes exist.

---

## Phase 5: User Story 3 - Pure Direct Conversational Chat Experience (Priority: P3)

**Goal**: Streamline chat experience by removing RAG retrieval latency and "Sources" drawer components, executing pure conversational LLM streaming with turn memory.

**Independent Test**: Send chat messages to an active LiteRT-LM engine; verify responses stream without citation badges or Sources drawer, and session summarization triggers without document dependencies.

### Implementation for User Story 3

- [x] T018 [US3] Refactor `src/lib/buddhi-ai-core/chat-api.ts` into `LiteRTChatTransport` using `Engine` and `conversation.sendMessageStreaming(prompt)`, removing RAG retrieval pipeline and context injection
- [x] T019 [P] [US3] Refactor summarization routine in `src/lib/memory.ts` to run message history compression using LiteRT-LM `Engine` conversations
- [x] T020 [P] [US3] Update instance typing to `Engine` in `src/hooks/chat/use-chat-memory.ts` and `src/hooks/chat/use-chat-storage.ts`
- [x] T021 [US3] Refactor `src/components/custom/chat/chat-session.tsx` to remove RAG retrieval coordination, source state, and Sources drawer toggles (depends on T018, T020)
- [x] T022 [US3] Refactor `src/components/custom/chat/chat-messages.tsx` to remove the Sources drawer component, citation pill elements, and `RagSourceItem` rendering

**Checkpoint**: All user stories functional; chat operates as a fast, distraction-free conversational experience powered by LiteRT-LM.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, build verification, and clean documentation.

- [x] T023 [P] Update local developer documentation and verification steps in `.buddhi/specs/001-remove-okf-and/quickstart.md`
- [x] T024 Run full TypeScript build via `npm run build` to verify zero compile or import errors
- [x] T025 Run linter via `npm run lint` to verify code quality and style compliance
- [x] T026 Perform end-to-end interactive smoke test of model download and local streaming inference in browser

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — executes immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — blocks all user stories.
- **User Story 1 (Phase 3 - P1 MVP)**: Depends on Phase 2; enables core LiteRT-LM engine.
- **User Story 2 (Phase 4 - P2)**: Depends on Phase 2; cleans sidebar and app shell.
- **User Story 3 (Phase 5 - P3)**: Depends on Phase 3 (needs `Engine` contract from US1) and Phase 2 (clean types).
- **Polish (Phase 6)**: Depends on all user story phases completion.

### Parallel Opportunities

- Within **Phase 2**: T004, T005, T006, T007, T008, T009, T010 can all run in parallel.
- Within **Phase 3 (US1)**: T011, T012, T013 can run in parallel before T014/T015.
- Within **Phase 4 (US2)**: T016 and T017 can run in parallel.
- Within **Phase 5 (US3)**: T019 and T020 can run in parallel alongside T018.
- Within **Phase 6**: T023 can run in parallel with verification tasks.
