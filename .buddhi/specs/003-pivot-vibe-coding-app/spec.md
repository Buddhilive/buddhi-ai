# Feature 003: Pivot to Vibe Coding App

**Branch:** `003-pivot-vibe-coding-app`
**Created:** 2026-09-10
**Status:** Draft

---

## Overview

Pivot the current "AI Powered Web Designer" concept to a **Vibe Coding App** — a conversational coding environment where users describe what they want in plain language and the on-device AI generates, scaffolds, and iteratively develops a complete **Next.js-style application** that runs live in the browser via the `@buddhilive/sandbox` client-side sandbox.

### Background

The current app is optimized for single-file HTML/CSS UI generation with a canvas preview. The pivot:
- **Out**: Web Designer canvas (HTML iframe preview), Prompt Template/Builder feature, Designer Mode toggle.
- **In**: Full Next.js project generation, `@buddhilive/sandbox` live preview (Node.js + npm install in WebAssembly), a single-mode vibe coding workflow.

The core infrastructure (on-device LiteRT/Gemma model, `useChat` transport, skill system, chat history, sidebar) is **retained** and repurposed.

**Sandbox Approach Note**: The `@buddhilive/sandbox` runs Node.js via QuickJS WebAssembly — not full V8. This means `next dev` CLI cannot run directly. Instead, the AI generates a lightweight Node.js HTTP server + React app (CDN-loaded) that the sandbox previews via `/__preview/:port/`. The user still sees a live, interactive "Next.js-style" React app — the structural difference is at the build tooling layer only.

---

## User Stories & Priorities

### P1 — Core Vibe Coding Loop (MVP)

**Story 1.1: Natural Language to Running App**

> As a developer, I type a plain-English description and see a running React/Node web app in a live preview panel within the chat session.

**Given / When / Then:**
- *Given* the model is loaded and reasoning is ON,
- *When* user submits a vibe prompt (e.g. "Build a task manager app with dark theme"),
- *Then* the AI generates a multi-file project, the sandbox boots it, and the preview iframe shows the running app at `/__preview/3000/` within ≤ 60 seconds.

---

**Story 1.2: Iterative Refinement**

> As a developer, I can follow up in natural language to add features or fix the running app.

**Given / When / Then:**
- *Given* an existing running app in the sandbox,
- *When* user sends a follow-up instruction,
- *Then* the AI emits updated file content, sandbox applies them, preview reloads — within ≤ 20 seconds.

---

**Story 1.3: Reasoning ON by Default**

> As a user, reasoning mode is enabled by default on every new chat session.

**Given / When / Then:**
- *Given* a new chat session,
- *When* the ChatSession component mounts,
- *Then* `isReasoningOn` state is initialized as `true`.

---

**Story 1.4: Sidebar Collapsed by Default**

> As a user, the sidebar is collapsed on first load to maximize workspace.

**Given / When / Then:**
- *Given* the user navigates to `/chat`,
- *When* the layout renders,
- *Then* `SidebarProvider` opens with `defaultOpen={false}`.

---

### P2 — Sandbox Integration & Live Preview

**Story 2.1: Live Preview Panel (replaces Designer Canvas)**

> As a developer, I see a live preview of my running app in a right-side panel alongside the chat.

**Given / When / Then:**
- *Given* the AI has generated and the sandbox has started the app server,
- *When* `sandbox.ports.on('listen')` fires with port 3000,
- *Then* the preview iframe points to `/__preview/3000/`.

---

**Story 2.2: File Tree Visibility**

> As a developer, I can browse the generated project's files from the preview panel.

**Given / When / Then:**
- *Given* files are written to `/workspace/` in the sandbox VFS,
- *When* the user opens the file tree tab,
- *Then* `sandbox.fs.readdir` is used to render the directory tree.

---

**Story 2.3: Terminal Output**

> As a developer, I can see stdout/stderr from the running sandbox process to debug errors.

**Given / When / Then:**
- *Given* a sandbox process is running,
- *When* the terminal tab is active,
- *Then* stdout/stderr streams in real time.

---

### P3 — Skill System, System Prompt & Landing Page

**Story 3.1: Next.js Vibe Coder Skill**

> As an AI system, I have a `nextjs-vibe-coder` skill loaded into my system prompt that encodes Next.js App Router conventions and sandbox-safe server patterns.

**Given / When / Then:**
- *Given* `public/skills/nextjs-vibe-coder/SKILL.md` exists and is in `index.json`,
- *When* the skill is activated,
- *Then* the corePrompt is injected into the composed system prompt.

---

**Story 3.2: Vibe Coding System Prompt**

> As an AI, my system prompt is fully rewritten for vibe coding — generating complete, multi-file Node.js app bundles.

**Given / When / Then:**
- *Given* any chat session opens,
- *When* the system prompt is composed,
- *Then* `VIBE_CODER_SYSTEM_PROMPT` is the active base (no web designer / prompt builder prompts).

---

**Story 3.3: Landing Page Updated**

> As a visitor, the homepage reflects the Vibe Coding App concept.

**Given / When / Then:**
- *Given* user visits `/`,
- *When* the page loads,
- *Then* hero, features, and how-it-works sections communicate vibe coding (not web design / prompt templates).

---

**Story 3.4: Fully Responsive UI**

> As a user on any device, the UI scales correctly.

**Given / When / Then:**
- *Given* viewport is 375px, 768px, or 1440px,
- *When* the `/chat` page loads,
- *Then* the split-pane adapts: mobile shows stacked/tabbed view, tablet/desktop shows side-by-side.

