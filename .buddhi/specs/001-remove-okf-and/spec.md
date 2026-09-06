# Feature Specification: LiteRT-LM Web Engine & OKF Knowledge System Removal

**Feature Branch**: `001-remove-okf-and`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "1. Remove the Open Knowledge Format based knowledge system and remove associated features and code, thus removing 'Documents' and 'Knowledge Graph' pages. 2. Use the LiteRT-LM (Web) library instead of Mediapipe library for LLM inferencing, following the official documentation: (https://developers.google.com/edge/litert-lm/js)"

---

## Overview

This specification defines the migration of Buddhi AI's browser-based inference engine from Google MediaPipe (`@mediapipe/tasks-genai`) to Google's official LiteRT-LM Web API (`@litert-lm/core`), alongside the complete deprecation and removal of the Open Knowledge Format (OKF) knowledge system, document manager, knowledge graph visualizer, and RAG retrieval pipeline.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - In-Browser LLM Inference via LiteRT-LM (Priority: P1)

As a user of Buddhi AI,
I want the application to run language models using Google's official LiteRT-LM Web framework,
So that I experience fast, private, WebGPU-accelerated local AI inferencing with first-class streaming and modern edge model support.

**Why this priority**: Core value proposition of Buddhi AI is 100% private in-browser generative AI. Upgrading from legacy MediaPipe GenAI to the official `@litert-lm/core` engine guarantees ongoing compatibility with Gemma 4 edge models and WebGPU optimizations.

**Independent Test**: Download the LiteRT-LM compatible model (`gemma-4-E2B-it-web.litertlm`) in the Models page, open a Chat session, send a prompt, and verify that streaming tokens are generated and rendered in real-time via `@litert-lm/core` without network calls.

**Acceptance Scenarios**:
1. **Given** a downloaded `gemma-4-E2B-it-web.litertlm` in browser storage, **When** the user opens the application, **Then** the LiteRT-LM `Engine` initializes successfully with status `"ready"`.
2. **Given** an active LiteRT-LM engine, **When** the user inputs a prompt and submits, **Then** a conversation session streams token chunks directly into the chat interface using `sendMessageStreaming`.
3. **Given** a model with reasoning capabilities, **When** thinking tokens are generated, **Then** the interface preserves thinking/reasoning collapsible blocks before final response prose.
4. **Given** a user triggers "Stop", **When** generating, **Then** the inference loop halts immediately and resources are safely retained for the next turn.

---

### User Story 2 - Removal of OKF Knowledge System & Navigation Simplification (Priority: P2)

As a user of Buddhi AI,
I want a clean, unencumbered interface focused on high-performance chatting and model management,
So that obsolete, heavy document processing and knowledge graph pages are removed and the application is leaner and faster.

**Why this priority**: Removing OKF, Cytoscape, and MiniSearch strips massive bundle overhead and eliminates maintenance of complex client-side document chunking and indexing that is no longer part of the product direction.

**Independent Test**: Verify that the sidebar navigation no longer displays "Documents" or "Knowledge Graph", accessing their paths returns a 404 or redirects cleanly to `/chat`, and no background OKF decomposition or IndexedDB concept store activity occurs.

**Acceptance Scenarios**:
1. **Given** the application layout, **When** inspecting the sidebar, **Then** only active routes (New Chat, Models, History) are displayed; "Documents" and "Knowledge Graph" are absent.
2. **Given** any legacy URL such as `/documents` or `/knowledge-graph`, **When** directly navigated, **Then** the application does not render broken or orphan document manager views.
3. **Given** application bundle compilation, **When** `next build` is executed, **Then** `cytoscape`, `minisearch`, `@xyflow/react`, and OKF modules are completely excluded from client chunks.

---

### User Story 3 - Pure Direct Conversational Chat Experience (Priority: P3)

As a user chatting with local models,
I want a streamlined chat interface without retrieval latency or irrelevant "Sources" drawer components,
So that my prompts execute immediately with conversational memory and zero distraction.

**Why this priority**: Now that OKF is removed, the chat pipeline can shed synchronous/asynchronous RAG resolution steps, reducing per-message latency and cleaning up message component clutter.

