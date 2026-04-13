/**
 * buddhi-ai-core/chat-api.ts
 *
 * Implements a custom `ChatTransport` for the Vercel AI SDK's `useChat` hook
 * that drives inference entirely in the browser via MediaPipe's LiteRT runtime
 * — no network requests, no API keys required.
 *
 * HOW IT FITS TOGETHER
 * --------------------
 *  useChat({ transport })
 *    └─ MediaPipeChatTransport.sendMessages()
 *         ├─ Converts UIMessage[] → BuddhiAIMessage[]
 *         ├─ Prepends the system prompt
 *         ├─ Calls generateChatTemplate() to build the Gemma prompt
 *         └─ Streams tokens from LlmInference.generateResponse()
 *              └─ createUIMessageStream writes UIMessageChunks back to useChat
 *
 * CHUNK LIFECYCLE (what useChat expects)
 * --------------------------------------
 *  { type: 'start',      messageId }       ← opens assistant message
 *  { type: 'text-start', id }              ← opens a text content block
 *  { type: 'text-delta', id, delta }  ×N   ← one token / word at a time
 *  { type: 'text-end',   id }              ← closes the text content block
 *  { type: 'finish',     finishReason }    ← closes the assistant message
 *    — or —
 *  { type: 'abort' }                       ← user pressed Stop
 */

import { SYSTEM_PROMPT } from "@/const/system-prompt";
import { generateChatTemplate } from "@/lib/buddhi-ai-core/chat-template-generator";
import type { BuddhiAIMessage } from "@/types/messages";
import type { LlmInference } from "@mediapipe/tasks-genai";
import {
    createUIMessageStream,
    type ChatTransport,
    type UIMessage,
    type UIMessageChunk,
} from "ai";
import { nanoid } from "nanoid";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts the Vercel AI SDK's `UIMessage[]` into the internal
 * `BuddhiAIMessage[]` format expected by `generateChatTemplate`.
 *
 * Only `text` parts are extracted — file/tool/reasoning parts are not yet
 * supported by the LiteRT transport and are silently dropped.
 */
function uiMessagesToBuddhiMessages(messages: UIMessage[]): BuddhiAIMessage[] {
    return messages.map((msg) => {
        // UIMessage.parts is a discriminated union. We collect all text parts
        // into a single string; multi-part messages are joined with newlines.
        const textContent = msg.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("\n");

        return {
            // BuddhiAIChatRole is 'user' | 'assistant' | 'system'
            role: msg.role as BuddhiAIMessage["role"],
            content: textContent,
        };
    });
}

// ---------------------------------------------------------------------------
// MediaPipeChatTransport
// ---------------------------------------------------------------------------

/**
 * A `ChatTransport` that runs LLM inference directly in the browser using
 * MediaPipe's `LlmInference` runtime (LiteRT / WebGPU).
 *
 * Pass a ready `LlmInference` instance to the constructor. The instance is
 * obtained by calling `LlmInference.createFromOptions()` in `useModelEngine`.
 * It is stored in `useLiteRTModelStore` once initialised.
 *
 * @example
 * ```tsx
 * const transport = useMemo(
 *   () => new MediaPipeChatTransport(liteRTModelInstance),
 *   [liteRTModelInstance]
 * );
 * const { messages, sendMessage, stop, status } = useChat({ transport });
 * ```
 */
export class MediaPipeChatTransport implements ChatTransport<UIMessage> {
    constructor(private readonly llm: LlmInference) {}

