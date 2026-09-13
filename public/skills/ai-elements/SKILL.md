---
name: ai-elements
description: "Vercel AI Elements UI component primitives for streaming chat in Buddhi AI."
---

# AI Elements UI Guidelines

## Core Principles
- The published npm package is `ai-elements` (never import from `@vercel/ai-elements`).
- Core primitives: `Thread` (container), `Message` (message item with avatar), `MarkdownText` (streaming-safe markdown), `Loader` (loading indicator).
- Connect seamlessly to `useChat()` from `ai/react`.

## Conversational Panel: `components/ai-chat-panel.tsx`
```tsx
'use client';

import * as React from 'react';
import { useChat } from 'ai/react';
import { Thread, Message, MarkdownText, Loader } from 'ai-elements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User } from 'lucide-react';

export function AIChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="flex flex-col h-[550px] w-full max-w-xl mx-auto border rounded-xl overflow-hidden bg-background">
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
        <Bot className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">AI Assistant</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Thread>
          {messages.map((m) => (
            <Message
              key={m.id}
              role={m.role}
              avatar={m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            >
              <MarkdownText content={m.content} />
            </Message>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
        </Thread>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t">
        <Input
          placeholder="Ask a question..."
          value={input}
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
```
