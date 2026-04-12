/**
 * buddhi-ai-core/chat-api.ts
 *
 * Custom ChatTransport for the Vercel AI SDK's `useChat` hook.
 *
 * WHY A CUSTOM TRANSPORT?
 * -----------------------
 * By default, `useChat` sends an HTTP POST to an API route and expects
 * a streaming response in the AI SDK's Data Stream Protocol format.
 * A custom `ChatTransport` lets you replace that HTTP layer entirely —
 * you decide where messages go and how the response stream is built.
 *
 * This file contains `StaticChatTransport`: a browser-only, zero-network
 * implementation that streams a hardcoded reply. It is intentionally simple
 * so you can:
 *   1. Verify the `useChat` ↔ transport wiring works end-to-end.
 *   2. Read through the code to understand the chunk lifecycle before
 *      wiring up a real LLM backend.
 *
 * USAGE
 * -----
 *   import { useChat } from '@ai-sdk/react';
 *   import { createStaticChatTransport } from '@/lib/buddhi-ai-core/chat-api';
 *
 *   const { messages, sendMessage, stop } = useChat({
 *     transport: createStaticChatTransport(),
 *   });
 */

import { createUIMessageStream, type ChatTransport, type UIMessage, type UIMessageChunk } from "ai";
import { nanoid } from "nanoid";

// ---------------------------------------------------------------------------
// Static demo responses
// ---------------------------------------------------------------------------

/**
 * A small bank of hardcoded replies used for demo / testing purposes.
 * The transport picks one deterministically based on the user's message
 * length so the response is predictable while still feeling dynamic.
 */
const STATIC_RESPONSES = [
  "Hello! I'm Buddhi AI, running in static demo mode. No network requests are being made — this response is streamed word-by-word entirely inside your browser. Once you wire up a real backend you can swap out this transport for one that calls your API route.",
  "Great question! This is a static placeholder response. The `StaticChatTransport` is designed to help you test the `useChat` hook integration without needing a server. Each word is emitted as a separate `text-delta` chunk with a small delay to simulate real streaming.",
  "I'm a demo assistant. Right now I'm using `createUIMessageStream` from the Vercel AI SDK to produce a `ReadableStream<UIMessageChunk>` directly in the browser. The stream follows the standard chunk lifecycle: start → text-start → text-delta (×N) → text-end → finish.",
  "This message is streamed from `StaticChatTransport.sendMessages()`. Notice how the text appears word by word — that's the `text-delta` chunks being consumed by `useChat` and rendered incrementally. You can click Stop at any time to exercise the abort path.",
  "Custom transports are powerful! You can use them to run an AI agent locally in the browser (via `DirectChatTransport`), proxy requests through a custom auth layer, fan out to multiple models, or — like here — return entirely synthetic responses for testing.",
  "Did you know? The `ChatTransport` interface only requires two methods: `sendMessages` (returns a `ReadableStream<UIMessageChunk>`) and `reconnectToStream` (for resuming interrupted streams — we return `null` here since there's nothing to resume on the client).",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Picks a response from STATIC_RESPONSES deterministically.
 * Using text length mod array length keeps it predictable for debugging
 * while still varying across different inputs.
 */
function pickResponse(userText: string): string {
  const index = userText.length % STATIC_RESPONSES.length;
  return STATIC_RESPONSES[index];
}

/**
 * Extracts the plain text from the last user message in the conversation.
 * UIMessage parts can be text, file, tool-call, etc. We only care about
 * the text part here.
 *
 * Returns a fallback string when no text is found so the transport
 * always has something to reply to.
 */
function getLastUserText(messages: UIMessage[]): string {
  // Walk from the end to find the most recent user turn
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;

    // Each message has a `parts` array. A text part looks like:
    //   { type: 'text', text: '...' }
    for (const part of message.parts) {
      if (part.type === "text" && "text" in part && typeof part.text === "string" && part.text.trim()) {
        return part.text.trim();
      }
    }
  }

  // Fallback — should only happen if the conversation starts empty
  return "hello";
}

/**
 * Returns a Promise that resolves after `ms` milliseconds.
 * Used to simulate per-word streaming delays.
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// StaticChatTransport
// ---------------------------------------------------------------------------

/**
 * A browser-only `ChatTransport` that streams a hardcoded reply.
 *
 * STREAM CHUNK LIFECYCLE
 * ----------------------
 * The AI SDK's `useChat` hook expects a `ReadableStream<UIMessageChunk>`.
 * Each chunk is a discriminated union keyed on `type`. The minimal lifecycle
 * for a single text reply is:
 *
 *   { type: 'start', messageId }          ← opens the assistant message
 *   { type: 'text-start', id }            ← opens a text content block
 *   { type: 'text-delta', id, delta }     ← one piece of streamed text  (×N)
 *   { type: 'text-end',   id }            ← closes the text content block
 *   { type: 'finish', finishReason }      ← closes the assistant message
 *
 * If the user cancels mid-stream an `{ type: 'abort' }` chunk is written
 * instead of continuing, which tells `useChat` to mark the message as
 * stopped.
 *
 * `createUIMessageStream` from `'ai'` handles all the low-level stream
 * plumbing — we just call `writer.write(chunk)` inside the `execute`
 * callback.
 */