**Independent Test**: Send multiple messages in a chat conversation; verify that no RAG retrieval step is performed, messages appear without empty source drawers, and conversational memory remains functional.

**Acceptance Scenarios**:
1. **Given** a user message, **When** submitted to `useChat`, **Then** the custom transport sends the prompt directly to the LiteRT-LM engine without querying document indices.
2. **Given** assistant responses, **When** rendered in the message bubble, **Then** the "Sources" drawer and RAG citation badges are omitted.
3. **Given** a multi-turn conversation, **When** history exceeds summary thresholds, **Then** chat session memory/summarization operates cleanly without referencing external documents.

---

## Edge Cases

- **WebGPU Not Supported**: If the user's browser or device lacks WebGPU support, LiteRT-LM will fail initialization. The engine store MUST capture this error and show an informative message directing the user to enable WebGPU or use a compatible browser (e.g. Chrome/Edge with hardware acceleration).
- **Corrupted or Partial Model File**: If a cached `.litertlm` file fails validation during `Engine.create`, the system must mark the model status as `"failed"` and allow re-downloading from the Models page.
- **Model Switch / Engine Re-creation**: If a user switches or deletes models, any active `Engine` instance and conversation context must be cleanly disposed before instantiating a new one.
- **Out of VRAM / WASM Memory**: If the browser runs out of memory during inference with large contexts, LiteRT-LM throws an exception; the transport stream must catch this and display a user-friendly error chunk instead of hanging the UI.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST uninstall `@mediapipe/tasks-genai` and install `@litert-lm/core`.
- **FR-002**: System MUST update model configuration in `src/const/models.ts` to target `gemma-4-E2B-it-web.litertlm` (from repository `litert-community/gemma-4-E2B-it-litert-lm`) with `.litertlm` extension.
- **FR-003**: System MUST update `model-manager.ts` and download worker to store, verify, and return object URLs for `.litertlm` model files.
- **FR-004**: System MUST rewrite `src/stores/litert-store.ts` to type and store the LiteRT-LM `Engine` instance instead of MediaPipe's `LlmInference`.
- **FR-005**: System MUST rewrite `src/hooks/use-ai-model.ts` to instantiate LiteRT-LM using `Engine.create({ model: objectUrl, mainExecutorSettings: { maxNumTokens: 8192 } })`.
- **FR-006**: System MUST adapt `src/lib/buddhi-ai-core/chat-api.ts` to create conversations and stream response chunks via `conversation.sendMessageStreaming(...)`.
- **FR-007**: System MUST delete OKF directories and files: `src/lib/okf/`, `src/lib/documents.ts`, `src/lib/rag.ts`, `src/stores/document-store.ts`, and `src/types/documents.ts`.
- **FR-008**: System MUST delete page routes `src/app/(buddhi-ai)/documents/` and `src/app/(buddhi-ai)/knowledge-graph/`, as well as components `src/components/custom/document-manager.tsx` and `src/components/custom/knowledge-graph-view.tsx`.
- **FR-009**: System MUST update `src/const/sidebar-data.ts` and `src/hooks/use-navigation.ts` to remove all entries for Documents and Knowledge Graph.
- **FR-010**: System MUST clean up `chat-session.tsx`, `chat-interface.tsx`, and `types/messages.ts` to remove RAG source structures, retrieval promises, and Sources UI drawer.
- **FR-011**: System MUST remove unused dependencies (`cytoscape`, `@types/cytoscape`, `minisearch`, `@xyflow/react`, `gray-matter`) from `package.json`.

---

## Success Criteria *(measurable)*

- **SC-001**: `npm run build` succeeds with zero TypeScript errors and zero unresolved imports.
- **SC-002**: In-browser inference runs exclusively through `@litert-lm/core` with WebGPU acceleration.
- **SC-003**: Streaming token latency begins within 500ms after prompt dispatch on standard WebGPU hardware.
- **SC-004**: Zero trace of OKF or Cytoscape remains in the compiled client JavaScript bundles.
- **SC-005**: Chat works as a smooth standalone conversational interface with full turn memory.

---

## Next Steps

Run `/plan` to generate the detailed implementation plan and file modification breakdown.
