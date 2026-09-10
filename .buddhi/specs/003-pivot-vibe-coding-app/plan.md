# Implementation Plan: Pivot to Vibe Coding App (True Next.js App Router)

**Branch**: `003-pivot-vibe-coding-app` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

---

## Summary

Pivot `buddhi-ai` from a single-file HTML web designer to a **Vibe Coding App** that generates complete, multi-file **Next.js 16 App Router** projects and runs them entirely client-side using `@buddhilive/sandbox` (v0.1.0-beta.2). 

With the latest `buddhi-ai-sandbox` release, the sandbox now natively supports Next.js:
- Emulates essential Node.js built-ins (`fs`, `path`, `http`, `events`, `buffer`, `stream`, `crypto`, `zlib`, `os`, `net`, `tls`, `string_decoder`, and `fs.watch`).
- Transparently intercepts `@next/swc` using `esbuild-wasm` for in-browser JSX/TSX compilation.
- Transparently intercepts `better-sqlite3` using `wa-sqlite` for client-side SQLite database persistence.
- Handles React Server Components (RSC) chunked streaming via `@buddhilive/sandbox-sw`.
- Executes both `next dev` (with file-watching and HMR) and `next start`.

This eliminates the previous "Express + CDN React" limitation. The AI can now generate true, production-grade Next.js App Router projects with TypeScript, Server/Client components, API routes, and SQLite.

Key architectural shifts:
1. **Remove legacy designer tools**: Delete Prompt Builder, Designer Canvas, Designer Workspace, and `web-design-engineer` skill.
2. **True Next.js Sandbox Execution**: Integrate `@buddhilive/sandbox@0.1.0-beta.2` + `@buddhilive/sandbox-sw@0.1.0-beta.2`.
3. **Multi-Panel Sandbox Preview**: Add `SandboxPreview` component with live Preview (`/__preview/:port/`), real-time Terminal (stdout/stderr streaming), and VFS File Explorer tabs.
4. **Vibe Coder System Prompt & Skill**: Multi-file code generation format (`path=app/page.tsx`, etc.), Next.js App Router conventions adhering to official Next.js AI agent guidelines (`https://nextjs.org/docs/app/guides/ai-agents`), token budget ≤ 400 (base) + ≤ 800 (skill).
5. **UI & UX Modernization**: Reasoning enabled by default (`isReasoningOn = true`), sidebar collapsed by default (`SidebarProvider defaultOpen={false}`), responsive split layout for desktop and tabs for mobile.

---

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 16.3.4 / React 19

**Primary Dependencies**:
- `@buddhilive/sandbox@0.1.0-beta.2` (new) — WebAssembly POSIX VFS & Node.js runtime with Next.js & `@next/swc` interception
- `@buddhilive/sandbox-sw@0.1.0-beta.2` (new) — Service Worker preview bridge for `/__preview/:port/` with RSC streaming
- `@ai-sdk/react@^3` + `ai@^6` — AI SDK client transport
- `@litert-lm/core@^0.17` — on-device Gemma 4 E2B model
- `zustand@^5` — client state management
- `tailwindcss@^4` + shadcn/ui — styling

**Storage**:
- IndexedDB (existing chat session history — unchanged)
- CacheStorage (skills cache — unchanged)
- In-memory POSIX VirtualFS (sandbox filesystem, ephemeral per session or persisted via OPFS/IndexedDB)

**Target Platform**: Modern browsers supporting `SharedArrayBuffer` + WebAssembly + Service Workers (Chrome 111+, Firefox 114+, Safari 16.4+) with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.

**Performance Goals**:
- Vibe prompt → first byte streaming: ≤ 3s
- File extraction → sandbox VFS write: ≤ 500ms
- Next.js dev server boot & preview ready: ≤ 10s
- Iterative code update (HMR / refresh): ≤ 3s
- System prompt budget: ≤ 400 tokens (base) + ≤ 800 tokens (skill) = ≤ 1200 tokens total

---

## Architecture Decision: True Next.js App Router in Sandbox

