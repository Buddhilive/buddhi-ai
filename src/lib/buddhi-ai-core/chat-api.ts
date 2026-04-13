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
 *         ├─ Prepends system message (native Gemma 4 role or injected into user turn)
 *         ├─ Calls generateChatTemplate() to build the Gemma prompt
 *         └─ Streams tokens from LlmInference.generateResponse()
 *              └─ createUIMessageStream writes UIMessageChunks back to useChat
 *
 * CHUNK LIFECYCLE (what useChat expects)
 * --------------------------------------
 *  { type: 'start',            messageId }     ← opens assistant message
 *  { type: 'reasoning-start',  id }            ← opens reasoning block  (thinking mode only)
 *  { type: 'reasoning-delta',  id, delta } ×N  ← thinking tokens        (thinking mode only)
 *  { type: 'reasoning-end',    id }            ← closes reasoning block  (thinking mode only)
 *  { type: 'text-start',       id }            ← opens a text content block
 *  { type: 'text-delta',       id, delta } ×N  ← one token / word at a time
 *  { type: 'text-end',         id }            ← closes the text content block
 *  { type: 'finish',           finishReason }  ← closes the assistant message
 *    — or —
 *  { type: 'abort' }                           ← user pressed Stop
 */

import { SYSTEM_PROMPT } from "@/const/system-prompt";
import { generateChatTemplate } from "@/lib/buddhi-ai-core/chat-template-generator";
import type { BuddhiAIMessage, GemmaTemplateVersion } from "@/types/messages";
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
 * @param llm             - Initialised MediaPipe LlmInference instance.
 * @param templateVersion - Gemma prompt format to use. Defaults to "gemma4".
 * @param isReasoningOn   - When true, injects `<|think|>` into the system turn
 *                          and streams the model's internal reasoning as a
 *                          `reasoning` content block before the text response.
 *
 * @example
 * ```tsx
 * const transport = useMemo(
 *   () => new MediaPipeChatTransport(liteRTModelInstance, templateVersion, isReasoningOn),
 *   [liteRTModelInstance, templateVersion, isReasoningOn]
 * );
 * const { messages, sendMessage, stop, status } = useChat({ transport });
 * ```
 */
export class MediaPipeChatTransport implements ChatTransport<UIMessage> {
    /**
     * Whether Gemma 4 extended thinking mode is active.
     *
     * This is intentionally a public mutable property rather than a constructor
     * argument. The Vercel AI SDK's `useChat` stores the transport instance once
     * (in an internal `useRef`) and never re-reads the `transport` option after
     * the initial mount. Passing `isReasoningOn` as a constructor param and
     * recreating the transport via `useMemo` would have no effect because `useChat`
     * keeps using the original instance.
     *
     * The correct pattern is to keep the transport stable and update this property
     * imperatively via a `useEffect` whenever the toggle changes:
     *
     * ```tsx
     * useEffect(() => { transport.isReasoningOn = isReasoningOn; }, [transport, isReasoningOn]);
     * ```
     */
    isReasoningOn: boolean = false;

    constructor(
        private readonly llm: LlmInference,
        private readonly templateVersion: GemmaTemplateVersion = "gemma4",
    ) {}

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
                if (abortSignal?.aborted) {
                    writer.write({
                        type: "abort",
                        reason: "Request was aborted before generation started.",
                    });
                    return;
                }

                // ── Build the prompt ──────────────────────────────────────────
                // Gemma 4 supports a native "system" role in its chat template,
                // so we prepend a dedicated system message with the SYSTEM_PROMPT.
                // Setting enableThinking: true on that message causes
                // generateChatTemplate to inject the `<|think|>` activation token,
                // which tells Gemma 4 to produce an internal reasoning block before
                // the visible response.
                //
                // Gemma 3n has no system role — inject the prompt into the first
                // user turn instead (legacy behavior).
                const converted = uiMessagesToBuddhiMessages(messages);

