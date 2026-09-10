---
name: nextjs-vibe-coder
description: "Next.js 16 App Router design principles and best practices for on-device vibe coding."
---

# Next.js 16 Vibe Coder Guidelines

## Server & Client Boundaries
- Default to React Server Components (RSC) for static content, server data fetching, and layouts.
- Add `'use client'` ONLY at the top of components requiring client hooks (`useState`, `useEffect`, `useRef`, `useCallback`), browser APIs, or interactive event listeners (`onClick`, `onChange`).
- Keep Client Components small and leaf-level in the component hierarchy.

## App Router Structure
- `package.json`: Dependencies on `"next": "^16.0.0"`, `"react": "^19.0.0"`, `"react-dom": "^19.0.0"`.
- `next.config.js`: `module.exports = { reactStrictMode: true };`.
- `app/layout.tsx`: RootLayout wrapping all views. Must contain `<html>` and `<body>`.
- `app/page.tsx`: Main route entry point for `/`.
- `app/globals.css`: Tailwind directives and theme variables.
- `app/api/[...]/route.ts`: API Route Handlers exporting HTTP verbs (`export async function GET(request: Request) { return Response.json(...); }`).

## Modern Next.js 15/16 Conventions
- Dynamic route APIs: `params` and `searchParams` in page props are Promises: `const { id } = await params;`.
- Use standard Web APIs (`Request`, `Response`, `Headers`, `fetch`).

## SQLite & Persistence
- The sandbox includes native `better-sqlite3` shims backed by WebAssembly SQLite.
- In Route Handlers (`app/api/.../route.ts`):
```ts
import Database from 'better-sqlite3';
const db = new Database('/workspace/app.db');
db.exec('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, done INTEGER DEFAULT 0)');
```

## UI & Styling
- Use Tailwind CSS modern dark tokens (`bg-zinc-950`, `text-zinc-100`, `border-zinc-800`, `rounded-xl`).
- Add glassmorphism (`backdrop-blur-md bg-zinc-900/80`), subtle hover effects, and clean typography.
- Ensure accessible focus rings and mobile-friendly touch targets.