### Context
Previously, `@buddhilive/sandbox` lacked SWC transpilation and advanced Node.js modules, necessitating an Express + CDN React workaround. 
In `buddhi-ai-sandbox` v0.1.0-beta.2:
1. **`esbuild-wasm`** has been integrated into the toolchain bundle to replace native `@next/swc`, enabling instant TypeScript and JSX transforms in Web Workers.
2. **`wa-sqlite`** is integrated for full SQLite support via `better-sqlite3` shims.
3. The Node.js built-in module surface was expanded to include `events`, `buffer`, `stream`, `crypto`, `zlib`, `os`, `net`, `tls`, `string_decoder`, and `fs.watch`.
4. The Service Worker bridge (`@buddhilive/sandbox-sw`) now handles streaming chunked responses (`text/x-component` for React Server Components).

### Decision
Generate and execute **genuine Next.js App Router** applications.
The AI outputs:
```
/workspace/
  package.json        → Next.js 16, React 19, React-DOM 19
  next.config.js      → Next.js configuration
  app/
    layout.tsx        → Root layout with HTML/body scaffolding
    page.tsx          → Main view (RSC or 'use client')
    globals.css       → Styling
    api/              → Next.js API route handlers (route.ts)
  components/         → Sub-components
```

### Benefits
- **Zero translation friction**: Users vibe-code authentic Next.js apps that can be exported directly into any standard Next.js development environment or deployed to Vercel without rewriting.
- **Full API Route & Server Component capability**: True server-side rendering, RSC wire format, and backend API endpoints inside the browser.
- **SQLite Database Support**: Backend route handlers can query SQLite via `better-sqlite3` transparently in the browser.

---

## Project Structure

### Documentation (this feature)

```text
.buddhi/specs/003-pivot-vibe-coding-app/
├── spec.md              ✅ Complete
├── plan.md              ✅ Updated (Next.js Sandbox Integration)
└── tasks.md             ⏳ Created by /tasks command
```

### Files to DELETE

```text
src/components/custom/designer/
├── designer-canvas.tsx           ❌ DELETE
├── designer-mode-toggle.tsx      ❌ DELETE
├── designer-workspace.tsx        ❌ DELETE
├── viewport-toolbar.tsx          ❌ DELETE
├── code-export-modal.tsx         ❌ DELETE
└── asset-dropzone.tsx            ❌ DELETE

src/stores/
└── designer-canvas-store.ts      ❌ DELETE

src/const/system-prompts/
├── web-designer.ts               ❌ DELETE
└── prompt-builder.ts             ❌ DELETE

public/skills/
└── web-design-engineer/          ❌ DELETE (entire directory)
    ├── SKILL.md
    └── references/
        ├── anti-patterns.md
        ├── design-tokens.md
        └── style-recipes/
            ├── linear.md
            ├── minimal-editorial.md
            └── modern-saas.md
```

### Files to ADD

```text
src/components/custom/sandbox/
├── sandbox-preview.tsx           ✅ NEW — multi-panel preview (Preview/Terminal/Files tabs)
└── sandbox-sw-registrar.tsx      ✅ NEW — client component registering sandbox-sw.js

src/stores/
└── sandbox-store.ts              ✅ NEW — Zustand store for sandbox state (status, logs, active port)

src/const/system-prompts/
└── vibe-coder.ts                 ✅ NEW — Next.js 16 App Router VIBE_CODER_SYSTEM_PROMPT

src/types/
└── sandbox.ts                    ✅ NEW — VibeCodingFile, SandboxStatus, SandboxConfig types

public/skills/nextjs-vibe-coder/
└── SKILL.md                      ✅ NEW — Next.js 16 App Router skill overlay based on official agent guidelines
```

### Files to MODIFY

