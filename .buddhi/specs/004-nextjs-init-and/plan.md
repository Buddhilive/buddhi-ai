# Implementation Plan: Next.js Project Initialization & Sandbox IndexedDB Persistence

**Branch**: `004-nextjs-init-and` | **Date**: 2026-09-11 | **Spec**: [spec.md](file:///c:/DevDojo/Buddhi/buddhi-ai/.buddhi/specs/004-nextjs-init-and/spec.md)

**Input**: Feature specification from `/.buddhi/specs/004-nextjs-init-and/spec.md`

---

## Summary

Pivot Buddhi AI chat sessions into an instant Next.js vibe coding environment. When a chat session starts, the sandbox automatically initializes a pre-configured Next.js 16 App Router project (with Tailwind CSS and Shadcn UI conventions, featuring a clean `buddhi-ai` branded starter page). During setup, an informative loading screen powered by Vercel AI Elements `Terminal` streams `npm install` and server startup logs. All user code in `/workspace` is automatically persisted to IndexedDB against `chatId` (ignoring `.gitignore` artifacts like `node_modules/` and `.next/`) via `@buddhilive/sandbox@0.1.0-beta.3` change listener API (`sb.fs.on('change', ...)`). Returning to previous chats restores the saved files and executes `npm install` with the Terminal loading screen before launching `next dev`.

---

## Technical Context

**Language/Version**: TypeScript 5 / React 19 / Next.js 16.3 (App Router)

**Primary Dependencies**:
- `@buddhilive/sandbox`: `^0.1.0-beta.3` (with native `sb.fs.on('change', ...)` support)
- `@buddhilive/sandbox-sw`: `0.1.0-beta.2`
- `@ai-sdk/react` / `ai`: Vercel AI Elements (`Terminal`, `TerminalHeader`, `TerminalContent`, `TerminalStatus`, etc.)
- `lucide-react`, `sonner`, `tailwind-merge`, `clsx`, `class-variance-authority`

**Storage**:
- Client-side IndexedDB (database `buddhi_ai_db` or dedicated `buddhi_sandbox_storage` store) for storing `{ chatId, updatedAt, files: Record<string, string>, version }`.

**Testing**:
- Manual verification in browser with live WebAssembly sandbox, DevTools IndexedDB inspection, and terminal output verification.

**Target Platform**:
- Modern web browsers with `SharedArrayBuffer` (COOP/COEP) and IndexedDB support.

**Constraints & Performance Goals**:
- Scaffolding to `npm install` trigger: < 1.5s from sandbox kernel boot.
- Auto-save debounce: 800ms to batch multi-file AI streaming writes.
- Zero persistence of `node_modules/`, `.next/`, or `.git/` directories (maintaining tiny storage footprint < 2MB per chat).

---

## AGENTS.md Compliance Check

- [x] Project build & dev server conventions respected (`npm run dev`, Next.js 16 App Router).
- [x] Web aesthetics guidelines upheld: Rich, dark-mode, animated terminal loading screen with clear step badges.
- [x] No purple/violet color schemes used (adheres to design rules in `.agents/agent/frontend-specialist.md`).
- [x] Non-destructive IndexedDB operations with error boundaries and fallbacks.

---

## Project Structure

### Documentation (this feature)

```text
.buddhi/specs/004-nextjs-init-and/
├── spec.md              # Specification with user stories P1, P2, P3
└── plan.md              # Architectural & implementation plan
```

### Source Code Changes & Layout

```text
src/
├── const/
│   └── nextjs-starter-template.ts          # [NEW] Default Next.js App Router + Tailwind + Shadcn starter files
├── lib/
│   └── sandbox-storage.ts                  # [NEW] IndexedDB persistence layer for sandbox files (with .gitignore filter)
├── stores/
│   └── sandbox-store.ts                    # [MODIFY] Extend store to track init stage, terminal logs, and persistence state
├── components/
│   ├── custom/
│   │   ├── chat/
│   │   │   └── chat-session.tsx            # [MODIFY] Pass chatId & lifecycle state down to sandbox
│   │   └── sandbox/
│   │       ├── sandbox-loading.tsx         # [NEW] Informative Terminal loading screen using AI Elements Terminal
│   │       └── sandbox-preview.tsx         # [MODIFY] Integrate template seeding, npm install, change listener, and restoration
package.json                                # [MODIFY] Update @buddhilive/sandbox dependency to ^0.1.0-beta.3
```

---

## Detailed Architectural Design

### 1. Starter Template Definition (`src/const/nextjs-starter-template.ts`)
Creates a standard, pre-vetted Next.js 16 project structure:
- `package.json`:
  ```json
  {
    "name": "buddhi-vibe-app",
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "dev": "next dev --port 3000",
      "build": "next build",
      "start": "next start"
    },
    "dependencies": {
      "next": "16.3.4",
      "react": "19.2.8",
      "react-dom": "19.2.8",
      "lucide-react": "^1.7.0",
      "clsx": "^2.1.1",
      "tailwind-merge": "^3.5.0",
      "class-variance-authority": "^0.7.1"
    },
    "devDependencies": {
      "typescript": "^5",
      "@types/node": "^20",
      "@types/react": "19.2.18",
      "@types/react-dom": "19.2.7",
      "tailwindcss": "^4",
      "@tailwindcss/postcss": "^4"
    }
  }
  ```
- `app/layout.tsx`: Root layout importing `globals.css` and setting up html/body.
- `app/page.tsx`: Clean `buddhi-ai` branded starter page with prompt ideas, ready for AI vibe-coding.
- `app/globals.css`: Tailwind v4 theme directives (`@import "tailwindcss";`).
- `components.json`: Standard Shadcn configuration.
- `lib/utils.ts`: `cn` helper combining `clsx` and `twMerge`.
- `tsconfig.json`: Standard TS config with `"@/*": ["./*"]`.
- `next.config.ts`: Dev configuration.
- `.gitignore`: Ignoring `node_modules`, `.next`, `dist`, `.env*.local`.

### 2. IndexedDB Sandbox Persistence Layer (`src/lib/sandbox-storage.ts`)
- Utilizes browser `indexedDB` API with object store `buddhi_sandbox_files`.
- Method `saveSandboxFiles(chatId: string, files: Record<string, string>): Promise<void>`
- Method `loadSandboxFiles(chatId: string): Promise<Record<string, string> | null>`
- Method `deleteSandboxFiles(chatId: string): Promise<void>`
- `.gitignore` filter: Parses `.gitignore` rules to exclude `node_modules/**`, `.next/**`, `dist/**`, `.git/**`, `.env*.local` when scanning `/workspace`.

### 3. Change Listener & Auto-Save Workflow
- Upon sandbox creation:
  ```ts
  const unsubscribe = sb.fs.on('change', () => {
    debouncedSaveFiles();
  });
  ```
- Debounce handler:
  1. Recursively enumerates `/workspace` skipping ignored directories (`node_modules`, `.next`, etc.).
  2. Reads file contents for eligible text files.
  3. Writes file map to IndexedDB under the current `chatId`.
  4. If `chatId` is newly assigned after first message submission, transfers pending files to the new `chatId`.

### 4. Informative Loading Screen (`src/components/custom/sandbox/sandbox-loading.tsx`)
- Embeds Vercel AI Elements `Terminal` component (`src/components/ai-elements/terminal.tsx`).
- Progress indicator cards:
  - Step 1: **WASM Kernel Boot**
  - Step 2: **Scaffolding Next.js App Router**
  - Step 3: **Installing Dependencies (`npm install`)**
  - Step 4: **Starting Next.js Server (`next dev`)**
- Full terminal stream with auto-scroll, ANSI color support, clear button, and copy button.
- Graceful error state with retry action if `npm install` or spawn encounters an issue.

### 5. Chat History Restoration Flow
- When loading a chat session where `chatId` exists:
  1. Check IndexedDB for existing files for `chatId`.
  2. If found: Write saved files into `/workspace`.
  3. If not found: Pre-seed the default starter template.
  4. Display `SandboxLoading` screen with Terminal.
  5. Run `npm install` inside sandbox.
  6. Launch `next dev` and transition to preview once virtual port is online.

---

## Complexity Tracking

| Component / Trade-off | Why Needed | Alternative Rejected |
|-----------------------|------------|----------------------|
| Debounced FS scan on change | Keeps IndexedDB updated even if files are created by background commands or multi-step AI edits | Saving only on AI message completion was rejected because processes or manual edits wouldn't be captured |
| Pre-seeded template vs `create-next-app` | Zero network dependency for project structure, fast, deterministic in WASM | Running `npx create-next-app` directly in WASM was rejected due to slow interactive prompt overhead and network failures |