---

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Remove Prompt Builder feature: system prompt, UI selector, models list entry | P1 |
| FR-002 | Remove `DesignerModeToggle` from layout header | P1 |
| FR-003 | Remove `designer-canvas-store.ts`; add `sandbox-store.ts` | P1 |
| FR-004 | Replace `DesignerCanvas` with `SandboxPreview` component using `@buddhilive/sandbox` | P2 |
| FR-005 | `SandboxPreview` manages full lifecycle: create, write files, spawn process, listen on port, dispose | P2 |
| FR-006 | Register `@buddhilive/sandbox` Service Worker at app startup for `/__preview/:port/` intercept | P2 |
| FR-007 | Add `@buddhilive/sandbox` to `package.json` | P2 |
| FR-008 | Parse AI output for multi-file format: fenced blocks with `path=` annotation → write each to sandbox VFS | P1 |
| FR-009 | Add `VIBE_CODER_SYSTEM_PROMPT` in `src/const/system-prompts/vibe-coder.ts` | P1 |
| FR-010 | Update `src/const/system-prompt.ts` to export only vibe coder prompt | P1 |
| FR-011 | Delete `web-designer.ts` and `prompt-builder.ts` system prompt files | P1 |
| FR-012 | Initialize `isReasoningOn = true` in `chat-session.tsx` | P1 |
| FR-013 | Pass `defaultOpen={false}` to `SidebarProvider` in layout | P1 |
| FR-014 | Create `public/skills/nextjs-vibe-coder/SKILL.md` | P3 |
| FR-015 | Update `public/skills/index.json` to reference `nextjs-vibe-coder` | P3 |
| FR-016 | Update `skill-store.ts` to default-activate `nextjs-vibe-coder` skill | P3 |
| FR-017 | Update chat suggestions to vibe coding examples | P1 |
| FR-018 | Rewrite `src/app/page.tsx` landing page for Vibe Coding concept | P3 |
| FR-019 | Responsive split-pane: mobile stack/tab, desktop side-by-side | P1 |
| FR-020 | Terminal tab in `SandboxPreview` showing live stdout/stderr | P2 |
| FR-021 | File tree tab in `SandboxPreview` using `sandbox.fs.readdir` | P2 |
| FR-022 | Remove `components/custom/designer/` directory | P1 |
| FR-023 | Update `lib/code-extractor.ts` to parse multi-file `path=` annotated code blocks | P1 |
| FR-024 | Add `sandbox-store.ts`: `{ status, previewUrl, activePort, logs }` Zustand store | P2 |
| FR-025 | Add COOP/COEP headers in `next.config.ts` for SharedArrayBuffer support | P2 |

---

## Key Entities

| Entity | Description |
|--------|-------------|
| `Sandbox` | `@buddhilive/sandbox` singleton per chat session |
| `SandboxStatus` | `'idle' \| 'booting' \| 'running' \| 'error'` |
| `VibeCodingFile` | `{ path: string; content: string }` extracted from AI output |
| `SandboxStore` | Zustand: `{ status, previewUrl, activePort, logs }` |

---

## Success Criteria

| ID | Criterion |
|----|-----------|
| SC-001 | Vibe prompt → running, interactive web app in preview within 60 seconds |
| SC-002 | Prompt Builder is completely removed from UI and codebase |
| SC-003 | Reasoning is ON by default every new session |
| SC-004 | Sidebar is collapsed by default |
| SC-005 | UI renders correctly at 375px, 768px, 1440px |
| SC-006 | Iterative follow-ups update the running app without session reset |
| SC-007 | Landing page clearly communicates Vibe Coding concept |
| SC-008 | `nextjs-vibe-coder` skill is loaded and AI uses Next.js App Router conventions |

---

## Architecture Notes

### COOP/COEP Headers (Required for SharedArrayBuffer)

```ts
// next.config.ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
    ]
  }];
}
```

### AI Output Format Convention

The system prompt instructs the model to output files as:

```tsx path=src/app/page.tsx
// content here
```

`lib/code-extractor.ts` parses these into `VibeCodingFile[]`.

### Generated App Structure (Sandbox-Safe)

```
/workspace/
  package.json      { "start": "node server.js", "dependencies": { "express": "^4" } }
  server.js         express server on port 3000, serves static + API routes
  public/
    index.html      React app with CDN React/ReactDOM + Babel standalone
  src/
    App.jsx         main React component tree
    components/     sub-components
```

### Sandbox Lifecycle (in `SandboxPreview` component)

```ts
const sandbox = await Sandbox.create();
// Write files from VibeCodingFile[]
for (const file of files) {
  await sandbox.fs.mkdir(dirname(file.path), { recursive: true });
  await sandbox.fs.writeFile(file.path, file.content);
}
// Listen for port
sandbox.ports.on('listen', ({ port, url }) => {
  setSandboxStore({ status: 'running', previewUrl: url, activePort: port });
});
// Start process
const proc = await sandbox.process.spawn('node', ['/workspace/server.js']);
```

---

## Edge Cases

- **SharedArrayBuffer unavailable**: Show error banner, disable preview panel.
- **npm install failure**: Surface in terminal tab with clear message.
- **Port conflict from previous session**: Call `sandbox.dispose()` before creating a new instance.
- **Mobile preview**: Use tab-based UI (Chat / Preview) on mobile viewports.
- **Service Worker registration failure**: Toast warning, preview may not work.

---

## Out of Scope

- Running actual `next dev` CLI in sandbox (QuickJS limitation)
- Authentication / user accounts
- Persistent sandbox file state across sessions
- GitHub integration / code export
- Multi-sandbox support

---

## Next Steps

Run `/plan` to proceed to architecture and implementation planning.