```text
next.config.ts                              → Add COOP/COEP headers for SharedArrayBuffer
package.json                                → Add @buddhilive/sandbox + @buddhilive/sandbox-sw dependencies & postinstall SW copy
src/app/layout.tsx                          → Update metadata, mount SandboxServiceWorkerRegistrar
src/app/(buddhi-ai)/layout.tsx              → SidebarProvider defaultOpen={false}, remove DesignerModeToggle
src/app/page.tsx                            → Rewrite landing page for Vibe Coding App
src/const/system-prompt.ts                 → Re-export only VIBE_CODER_SYSTEM_PROMPT
src/lib/code-extractor.ts                  → Multi-file extractor parsing ```[lang] path=[filePath] blocks
src/lib/skills/skill-injector.ts           → Clean up legacy designer mode branching
src/stores/skill-store.ts                  → Simplify: remove isDesignerMode, default nextjs-vibe-coder
src/components/custom/chat/chat-session.tsx → Integrate sandbox, enable reasoning by default, responsive split layout
src/components/custom/chat/chat-input.tsx   → Remove template prompt picker / model selector
public/skills/index.json                   → Register nextjs-vibe-coder skill
```

---

## Phase Breakdown

### Phase 1 — Cleanup & Sandbox Dependencies (P1 Quick Wins)

**Goal**: Remove legacy designer code, install sandbox packages, configure COOP/COEP headers.

**Tasks**:
1. Add COOP/COEP headers to `next.config.ts`:
   ```ts
   async headers() {
     return [
       {
         source: '/:path*',
         headers: [
           { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
           { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
         ],
       },
     ];
   }
   ```
2. Install packages: `pnpm add @buddhilive/sandbox@0.1.0-beta.2 @buddhilive/sandbox-sw@0.1.0-beta.2`.
3. Add `postinstall` script in `package.json` to copy `node_modules/@buddhilive/sandbox-sw/dist/sw.js` to `public/sandbox-sw.js`.
4. Delete legacy designer components in `src/components/custom/designer/`.
5. Delete `src/stores/designer-canvas-store.ts`.
6. Delete `src/const/system-prompts/web-designer.ts` and `src/const/system-prompts/prompt-builder.ts`.
7. Delete `public/skills/web-design-engineer/`.
8. Update `src/app/(buddhi-ai)/layout.tsx`:
   - Set `SidebarProvider defaultOpen={false}`
   - Remove `DesignerModeToggle` and designer workspace conditional imports.
9. Fix any dangling imports across the codebase.

---

### Phase 2 — Next.js Vibe Coder System Prompt, Skill & Extractor

**Goal**: AI reliably generates multi-file Next.js App Router projects, and extractor parses them accurately.

**Tasks**:
10. Create `src/types/sandbox.ts` with `VibeCodingFile` and `SandboxStatus`.
11. Write `src/const/system-prompts/vibe-coder.ts`:
    - Strict output format: ````[lang] path=[relativePath]````
    - Standard Next.js App Router layout: `package.json`, `next.config.js`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`.
    - Server vs Client Component rules (`'use client'` for interactive UI).
    - Compact token budget (≤ 400 tokens).
12. Create `public/skills/nextjs-vibe-coder/SKILL.md`:
    - Official Next.js agent guidelines (`https://nextjs.org/docs/app/guides/ai-agents`).
    - App Router file hierarchy, Server Actions / Route Handlers, SQLite persistence with `better-sqlite3`.
    - Compact token budget (≤ 800 tokens).
13. Update `public/skills/index.json` to register `nextjs-vibe-coder`.
14. Rewrite `src/lib/code-extractor.ts` to parse all code blocks with `path=` attributes into a `VibeCodingFile[]` array, supporting streaming/incomplete blocks.
15. Simplify `src/lib/skills/skill-injector.ts` and `src/stores/skill-store.ts` (remove designer mode, activate `nextjs-vibe-coder` by default).
16. Clean up `src/components/custom/chat/chat-input.tsx` (remove template picker).

---

### Phase 3 — Sandbox Infrastructure & Preview Engine

**Goal**: Instantiating `@buddhilive/sandbox`, writing files to VFS, running Next.js, and displaying the preview.

**Tasks**:
17. Create `src/components/custom/sandbox/sandbox-sw-registrar.tsx`:
    - Registers `/sandbox-sw.js` on mount in browser environment.
    - Mount in `src/app/layout.tsx`.
18. Create `src/stores/sandbox-store.ts`:
    - Tracks `status` (`'idle' | 'booting' | 'running' | 'error'`), `previewUrl`, `activePort`, circular terminal logs (max 1000 lines), and file list.
19. Create `src/components/custom/sandbox/sandbox-preview.tsx`:
    - Tabbed UI: **Preview** (`<iframe>`), **Terminal** (ANSI stdout/stderr log stream), **Files** (VFS tree viewer).
    - Sandbox instance lifecycle:
      ```ts
      const sandbox = await Sandbox.create({ maxMemoryMb: 1024 });
      ```
    - Writing extracted files to VFS:
      ```ts
      for (const file of files) {
        await sandbox.fs.writeFile(`/workspace/${file.path}`, file.content);
      }
      ```
    - Spawning Next.js dev server:
      ```ts
      const proc = await sandbox.process.spawn('next', ['dev', '--port', '3000'], { cwd: '/workspace' });
      ```
    - Capture `port:listen` event -> update store with preview URL `/__preview/3000/`.
    - Handle termination, restarts on code edits, and cleanup on unmount (`sandbox.dispose()`).

---

### Phase 4 — Chat Session Integration & Responsive Layout

**Goal**: Seamless UX with reasoning enabled by default, split layout on desktop, tabs on mobile.

**Tasks**:
20. Update `src/components/custom/chat/chat-session.tsx`:
    - Set initial state: `isReasoningOn = true`.
    - Provide Vibe Coding prompt suggestions (e.g., "Full-stack SaaS dashboard with SQLite todos", "Interactive Markdown note-taker", "Kanban task board").
    - Connect message stream to `extractVibeCodingFiles(content)` and pass extracted files to `SandboxPreview`.
21. Implement responsive layout in `chat-session.tsx`:
    - **Desktop (≥ lg)**: Side-by-side split screen (Chat panel ~420px on left, SandboxPreview flex-1 on right).
    - **Mobile (< lg)**: Tab switcher between Chat and Preview, with a badge indicator when a new build is ready.
22. Add status indicator in header: Active Port pill (e.g. `🟢 Port 3000`), Sandbox state badge, and quick link to open preview in full tab.

---

### Phase 5 — Landing Page, SEO & Final Polish

**Goal**: Modernized brand messaging and SEO tags.

**Tasks**:
23. Rewrite `src/app/page.tsx`:
    - Hero: "Vibe Code Full-Stack Next.js Apps On-Device".
    - Feature highlights: Zero Backend Sandbox, Client-Side Next.js 16, Local Gemma 4 E2B AI, Instant Live Preview, Embedded SQLite.
24. Update SEO metadata in `src/app/layout.tsx`:
    - Title: "Buddhi AI — On-Device Next.js Vibe Coding"
    - Meta description: "Develop and preview full-stack Next.js applications directly in your browser with zero backend."
25. Run validation: typecheck, linting, build test.

---

## Detailed Specifications

### 1. `VIBE_CODER_SYSTEM_PROMPT` (≤ 400 tokens)

```ts
export const VIBE_CODER_SYSTEM_PROMPT = `You are Buddhi Vibe, an elite on-device AI coding partner.
You build complete, interactive Next.js 16 App Router applications.

## Output Format
Always output files with path annotations:
\`\`\`tsx path=app/page.tsx
// code
\`\`\`
Valid paths: package.json, next.config.js, app/layout.tsx, app/page.tsx, app/globals.css, app/api/.../route.ts, components/...

## Project Structure
\`\`\`
/workspace/
  package.json      → { "name": "app", "scripts": { "dev": "next dev" }, "dependencies": { "next": "^16.0.0", "react": "^19.0.0", "react-dom": "^19.0.0" } }
  next.config.js    → module.exports = { reactStrictMode: true };
  app/
    layout.tsx      → RootLayout with <html> and <body>
    page.tsx        → Main page (use 'use client' if using hooks/state)
    globals.css     → Tailwind styling & custom utilities
  components/       → Reusable modular components
\`\`\`

## Rules
1. Produce complete, runnable code for each file. Never truncate with placeholders.
2. For interactive UI (useState, useEffect, event handlers), ALWAYS add 'use client' at the top.
3. Use Tailwind CSS classes for modern, polished, responsive UI (dark mode preferred).
4. For backend data/persistence, create Route Handlers in app/api/.../route.ts. SQLite via 'better-sqlite3' is supported.
5. On modifications, only output the files that changed.
6. Think through the architecture briefly before writing code.`;
```

---

### 2. `nextjs-vibe-coder/SKILL.md` (≤ 800 tokens)

```markdown
---
name: nextjs-vibe-coder
description: "Next.js 16 App Router design principles and best practices for on-device vibe coding."
---

# Next.js 16 Vibe Coder Guidelines

## Server & Client Boundaries
- Default to React Server Components (RSC) for static content and server-side data fetching.
- Add `'use client'` ONLY at the top of components that need client hooks (`useState`, `useEffect`, `useRef`), browser APIs, or event listeners.
- Keep Client Components low in the tree to maximize server-side performance.

## App Router Conventions
- `app/layout.tsx`: Wraps all pages. Must contain `<html>` and `<body>`.
- `app/page.tsx`: Route entry point for `/`.
- `app/api/[...]/route.ts`: API Route Handler exporting `export async function GET(req: Request) { return Response.json(...); }`.

## Modern Next.js 15/16 Practices
- Dynamic APIs (`params`, `searchParams`) in page props are Promises: `const { id } = await params;`.
- Use standard Web APIs (`Request`, `Response`, `fetch`, `Headers`).

## Database & Persistence
- The sandbox includes native `better-sqlite3` shims backed by WebAssembly SQLite.
- In Route Handlers (`app/api/.../route.ts`):
  \`\`\`ts
  import Database from 'better-sqlite3';
  const db = new Database('/workspace/app.db');
  db.exec('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, title TEXT)');
  \`\`\`

## UI & Styling
- Tailwind CSS v4 is available. Use modern tokens (`bg-zinc-900`, `text-zinc-100`, `rounded-xl`, `border-zinc-800`).
- Implement smooth transitions (`transition-all duration-200`), accessible focus rings, and dark glassmorphic surfaces (`backdrop-blur-md bg-zinc-900/80`).
```

---

### 3. File Extractor Engine (`src/lib/code-extractor.ts`)

```ts
export interface VibeCodingFile {
  path: string;
  content: string;
  language: string;
  isComplete: boolean;
}

export function extractVibeCodingFiles(markdown: string): VibeCodingFile[] {
  const filesMap = new Map<string, VibeCodingFile>();
  const codeBlockRegex = /```(\w+)?\s+path=([^\n\r]+)[\r\n]([\s\S]*?)(?:```|$)/g;

  let match: RegExpExecArray | null;
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const language = match[1] || 'plaintext';
    let path = match[2].trim().replace(/^[/\\]+/, '').replace(/^workspace[/\\]+/, '');
    const content = match[3];
    const isComplete = match[0].endsWith('```');

    filesMap.set(path, {
      path,
      content,
      language,
      isComplete,
    });
  }

  return Array.from(filesMap.values());
}
```

---

### 4. Sandbox Lifecycle & Runner Implementation

```ts
// Inside sandbox-preview.tsx
const sandboxRef = useRef<Sandbox | null>(null);
const currentProcRef = useRef<ProcessHandle | null>(null);

const initAndRun = async (files: VibeCodingFile[]) => {
  if (!sandboxRef.current) {
    sandboxRef.current = await Sandbox.create({
      maxMemoryMb: 1024,
      commandTimeoutMs: 60000,
    });
    
    // Listen to virtual port bindings
    sandboxRef.current.ports.on('listen', ({ port, url }) => {
      setPreviewUrl(url);
      setActivePort(port);
      setStatus('running');
    });
  }

  const sb = sandboxRef.current;

  // 1. Write or update files in VirtualFS
  for (const file of files) {
    if (file.isComplete) {
      await sb.fs.writeFile(`/workspace/${file.path}`, file.content);
    }
  }

  // 2. Kill existing running process if code updated
  if (currentProcRef.current) {
    await currentProcRef.current.kill();
    currentProcRef.current = null;
  }

  // 3. Spawn Next.js dev server
  setStatus('booting');
  const proc = await sb.process.spawn('next', ['dev', '--port', '3000'], {
    cwd: '/workspace',
  });
  currentProcRef.current = proc;

  // 4. Pipe stdout/stderr to terminal store
  const reader = proc.stdout.getReader();
  (async () => {
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) appendLog(decoder.decode(value));
    }
  })();
};
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `SharedArrayBuffer` unavailable (missing COOP/COEP headers or unsupported browser) | Medium | High | Add COOP/COEP in `next.config.ts`; display graceful fallback alert if `window.SharedArrayBuffer` is undefined. |
| In-browser Next.js compilation memory exceeds quota | Low | High | Sandbox memory quota is configured to `1024MB` (`maxMemoryMb: 1024`); `esbuild-wasm` is lightweight compared to Node.js SWC binary. |
| Service Worker failed to register or not yet controlling scope | Medium | High | Register early in root layout via `<SandboxServiceWorkerRegistrar />`; await `navigator.serviceWorker.ready` before loading preview iframe. |
| Model hallucinates non-standard paths or incomplete code | Medium | Medium | System prompt enforces explicit `path=` format; file extractor gracefully dedups and handles partial streaming blocks. |
| On-device context window token overflow | High | Medium | Strict token limits: base prompt ≤ 400 tokens, skill overlay ≤ 800 tokens; monitor via `tokenlens`. |

---

## Next Step

Run `/tasks` to generate the step-by-step task breakdown in `tasks.md` and begin implementation.