                const buddhiMessages: BuddhiAIMessage[] =
                    this.templateVersion === "gemma4"
                        ? [
                              {
                                  role: "system",
                                  content: SYSTEM_PROMPT,
                                  enableThinking: this.isReasoningOn,
                              },
                              ...converted,
                          ]
                        : converted.length > 0 && converted[0].role === "user"
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
                    prompt = await generateChatTemplate(buddhiMessages, {
                        templateVersion: this.templateVersion,
                    });
                } catch (err) {
                    const msg =
                        err instanceof Error ? err.message : String(err);
                    throw new Error(
                        `Failed to build chat template: ${msg}. ` +
                            "Check that the conversation history is valid."
                    );
                }

                if (abortSignal?.aborted) {
                    writer.write({
                        type: "abort",
                        reason: "Request was aborted before generation started.",
                    });
                    return;
                }

                // ── Open the assistant message ────────────────────────────────
                const messageId       = nanoid();
                const reasoningPartId = nanoid();
                const textPartId      = nanoid();

                writer.write({ type: "start", messageId });

                // For non-reasoning mode, open the text block immediately.
                // For reasoning mode, defer text-start until after the thinking
                // block is detected (or skipped if the model outputs no thinking).
                if (!this.isReasoningOn) {
                    writer.write({ type: "text-start", id: textPartId });
                }

                // ── Streaming constants ───────────────────────────────────────
                // Gemma 4 thinking output format:
                //   <|channel>thought\n[reasoning]<channel|>\n[visible text]
                //
                // THINKING_HEADER  — opening marker (18 chars): "<|channel>thought\n"
                // THINKING_END     — closing marker (10 chars): "<channel|>"
                // THINKING_TAIL    — chars held back during reasoning streaming so
                //                    the end marker is always intact in the buffer.
                // TEXT_TAIL        — chars held back during text streaming so leaked
                //                    template tokens (<turn|>, <end_of_turn>) can be
                //                    stripped before the final chunk is emitted.

                const THINKING_HEADER     = "<|channel>thought\n";
                const THINKING_HEADER_LEN = THINKING_HEADER.length;   // 18
                const THINKING_END        = "<channel|>";
                const THINKING_END_LEN    = THINKING_END.length;       // 10
                const THINKING_TAIL       = 12;
                const TEXT_TAIL           = 20;

                // ── Streaming state ───────────────────────────────────────────
                // "think-pre"  — initial state (reasoning mode only): buffering
                //                until we can confirm whether the response starts
                //                with a thinking block.
                // "thinking"   — inside <|channel>thought\n…<channel|> block;
                //                streaming reasoning-delta chunks.
                // "detecting"  — deciding between "streaming" and "buffering"
                //                based on the first line of the text response.
                // "streaming"  — normal text streaming with tail hold-back.
                // "buffering"  — entire response buffered (plain-text code-fence);
                //                emitted in one shot at done.

                type StreamMode = "think-pre" | "thinking" | "detecting" | "streaming" | "buffering";

                let settled = false;
                let accumulated = "";
                let mode: StreamMode = this.isReasoningOn ? "think-pre" : "detecting";

                // Absolute positions in `accumulated`:
                let reasoningWrittenUpTo = THINKING_HEADER_LEN; // right after the header
                let textOffset  = 0; // where the visible text begins
                let textEmitted = 0; // how far into accumulated text has been streamed

                try {
                    await this.llm.generateResponse(
                        prompt,
                        (partialResult: string, done: boolean) => {
                            if (settled) return;

                            if (abortSignal?.aborted) {
                                writer.write({
                                    type: "abort",
                                    reason: "User stopped generation.",
                                });
                                settled = true;
                                return;
                            }

                            accumulated += partialResult;

                            // ── "think-pre": detect thinking block ───────────
                            // Buffer until we have enough chars to check whether
                            // the response opens with <|channel>thought\n.
                            if (mode === "think-pre") {
                                if (accumulated.length >= THINKING_HEADER_LEN || done) {
                                    if (accumulated.startsWith(THINKING_HEADER)) {
                                        mode = "thinking";
                                        writer.write({ type: "reasoning-start", id: reasoningPartId });
                                        // reasoningWrittenUpTo already = THINKING_HEADER_LEN
                                    } else {
                                        // No thinking block — fall through to text detection.
                                        textOffset  = 0;
                                        textEmitted = 0;
                                        mode = "detecting";
                                        writer.write({ type: "text-start", id: textPartId });
                                        // ↓ fall through
                                    }
                                } else {
                                    return; // not enough chars yet
                                }
                            }

                            // ── "thinking": stream reasoning, watch for end marker
                            if (mode === "thinking") {
                                const endIdx = accumulated.indexOf(THINKING_END, THINKING_HEADER_LEN);

                                if (endIdx !== -1) {
                                    // Emit remaining reasoning (strip trailing \n before marker)
                                    const rawThinking    = accumulated.slice(THINKING_HEADER_LEN, endIdx);
                                    const cleanThinking  = rawThinking.endsWith("\n")
                                        ? rawThinking.slice(0, -1)
                                        : rawThinking;
                                    const thinkingRemain = cleanThinking.slice(
                                        reasoningWrittenUpTo - THINKING_HEADER_LEN
                                    );
                                    if (thinkingRemain) {
                                        writer.write({
                                            type: "reasoning-delta",
                                            id: reasoningPartId,
                                            delta: thinkingRemain,
                                        });
                                    }
                                    writer.write({ type: "reasoning-end", id: reasoningPartId });

                                    // Text starts after <channel|> + any leading newlines
                                    textOffset = endIdx + THINKING_END_LEN;
                                    while (
                                        textOffset < accumulated.length &&
                                        accumulated[textOffset] === "\n"
                                    ) textOffset++;
                                    textEmitted = textOffset;

                                    mode = "detecting";
                                    writer.write({ type: "text-start", id: textPartId });
                                    // ↓ fall through

                                } else if (done) {
                                    // Response ended inside the thinking block — no visible text.
                                    const rawThinking    = accumulated.slice(THINKING_HEADER_LEN).trimEnd();
                                    const thinkingRemain = rawThinking.slice(
                                        reasoningWrittenUpTo - THINKING_HEADER_LEN
                                    );
                                    if (thinkingRemain) {
                                        writer.write({
                                            type: "reasoning-delta",
                                            id: reasoningPartId,
                                            delta: thinkingRemain,
                                        });
                                    }
                                    writer.write({ type: "reasoning-end", id: reasoningPartId });
                                    writer.write({ type: "text-start", id: textPartId });
                                    writer.write({ type: "text-end",   id: textPartId });
                                    writer.write({ type: "finish", finishReason: "stop" });
                                    settled = true;
                                    return;

                                } else {
                                    // Still in thinking — stream safe portion with tail hold-back
                                    const safeEnd = accumulated.length - THINKING_TAIL;
                                    if (safeEnd > reasoningWrittenUpTo) {
                                        writer.write({
                                            type: "reasoning-delta",
                                            id: reasoningPartId,
                                            delta: accumulated.slice(reasoningWrittenUpTo, safeEnd),
                                        });
                                        reasoningWrittenUpTo = safeEnd;
                                    }
                                    return; // wait for more tokens
                                }
                            }

                            // ── "detecting": code-fence detection for text ────
                            // Operates on accumulated.slice(textOffset) so the
                            // thinking header is excluded from the analysis.
                            if (mode === "detecting") {
                                const textContent = accumulated.slice(textOffset);
                                if (textContent.length >= 3 && !textContent.startsWith("```")) {
                                    mode = "streaming";
                                } else if (textContent.startsWith("```")) {
                                    const nl = textContent.indexOf("\n");
                                    if (nl !== -1 || done) {
                                        const firstLine = nl !== -1
                                            ? textContent.slice(0, nl)
                                            : textContent;
                                        mode = isPlainTextCodeFence(firstLine)
                                            ? "buffering"
                                            : "streaming";
                                    }
                                } else if (done) {
                                    mode = "streaming";
                                }
                            }

                            // ── "streaming": emit text with tail hold-back ────
                            if (mode === "streaming" && !done) {
                                const safeEnd = accumulated.length - TEXT_TAIL;
                                if (safeEnd > textEmitted) {
                                    writer.write({
                                        type: "text-delta",
                                        id: textPartId,
                                        delta: accumulated.slice(textEmitted, safeEnd),
                                    });
                                    textEmitted = safeEnd;
                                }
                            }

                            // ── Generation complete ───────────────────────────
                            if (done) {
                                let finalText = accumulated.slice(textOffset);

                                if (mode === "buffering") {
                                    const nl = finalText.indexOf("\n");
                                    const firstLine = nl !== -1
                                        ? finalText.slice(0, nl)
                                        : finalText;
                                    if (isPlainTextCodeFence(firstLine)) {
                                        finalText = stripOuterCodeFence(finalText);
                                    }
                                }

                                // Strip any leaked template tokens from the tail.
                                finalText = stripTrailingTemplateTokens(finalText);

                                // textEmitted is an absolute position; convert to
                                // an offset within finalText (which starts at textOffset).
                                const alreadyEmitted = textEmitted - textOffset;
                                const remaining = finalText.slice(alreadyEmitted);
                                if (remaining) {
                                    writer.write({
                                        type: "text-delta",
                                        id: textPartId,
                                        delta: remaining,
                                    });
                                }

                                writer.write({ type: "text-end",  id: textPartId });
                                writer.write({ type: "finish", finishReason: "stop" });
                                settled = true;
                            }
                        }
                    );
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    throw new Error(
                        `MediaPipe LLM inference failed: ${msg}. ` +
                            "Try reloading the page or reducing the conversation length."
                    );
                }

                // ── Safety net ────────────────────────────────────────────────
                if (!settled) {
                    console.warn(
                        "[MediaPipeChatTransport] generateResponse resolved " +
                            "without a `done` callback. Closing stream manually."
                    );
                    writer.write({ type: "text-end",  id: textPartId });
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

        return Promise.resolve(stream);
    }

    /**
     * Called by `useChat` to resume an interrupted stream (e.g. after a page
     * reload mid-generation). Client-only transports have no server-side
     * stream to reconnect to, so we return `null`.
     */
    reconnectToStream(
        _options: Parameters<ChatTransport<UIMessage>["reconnectToStream"]>[0]
    ): Promise<ReadableStream<UIMessageChunk> | null> {
        return Promise.resolve(null);
    }
}