    /**
     * Called by `useChat` whenever the user submits a message or requests a
     * regeneration. Returns a `ReadableStream<UIMessageChunk>` that the hook
     * consumes to update the message list reactively.
     *
     * @param options.messages    - Full conversation history (UIMessage[])
     * @param options.trigger     - 'submit-message' | 'regenerate-message'
     * @param options.abortSignal - Wired to the Stop button by useChat
     */
    sendMessages({
        messages,
        abortSignal,
    }: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]): Promise<
        ReadableStream<UIMessageChunk>
    > {
        const stream = createUIMessageStream({
            execute: async ({ writer }) => {
                // ── Early abort check ─────────────────────────────────────────
                // If the user already cancelled before we started (race condition),
                // bail out immediately without calling the LLM.
                if (abortSignal?.aborted) {
                    writer.write({
                        type: "abort",
                        reason: "Request was aborted before generation started.",
                    });
                    return;
                }

                // ── Build the prompt ──────────────────────────────────────────
                // Gemma instruction-tuned models only understand `user` and
                // `model` roles — there is no `system` turn in their training
                // format. The canonical way to inject a system prompt is to
                // prepend it to the first `<start_of_turn>user` turn.
                //
                // We therefore embed SYSTEM_PROMPT directly into the content of
                // the first user message rather than prepending a separate
                // { role: "system" } entry. Passing a system role would produce
                // `<start_of_turn>system` in the Gemma template, which the model
                // has never seen and responds to with incoherent output.
                const converted = uiMessagesToBuddhiMessages(messages);
                const buddhiMessages: BuddhiAIMessage[] =
                    converted.length > 0 && converted[0].role === "user"
                        ? [
                              {
                                  ...converted[0],
                                  content: `${SYSTEM_PROMPT}\n\n${converted[0].content}`,
                              },
                              ...converted.slice(1),
                          ]
                        : converted;

                let prompt: Awaited<ReturnType<typeof generateChatTemplate>>;
                try {
                    prompt = await generateChatTemplate(buddhiMessages);
                } catch (err) {
                    // Template generation itself can throw for malformed input
                    // (e.g. assistant message as first turn). Surface the error
                    // as a readable string rather than a raw exception.
                    const msg =
                        err instanceof Error ? err.message : String(err);
                    throw new Error(
                        `Failed to build chat template: ${msg}. ` +
                            "Check that the conversation history is valid."
                    );
                }

                // Post-template abort check (template generation is async and
                // can take a few ms, so the user may have cancelled by now).
                if (abortSignal?.aborted) {
                    writer.write({
                        type: "abort",
                        reason: "Request was aborted before generation started.",
                    });
                    return;
                }

                // ── Open the assistant message & text block ───────────────────
                // The 'start' chunk tells useChat to create a new assistant
                // message entry; 'text-start' opens a text content block inside it.
                const messageId = nanoid();
                const textPartId = nanoid();
                writer.write({ type: "start", messageId });
                writer.write({ type: "text-start", id: textPartId });

                // ── Stream tokens from the LLM ────────────────────────────────
                // LlmInference.generateResponse(prompt, progressListener)
                //   • Returns Promise<string> — the full final response.
                //   • progressListener is called with incremental (delta) text
                //     and a `done` flag on each new token batch.
                //
                // MediaPipe's `partialResult` is incremental — each callback
                // receives only the newly generated tokens, not the full
                // response so far. We forward it directly as the text-delta.
                let settled = false; // guards against writing after abort/done

                try {
                    await this.llm.generateResponse(
                        prompt,
                        (partialResult: string, done: boolean) => {
                            // Ignore callbacks that fire after we've already
                            // resolved (can happen if MediaPipe keeps calling
                            // after `done === true`).
                            if (settled) return;

                            // ── Abort mid-stream ──────────────────────────────
                            // We cannot cancel MediaPipe generation once it has
                            // started — the WASM runtime has no cancel API.
                            // What we can do is stop forwarding tokens to the
                            // UI stream. The user sees generation stop immediately
                            // and the underlying computation finishes silently.
                            if (abortSignal?.aborted) {
                                writer.write({
                                    type: "abort",
                                    reason: "User stopped generation.",
                                });
                                settled = true;
                                return;
                            }

                            // ── Forward the delta ─────────────────────────────
                            // `partialResult` is the incremental text for this
                            // callback only — forward it directly as a text-delta.
                            if (partialResult) {
                                writer.write({
                                    type: "text-delta",
                                    id: textPartId,
                                    delta: partialResult,
                                });
                            }

                            // ── Generation complete ───────────────────────────
                            if (done) {
                                writer.write({ type: "text-end", id: textPartId });
                                writer.write({
                                    type: "finish",
                                    finishReason: "stop",
                                });
                                settled = true;
                            }
                        }
                    );
                } catch (err) {
                    // LlmInference.generateResponse threw (e.g. WASM crash,
                    // out-of-memory, malformed prompt). Re-throw so that the
                    // `onError` handler below converts it to a readable message.
                    const msg = err instanceof Error ? err.message : String(err);
                    throw new Error(
                        `MediaPipe LLM inference failed: ${msg}. ` +
                            "Try reloading the page or reducing the conversation length."
                    );
                }

                // ── Safety net ────────────────────────────────────────────────
                // In the unlikely event that generateResponse resolved without
                // the progress listener ever firing `done === true`, close the
                // stream cleanly so useChat doesn't hang.
                if (!settled) {
                    console.warn(
                        "[MediaPipeChatTransport] generateResponse resolved " +
                            "without a `done` callback. Closing stream manually."
                    );
                    writer.write({ type: "text-end", id: textPartId });
                    writer.write({ type: "finish", finishReason: "stop" });
                }
            },

            /**
             * Converts any uncaught error inside `execute` into a human-readable
             * string. `useChat` surfaces this via its `error` state so the UI
             * can display a helpful message instead of crashing.
             */
            onError: (error: unknown): string => {
                const message =
                    error instanceof Error ? error.message : String(error);
                console.error("[MediaPipeChatTransport] Stream error:", error);
                return message;
            },
        });

        // createUIMessageStream returns a ReadableStream synchronously.
        // Wrap it in a resolved Promise to satisfy the ChatTransport interface.
        return Promise.resolve(stream);
    }

    /**
     * Called by `useChat` to resume an interrupted stream (e.g. after a page
     * reload mid-generation). Client-only transports have no server-side
     * stream to reconnect to, so we return `null`. The SDK handles this
     * gracefully — it simply won't attempt to replay any pending chunks.
     */
    reconnectToStream(
        _options: Parameters<ChatTransport<UIMessage>["reconnectToStream"]>[0]
    ): Promise<ReadableStream<UIMessageChunk> | null> {
        return Promise.resolve(null);
    }
}
