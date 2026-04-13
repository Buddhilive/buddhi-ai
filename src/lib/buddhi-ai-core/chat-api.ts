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
 * Returns true when `line` (the first line of a response) is a code-fence
 * opening that signals the model is wrapping plain prose in backticks rather
 * than actual code.
 *
 * We treat a fence as "plain-text" when it has no language tag at all, or
 * when the tag is one of the well-known prose pseudo-languages:
 *   text | plaintext | plain | markdown | md
 *
 * Language-tagged fences like ```python or ```ts are left untouched so that
 * real code blocks continue to render with syntax highlighting.
 */
function isPlainTextCodeFence(line: string): boolean {
    const match = line.match(/^```(\w*)$/);
    if (!match) return false;
    const lang = match[1].toLowerCase();
    return (
        lang === "" ||
        lang === "text" ||
        lang === "plaintext" ||
        lang === "plain" ||
        lang === "markdown" ||
        lang === "md"
    );
}

/**
 * Removes the outer triple-backtick fence from a fully-buffered response,
 * returning only the inner content.
 *
 * Handles both forms:
 *   ```\ncontent\n```          (no language tag)
 *   ```plaintext\ncontent\n``` (plain-text language tag)
 *
 * Always safe to call — if the pattern doesn't match the input is returned
 * unchanged.
 */
function stripOuterCodeFence(text: string): string {
    return text
        .replace(/^```[\w]*\n/, "") // strip opening fence + optional language tag
        .replace(/\n```\s*$/, "");  // strip closing fence + optional trailing whitespace
}

/**
 * Strips Gemma model template tokens that may appear verbatim at the end of
 * a generated response.  Gemma 4 uses `<turn|>` and Gemma 3n uses
 * `<end_of_turn>` as turn-closing markers; if the runtime doesn't intercept
 * them as stop tokens they bleed into the user-visible text.
 */
function stripTrailingTemplateTokens(text: string): string {
    return text
        .replace(/<turn\|>\s*$/, "")
        .replace(/<end_of_turn>\s*$/, "")
        .trimEnd();
}

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
                //   • progressListener receives incremental (delta) text and a
                //     `done` flag on each new token batch.
                //
                // POST-PROCESSING PIPELINE
                // ------------------------
                // Two issues are corrected before text reaches the UI:
                //
                // 1. Plain-text code-fence wrapping
                //    Gemma occasionally wraps an entire prose answer in a fence
                //    like ```\n…\n``` or ```plaintext\n…\n```. Streamdown renders
                //    that as a code block, making plain text look like source code.
                //    Detection strategy (two triggers so streaming isn't delayed):
                //      a) If ≥3 chars arrive and the text does NOT start with "```"
                //         → switch to streaming immediately (it's plain text).
                //      b) If the text DOES start with "```", wait for the first "\n"
                //         so we can read the full first line and its language tag.
                //         Plain-text tags (empty / text / plaintext / plain / md)
                //         → buffer silently; strip fence on done and emit clean prose.
                //         Real language tags (python, ts, …)
                //         → switch to streaming (it's a legitimate code block).
                //
                // 2. Trailing Gemma template tokens
                //    Gemma 4 emits <turn|> and Gemma 3n emits <end_of_turn> as
                //    turn-closing markers. If the LiteRT runtime doesn't intercept
                //    them as stop tokens they bleed into the user-visible text.
                //    We hold back a TAIL_SIZE-character tail buffer during streaming
                //    and strip these tokens from it before emitting the final chunk.

                /** Chars held back to intercept trailing template tokens. */
                const TAIL_SIZE = 20; // longer than "<end_of_turn>" (13 chars)

                let settled = false;  // guards against writing after abort/done
                let accumulated = ""; // all text received from the model so far
                let emitted = 0;      // chars of `accumulated` already sent to writer

                type StreamMode = "detecting" | "streaming" | "buffering";
                let streamMode: StreamMode = "detecting";

                try {
                    await this.llm.generateResponse(
                        prompt,
                        (partialResult: string, done: boolean) => {
                            if (settled) return;

                            // ── Abort mid-stream ──────────────────────────────
                            if (abortSignal?.aborted) {
                                writer.write({
                                    type: "abort",
                                    reason: "User stopped generation.",
                                });
                                settled = true;
                                return;
                            }

                            accumulated += partialResult;

                            // ── Mode detection ────────────────────────────────
                            if (streamMode === "detecting") {
                                if (accumulated.length >= 3 && !accumulated.startsWith("```")) {
                                    // Definitely not a code fence — start streaming.
                                    streamMode = "streaming";
                                } else if (accumulated.startsWith("```")) {
                                    // Might be a code fence. Wait for the full
                                    // first line (the language tag) before deciding.
                                    const nl = accumulated.indexOf("\n");
                                    if (nl !== -1 || done) {
                                        const firstLine = nl !== -1
                                            ? accumulated.slice(0, nl)
                                            : accumulated;
                                        streamMode = isPlainTextCodeFence(firstLine)
                                            ? "buffering"
                                            : "streaming";
                                    }
                                } else if (done) {
                                    // Response ended before we had 3 chars.
                                    streamMode = "streaming";
                                }
                                // Still "detecting" — fall through; the streaming
                                // block below will emit once mode is resolved.
                            }

                            // ── Streaming: emit, holding back a tail buffer ────
                            if (streamMode === "streaming" && !done) {
                                const safeEnd = accumulated.length - TAIL_SIZE;
                                if (safeEnd > emitted) {
                                    writer.write({
                                        type: "text-delta",
                                        id: textPartId,
                                        delta: accumulated.slice(emitted, safeEnd),
                                    });
                                    emitted = safeEnd;
                                }
                            }

                            // ── Generation complete ───────────────────────────
                            if (done) {
                                // Determine the cleaned final text.
                                let finalText = accumulated;

                                if (streamMode === "buffering") {
                                    const nl = finalText.indexOf("\n");
                                    const firstLine = nl !== -1
                                        ? finalText.slice(0, nl)
                                        : finalText;
                                    if (isPlainTextCodeFence(firstLine)) {
                                        finalText = stripOuterCodeFence(finalText);
                                    }
                                    // Real code block — emit as-is.
                                }

                                // Strip any leaked template tokens from the tail.
                                finalText = stripTrailingTemplateTokens(finalText);

                                // Emit everything that hasn't been streamed yet
                                // (the tail buffer, minus any stripped tokens).
                                const remaining = finalText.slice(emitted);
                                if (remaining) {
                                    writer.write({
                                        type: "text-delta",
                                        id: textPartId,
                                        delta: remaining,
                                    });
                                }

                                writer.write({ type: "text-end", id: textPartId });
                                writer.write({ type: "finish", finishReason: "stop" });
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
