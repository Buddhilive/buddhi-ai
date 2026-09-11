# Feature Specification: Next.js Project Initialization & Sandbox IndexedDB Persistence

**Feature Branch**: `004-nextjs-init-and`

**Created**: 2026-09-11

**Status**: Ready for Planning

**Input**: User description: "Since this project now focus on `Next.js` based vibe coding, initializing a chat session with Next.js project initialized is better. Implement new Next.js project initialization according to the official next.js docs: `https://nextjs.org/docs/app/getting-started/installation`. Implement an informative loading screen until the project is initialized within the `buddhi-ai-sandbox`. You may use Terminal component in Vercel AI Elements: `https://elements.ai-sdk.dev/components/terminal` which can be used to show the project initialization progress. Also, implement an mechanism to save all files within the sandbox in `indexedDB` against `chatId` for persistance. Ignore files ignored by `.gitignore` Trigger the save (auto save) on each file change within sandbox. When previous chat is loaded from chat history, initialize the chat with the saved files and show the loading screen until project initialized (with `npm install`)."

---

## User Scenarios & Testing

### User Story 1 - Instant Next.js Starter Initialization with Informative Terminal Loading (Priority: P1)

As a vibe coder starting a new chat session in Buddhi AI, I want a fresh Next.js App Router project (with Tailwind CSS and Shadcn UI conventions) pre-initialized and compiling immediately, with an informative Terminal loading screen, so I can see live progress and start vibe coding without waiting for manual setup.

**Why this priority**:
P1 is the core user experience. Without an initialized project, the user enters an empty state and has to wait for AI to write boilerplate files. Providing a pre-seeded Next.js starter with live terminal feedback ensures immediate preview availability and rapid iteration.

**Independent Test**:
Start a new chat session without prompt input. The preview pane shows a sleek loading state featuring the Vercel AI Elements `Terminal` component streaming initialization steps (`npm install`, file scaffolding, and `next dev` boot). Once completed, the preview displays the Buddhi AI branded starter page on `http://localhost:3000`.

**Acceptance Scenarios**:

1. **Given** a new chat session (`chatId = null` or fresh chat),
   **When** the chat session mounts,
   **Then** the sandbox initializes, scaffolds the Next.js 16 App Router project (with Tailwind CSS, Shadcn UI setup, and `buddhi-ai` starter page), runs `npm install`, and spawns `next dev --port 3000`.
2. **Given** the initialization process is active,
   **When** the user views the preview panel,
   **Then** an informative loading screen is displayed with the Vercel AI Elements `Terminal` component showing stdout/stderr and stage progress badges.
3. **Given** `next dev` finishes starting and listens on virtual port 3000,
   **When** the server is ready,
   **Then** the preview panel switches from the loading screen to the live app iframe showing the `buddhi-ai` starter page.

---

### User Story 2 - Automated IndexedDB Sandbox File Persistence on Change (Priority: P2)

As a vibe coder iterating on my Next.js project across multiple prompts, I want all source files modified or created in the sandbox to be automatically persisted to IndexedDB against my `chatId` (excluding `.gitignore` artifacts), so my project changes are never lost.

**Why this priority**:
In-browser WebAssembly filesystems are ephemeral in memory unless explicitly backed by durable browser storage. Saving files on change ensures durability across page refreshes and browser reloads.

**Independent Test**:
Make changes to project files in the sandbox (via AI generation or code edits). Verify via DevTools IndexedDB inspection that the files table under the current `chatId` contains the updated files while omitting `node_modules/`, `.next/`, and temporary build artifacts.

**Acceptance Scenarios**:

1. **Given** an active chat session with an assigned `chatId`,
   **When** files inside `/workspace` are written or modified (listened to via `@buddhilive/sandbox@0.1.0-beta.3`'s `sb.fs.on('change', ...)`),
   **Then** a debounced auto-save triggers, persisting non-ignored files into IndexedDB under the active `chatId`.
2. **Given** `.gitignore` contains rules such as `node_modules/`, `.next/`, `dist/`, and `.env*.local`,
   **When** auto-save scans or processes changed files,
   **Then** matching ignored paths and binaries are filtered out from IndexedDB storage.
3. **Given** a new chat without an existing `chatId` before first message submission,
   **When** the chat ID is generated upon first interaction,
   **Then** the sandbox file store updates its association to the new `chatId`.

---

### User Story 3 - Restoring Sandbox Project from Chat History (Priority: P3)

As a returning user opening a previous chat from sidebar history, I want the sandbox to rehydrate with all my previously saved files and re-initialize with `npm install` and terminal feedback, so I can seamlessly resume vibe coding from where I left off.

**Why this priority**:
Completes the persistence loop. Users can switch between multiple past vibe-coding projects and have each project restored to its exact saved state.

**Independent Test**:
Navigate to `/chat/[chatId]` for a saved session. Verify that the saved files are retrieved from IndexedDB, restored into the sandbox VirtualFS `/workspace`, an informative loading screen with `Terminal` displays while `npm install` runs, and the live preview accurately reflects the saved project state.

**Acceptance Scenarios**:

1. **Given** a user navigates to an existing chat session with saved sandbox files in IndexedDB,
   **When** the session loads,
   **Then** the saved files are written into `/workspace`.
2. **Given** the restored files are in place,
   **When** project setup commences,
   **Then** the loading screen displays the `Terminal` component streaming the `npm install` progress.
3. **Given** `npm install` succeeds,
   **When** `next dev` starts,
   **Then** the preview iframe displays the restored application.

---

### Edge Cases

- **Empty or Corrupted IndexedDB Entry**: If a saved chat has no files or corrupt data in IndexedDB, fall back gracefully to scaffolding the default Next.js starter template and notify the user with a gentle toast.
- **WASM Memory Limit during `npm install`**: Handle memory exhaustion gracefully by surfacing error output in the Terminal component and offering a retry button.
- **Large Ignored Directories**: Ensure recursive directory listing skips traversing into `node_modules/` and `.next/` to maintain instant auto-save performance without browser freeze.
- **Rapid Successive File Writes**: Debounce auto-save (e.g. 800ms) to coalesce multiple rapid file operations into a single IndexedDB transaction.
- **SharedArrayBuffer Unavailable**: Keep fallback error banner explaining COOP/COEP requirements if browser environment does not support SAB.

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST scaffold a clean Next.js 16 App Router starter into `/workspace` for new chat sessions, containing:
  - `package.json` with Next.js, React 19, Lucide React, Tailwind CSS, class-variance-authority, clsx, and tailwind-merge.
  - `components.json` for Shadcn UI configuration.
  - `tsconfig.json` with `@/*` path mapping.
  - `next.config.ts` configured for dev server.
  - `app/layout.tsx` with standard metadata and global styles.
  - `app/page.tsx` featuring simple, clean `buddhi-ai` branding.
  - `app/globals.css` with modern Tailwind CSS theme tokens.
  - `.gitignore` configured to ignore `node_modules`, `.next`, `dist`, `.env*.local`.
- **FR-002**: System MUST display an informative loading screen during project initialization featuring the Vercel AI Elements `Terminal` component (`src/components/ai-elements/terminal.tsx`).
- **FR-003**: The loading screen MUST display real-time terminal stream output (stdout/stderr) from `npm install` and server startup.
- **FR-004**: System MUST upgrade `@buddhilive/sandbox` to `0.1.0-beta.3` and subscribe to `sb.fs.on('change', ...)` for sandbox filesystem event listening.
- **FR-005**: System MUST implement an IndexedDB storage schema (`buddhi_sandbox_files`) storing sandbox file trees keyed by `chatId`.
- **FR-006**: Auto-save MUST respect `.gitignore` rules, strictly excluding `node_modules/`, `.next/`, and transient files from being saved to IndexedDB.
- **FR-007**: Auto-save MUST be debounced to prevent disk/transaction thrashing during batch file operations.
- **FR-008**: When loading an existing chat session from chat history, the system MUST retrieve saved files from IndexedDB and populate `/workspace`.
- **FR-009**: When restoring an existing chat, the system MUST display the `Terminal` loading screen while running `npm install` before launching `next dev`.
- **FR-010**: The loading screen MUST provide status badges (e.g. "Booting Sandbox", "Installing Packages", "Starting Server", "Ready") and a failure state with error details and retry actions.

### Key Entities

- **SandboxSavedProject**:
  - `chatId`: string (unique primary key)
  - `updatedAt`: number (timestamp)
  - `files`: Record<string, string> (map of relative file path to UTF-8 file content)
  - `version`: number (schema migration version)
- **InitState**:
  - `stage`: `"booting"` | `"scaffolding"` | `"installing"` | `"starting"` | `"ready"` | `"error"`
  - `progressText`: string
  - `logs`: string[]
  - `error`: string | null

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: New chat sessions boot into an initialized Next.js project and begin `npm install` within 2 seconds of sandbox kernel readiness.
- **SC-002**: Loading screen cleanly streams 100% of terminal output through the Vercel AI Elements `Terminal` component with working auto-scroll and copy button.
- **SC-003**: 100% of non-ignored project files are automatically persisted to IndexedDB within 1 second of file change events settling.
- **SC-004**: Zero `node_modules` or `.next` files are persisted to IndexedDB (verifiable by inspecting IndexedDB storage size < 2MB for standard projects).
- **SC-005**: Switching to a previous chat from history fully restores all user-authored code files and successfully launches the dev server.

---

## Assumptions

- Users have a modern browser supporting `SharedArrayBuffer` and `IndexedDB` with standard security headers (COOP/COEP).
- `@buddhilive/sandbox@0.1.0-beta.3` provides the `sb.fs.on('change', listener)` event API and NPM package installation support.
- File sizes for user code files in `/workspace` are textual and fall well within standard browser IndexedDB storage quotas.
- `package.json` in the starter project specifies standard compatible versions of `next`, `react`, and `react-dom`.
