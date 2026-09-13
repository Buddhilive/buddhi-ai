---
name: nextjs-vibe-coder
description: "Next.js 16 App Router design principles and canonical opinionated stack for on-device vibe coding."
---

# Next.js 16 Vibe Coder Guidelines

## Approved Canonical Stack (Strict)
- **Framework**: Next.js 16 App Router (RSC + Client Components)
- **Styling**: TailwindCSS v4 (`@import "tailwindcss"`, `@theme` blocks)
- **Components**: Shadcn UI (`components/ui/`, `@radix-ui/*`, `lucide-react`, `lib/utils.ts`)
- **AI UI**: AI Elements (`ai-elements` npm package: `Thread`, `Message`, `MarkdownText`)
- **State**: Zustand v5 (`create()` hooks in `store/`)
- **Database & ORM**: Drizzle ORM (`drizzle-orm`) with SQLite WASM (`@libsql/client/wasm` or `@libsql/client`)
- **Authentication**: BetterAuth (`better-auth` with Drizzle SQLite adapter)
- **AI Streaming**: Vercel AI SDK v6 (`ai`, `@ai-sdk/openai`, `streamText`, `useChat`)

PROHIBITED: Never use Prisma, Clerk, NextAuth, Redux, or native `better-sqlite3`.

## Server & Client Boundaries
- Default to React Server Components (RSC) for static content, server data fetching, and layouts.
- Add `'use client'` ONLY at the top of components requiring client hooks (`useState`, `useEffect`, `useRef`, `useCallback`, Zustand store hooks), browser APIs, or interactive event listeners (`onClick`, `onChange`).
- Keep Client Components small and leaf-level in the component hierarchy.

## SQLite Persistence with Drizzle ORM
In `db/schema.ts`:
```ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

In `db/index.ts`:
```ts
import { createClient } from '@libsql/client/wasm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const client = createClient({ url: process.env.DATABASE_URL || 'file:sqlite.db' });
export const db = drizzle(client, { schema });
```

In API Route Handlers (`app/api/items/route.ts`):
```ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { items } from '@/db/schema';

export async function GET() {
  const allItems = await db.select().from(items);
  return NextResponse.json({ items: allItems });
}
```

## Authentication with BetterAuth
In `auth.ts`:
```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite' }),
  emailAndPassword: { enabled: true },
});
```

In `app/api/auth/[...all]/route.ts`:
```ts
import { auth } from '@/auth';
import { toNextJsHandler } from 'better-auth/next-js';
export const { GET, POST } = toNextJsHandler(auth);
```

## State Management with Zustand v5
In `store/use-app-store.ts`:
```ts
import { create } from 'zustand';

interface State {
  count: number;
  increment: () => void;
}

export const useAppStore = create<State>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));
```

## AI Streaming with Vercel AI SDK & AI Elements
In `app/api/chat/route.ts`:
```ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages,
  });
  return result.toDataStreamResponse();
}
```

In Client UI (`app/components/chat.tsx`):
```tsx
'use client';
import { useChat } from 'ai/react';
import { Thread, Message, MarkdownText } from 'ai-elements';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({ api: '/api/chat' });
  return (
    <div className="flex flex-col h-96 border rounded-lg p-4">
      <Thread>
        {messages.map((m) => (
          <Message key={m.id} role={m.role}>
            <MarkdownText content={m.content} />
          </Message>
        ))}
      </Thread>
    </div>
  );
}
```
