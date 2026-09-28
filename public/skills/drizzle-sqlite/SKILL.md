---
name: drizzle-sqlite
description: "Drizzle ORM and SQLite WASM persistence guidelines for Next.js in Buddhi AI."
---

# Drizzle ORM + SQLite WASM Guidelines

## Core Principles
- Always use `@libsql/client/wasm` (or `@libsql/client`) for zero-server client-side SQLite.
- Database connection string is `file:sqlite.db` (or `process.env.DATABASE_URL`).
- All queries through `@libsql/client` are asynchronous: always `await db.select()...`.
- Prohibited: Never use Prisma, TypeORM, or native `better-sqlite3`.

## Configuration: `drizzle.config.ts`
```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:sqlite.db',
  },
});
```

## Schema: `db/schema.ts`
```ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

## Client: `db/index.ts`
```ts
import { createClient } from '@libsql/client/wasm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const client = createClient({
  url: process.env.DATABASE_URL || 'file:sqlite.db',
});

export const db = drizzle(client, { schema });
```

## API Route Handler: `app/api/tasks/route.ts`
```ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const allTasks = await db.select().from(tasks);
  return NextResponse.json({ tasks: allTasks });
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = crypto.randomUUID();
  await db.insert(tasks).values({
    id,
    title: body.title,
    completed: false,
  });
  return NextResponse.json({ id, status: 'created' });
}
```
