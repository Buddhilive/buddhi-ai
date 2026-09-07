# Tasks: Repurpose Buddhi-AI into a Client-Side AI Web & UI Designer

**Branch**: `v2` | **Feature Spec**: [.buddhi/specs/002-repurpose-web-designer/spec.md](file:///c:/DevDojo/Buddhi/buddhi-ai/.buddhi/specs/002-repurpose-web-designer/spec.md) | **Plan**: [.buddhi/specs/002-repurpose-web-designer/plan.md](file:///c:/DevDojo/Buddhi/buddhi-ai/.buddhi/specs/002-repurpose-web-designer/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Directory scaffolding and foundational file structures

- [x] T001 Create skill directories in `public/skills/web-design-engineer/references/style-recipes/`
- [x] T002 Create component and library directories in `src/lib/skills/` and `src/components/custom/designer/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core skill caching infrastructure, types, and stores required before any user story can execute

**⚠️ CRITICAL**: Must be completed before Phase 3 (US1) begins.

- [x] T003 [P] Author Tier 1 skills catalog manifest in `public/skills/index.json`
- [x] T004 [P] Define TypeScript types for skills, manifests, and cache entries in `src/types/skills.ts`
- [x] T005 Implement `SkillManager` client with CacheStorage API and IndexedDB fallback in `src/lib/skills/skill-manager.ts`
- [x] T006 [P] Implement `useSkillStore` Zustand store for active skills and loaded recipes in `src/stores/skill-store.ts`
- [x] T007 Implement fallback embedded web designer system prompt in `src/const/system-prompts/web-designer.ts`

**Checkpoint**: Skill discovery, caching, and state management operational.

---

## Phase 3: User Story 1 - Progressive Disclosure & Skill Engine (Priority: P1) 🎯 MVP

**Goal**: Load only relevant skill guidance into Gemma 4 E2B's system prompt context dynamically without exceeding the token budget or GPU memory.

**Independent Test**: Trigger "Web & UI Designer" mode in the chat session. Verify via DevTools Network/Cache that `index.json` loads first, `SKILL.md` loads upon activation, and only the requested style recipe loads when specified, keeping prompt overhead under 1,200 tokens.

### Implementation for User Story 1

- [x] T008 [P] [US1] Author Tier 2 core skill prompt in `public/skills/web-design-engineer/SKILL.md` (optimized for Gemma 4 E2B text-only code generation)
- [x] T009 [P] [US1] Author Tier 3 style recipe `public/skills/web-design-engineer/references/style-recipes/linear.md`
- [x] T010 [P] [US1] Author Tier 3 style recipe `public/skills/web-design-engineer/references/style-recipes/minimal-editorial.md`
- [x] T011 [P] [US1] Author Tier 3 style recipe `public/skills/web-design-engineer/references/style-recipes/modern-saas.md`
- [x] T012 [P] [US1] Author design tokens and anti-cliché blocklist in `public/skills/web-design-engineer/references/design-tokens.md` and `public/skills/web-design-engineer/references/anti-patterns.md`
- [x] T013 [US1] Implement prompt composition and token budget validator in `src/lib/skills/skill-injector.ts`
- [x] T014 [US1] Integrate `SkillManager` and dynamic prompt injection into `ChatSession` in `src/components/custom/chat/chat-session.tsx`
- [x] T015 [US1] Verify progressive disclosure loading and validate that injected tokens do not exceed 1,200 tokens

**Checkpoint**: User Story 1 complete and independently functional as an MVP.

---

## Phase 4: User Story 2 - Gemma 4 E2B Code Generation & Output Processing (Priority: P1)

**Goal**: Ensure Gemma 4 E2B reliably outputs two-phase results (Design Decisions followed by executable single-bundle HTML/CSS/JS) and parse code blocks automatically.

**Independent Test**: Prompt the model to design a web section. Verify that the response contains structured design tokens and that the HTML code block is parsed into an active artifact state.

### Implementation for User Story 2

- [x] T016 [P] [US2] Implement HTML/CSS code block extractor utility in `src/lib/code-extractor.ts` to detect and extract code from streaming assistant messages
- [x] T017 [US2] Update chat streaming message handler in `src/components/custom/chat/chat-session.tsx` to automatically synchronize extracted code with canvas state
- [x] T018 [US2] Test and validate code extraction with representative web layout outputs (hero sections, landing pages, pricing grids)

**Checkpoint**: User Stories 1 and 2 work seamlessly together.

---

## Phase 5: User Story 3 - Interactive Canvas & Vercel AI Elements `web-preview` (Priority: P2)

**Goal**: Provide a Figma-alternative live canvas workspace hosting Vercel AI Elements `web-preview` with responsive viewport frames, code inspection, and zoom/pan.

**Independent Test**: Generate a UI design and verify that `web-preview` automatically mounts the sandboxed iframe, allows switching between Desktop (1440px), Tablet (768px), and Mobile (375px), and opens code inspection.

### Implementation for User Story 3

- [x] T019 [P] [US3] Create `useDesignerCanvasStore` Zustand store in `src/stores/designer-canvas-store.ts` (viewport presets, zoom, pan, active code)
- [x] T020 [P] [US3] Implement responsive viewport controls toolbar in `src/components/custom/designer/viewport-toolbar.tsx`
- [x] T021 [US3] Implement `DesignerCanvas` in `src/components/custom/designer/designer-canvas.tsx` integrating `WebPreview` (`src/components/ai-elements/web-preview.tsx`)
- [x] T022 [P] [US3] Implement code inspection and export drawer in `src/components/custom/designer/code-export-modal.tsx`
- [x] T023 [US3] Implement split workspace container in `src/components/custom/designer/designer-workspace.tsx` and connect to the chat interface

**Checkpoint**: Full interactive Figma-alternative canvas functioning with live preview and device toggles.

---

## Phase 6: User Story 4 - Local Asset Drag & Drop Integration (Priority: P3)

**Goal**: Allow designers to drag and drop local PNG/SVG images onto the canvas to use them in the generated designs via local object URLs.

**Independent Test**: Drag an image into the canvas asset panel, verify an object URL is created, and observe it referenced in generated HTML.

### Implementation for User Story 4

- [x] T024 [P] [US4] Implement client-side asset manager and local object URL registry in `src/lib/asset-manager.ts`
- [x] T025 [US4] Implement `AssetDropzone` drawer in `src/components/custom/designer/asset-dropzone.tsx`
- [x] T026 [US4] Connect available asset URLs into the chat prompt input context in `src/components/custom/chat/chat-input.tsx`

**Checkpoint**: All user stories functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Navigation integration, theme harmonization, verification, and end-to-end testing

- [x] T027 [P] Implement UI Mode Switcher ("General Chat" <-> "Web & UI Designer") in `src/components/custom/designer/designer-mode-toggle.tsx` and integrate into `src/components/app-sidebar.tsx`
- [x] T028 [P] Polish dark/light mode canvas styling, iframe loading shimmers, and error boundaries
- [x] T029 Execute build and lint verification (`npm run lint`, `npm run build`)
- [x] T030 Perform end-to-end verification of the designer workflow from prompt to sandboxed preview and export

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. Blocks all user stories.
- **User Story 1 (Phase 3 - P1 MVP)**: Depends on Phase 2. Core skill progressive disclosure.
- **User Story 2 (Phase 4 - P1)**: Depends on Phase 3. Code generation & extraction.
- **User Story 3 (Phase 5 - P2)**: Depends on Phase 4. Canvas workspace & `web-preview`.
- **User Story 4 (Phase 6 - P3)**: Depends on Phase 5. Local asset drag-and-drop.
- **Polish (Phase 7)**: Depends on all user stories being complete.

### Parallel Execution Opportunities
- Tasks marked `[P]` touch separate files and have no inter-task dependencies:
  - Phase 2: T003, T004, T006 can run in parallel.
  - Phase 3: T008, T009, T010, T011, T012 can run in parallel.
  - Phase 5: T019, T020, T022 can run in parallel.
  - Phase 7: T027, T028 can run in parallel.
