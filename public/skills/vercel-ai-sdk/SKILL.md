---
name: vercel-ai-sdk
description: "Vercel AI SDK v6 streaming and generative UI integration for Buddhi AI."
---

# Vercel AI SDK v6 Guidelines

## Core Principles
- Always use `streamText` from `ai` for real-time text and structured output streaming.
- Use `toDataStreamResponse()` in Next.js App Router Route Handlers.
- In client components, use `useChat` from `ai/react` or pair with `ai-elements`.
- Prohibited: Never use raw OpenAI client streaming without AI SDK wrappers or LangChain.

## Streaming Route Handler: `app/api/chat/route.ts`
```ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages,
    system: 'You are an expert AI assistant assisting in a Next.js application.',
  });

  return result.toDataStreamResponse();
}
```

## Client Chat Hook: `components/chat-box.tsx`
```tsx
'use client';

import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ChatBox() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="flex flex-col h-96 border rounded-lg p-4 bg-background">
      <div className="flex-1 overflow-y-auto space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span className="inline-block p-2 rounded bg-muted text-sm">{m.content}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <Input value={input} onChange={handleInputChange} placeholder="Type a message..." />
        <Button type="submit" disabled={isLoading}>Send</Button>
      </form>
    </div>
  );
}
```