export class StaticChatTransport implements ChatTransport<UIMessage> {
  /**
   * Called by `useChat` whenever the user submits a message or requests
   * a regeneration. Must return a `ReadableStream<UIMessageChunk>`.
   *
   * @param options.trigger     - 'submit-message' | 'regenerate-message'
   * @param options.messages    - Full conversation history (UIMessage[])
   * @param options.messageId   - ID of the message to regenerate (if applicable)
   * @param options.abortSignal - AbortSignal wired to the Stop button
   */
  sendMessages({
    trigger,
    messages,
    messageId: regenerateMessageId,
    abortSignal,
  }: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]): Promise<ReadableStream<UIMessageChunk>> {
    // Decide what to say
    const userText = getLastUserText(messages);
    const responseText = pickResponse(userText);

    // Log for educational purposes — remove in production
    console.debug("[StaticChatTransport] sendMessages()", {
      trigger,
      // Show only the last message so logs stay readable
      lastMessage: messages.at(-1),
      regenerateMessageId,
      responseText,
    });

    /**
     * `createUIMessageStream` returns a `ReadableStream<UIMessageChunk>`.
     * It accepts an async `execute` callback that receives a `writer`.
     * Whatever you write to the writer is enqueued into the stream.
     *
     * The `onError` option converts any uncaught exception into an error
     * chunk so `useChat` can surface it gracefully instead of crashing.
     */
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // ── 1. Open the assistant message ──────────────────────────────────
        //
        // The 'start' chunk tells useChat to create a new assistant message
        // entry. `messageId` is optional but including it makes the message
        // easier to identify when debugging or implementing optimistic updates.
        const assistantMessageId = nanoid();
        writer.write({ type: "start", messageId: assistantMessageId });

        // ── 2. Open a text content block ────────────────────────────────────
        //
        // An assistant message can contain multiple content blocks (text,
        // tool-call, reasoning, etc.). Each block has its own `id` that
        // pairs the *-start / *-delta / *-end chunks together.
        const textPartId = nanoid();
        writer.write({ type: "text-start", id: textPartId });

        // ── 3. Stream the response word by word ─────────────────────────────
        //
        // Real transports read chunks from an LLM stream here. We simulate
        // that with a simple split + delay loop.
        const words = responseText.split(" ");

        for (let i = 0; i < words.length; i++) {
          // ── Abort check ────────────────────────────────────────────────
          // The user pressed Stop. Write an 'abort' chunk and bail out.
          // `useChat` will mark the in-progress message as stopped.
          if (abortSignal?.aborted) {
            writer.write({
              type: "abort",
              reason: "User stopped the generation.",
            });
            return; // Exit the execute callback — the stream closes cleanly
          }

          // Simulate per-token network latency (30–80 ms per word)
          await delay(Math.random() * 50 + 30);

          // The 'text-delta' chunk carries one incremental piece of text.
          // `id` must match the `text-start` id so the SDK can assemble
          // the full text in order.
          // Add a space before each word except the first.
          const wordWithSpace = i === 0 ? words[i] : ` ${words[i]}`;
          writer.write({ type: "text-delta", id: textPartId, delta: wordWithSpace });
        }

        // ── 4. Close the text content block ────────────────────────────────
        writer.write({ type: "text-end", id: textPartId });

        // ── 5. Close the assistant message ─────────────────────────────────
        //
        // 'finishReason' mirrors the values used by real LLMs:
        //   'stop'           - natural end of response
        //   'length'         - hit max token limit
        //   'content-filter' - blocked by safety system
        //   'tool-calls'     - stopped to execute tools
        writer.write({ type: "finish", finishReason: "stop" });
      },

      /**
       * `onError` is called if anything inside `execute` throws.
       * Return a human-readable string — `useChat` will expose it as
       * the `error` state so your UI can display a friendly message.
       */
      onError: (error: unknown): string => {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error("[StaticChatTransport] Stream error:", error);
        return `StaticChatTransport encountered an error: ${message}`;
      },
    });

    // `createUIMessageStream` is synchronous — it returns a ReadableStream
    // immediately. We wrap it in a resolved Promise to satisfy the interface.
    return Promise.resolve(stream);
  }

  /**
   * Called by `useChat` when it wants to resume an interrupted stream
   * (e.g. after a page reload mid-generation, or a network reconnect).
   *
   * Client-only transports have no server-side stream to reconnect to,
   * so we return `null`. The SDK handles `null` gracefully — it simply
   * won't attempt to replay any pending chunks.
   */
  reconnectToStream(
    _options: Parameters<ChatTransport<UIMessage>["reconnectToStream"]>[0]
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    // Nothing to reconnect to — we have no persistent server state.
    return Promise.resolve(null);
  }
}

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

/**
 * Convenience factory so callers don't need `new`:
 *
 *   useChat({ transport: createStaticChatTransport() })
 *
 * Equivalent to `new StaticChatTransport()`. Useful when you later want
 * to accept configuration options without changing the call sites.
 */
export function createStaticChatTransport(): StaticChatTransport {
  return new StaticChatTransport();
}
