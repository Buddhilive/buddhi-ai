---
name: better-auth
description: "BetterAuth authentication guide using Drizzle SQLite adapter for Buddhi AI."
---

# BetterAuth Authentication Guidelines

## Core Principles
- Always pair BetterAuth with the Drizzle SQLite adapter (`drizzleAdapter`).
- Store user accounts and sessions in the local SQLite database.
- Use email/password authentication as the primary offline provider.
- Prohibited: Never use Clerk, NextAuth, Auth.js, or Supabase Auth.

## Server Configuration: `auth.ts`
```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
  }),
  emailAndPassword: {
    enabled: true,
  },
});
```

## Route Handler: `app/api/auth/[...all]/route.ts`
```ts
import { auth } from '@/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

## Client Authentication: `lib/auth-client.ts`
```ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

## Login Component: `components/login-form.tsx`
```tsx
'use client';

import * as React from 'react';
import { signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn.email({ email, password });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto p-4 border rounded-lg">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
```
