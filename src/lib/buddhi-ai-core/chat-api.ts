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
import type { BuddhiAIChatTemplate, BuddhiAIMessage, GemmaTemplateVersion } from "@/types/messages";
import type { LlmInference, Prompt } from "@mediapipe/tasks-genai";
import {
    createUIMessageStream,
    type ChatTransport,
    type FileUIPart,
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
 * Resolves a file's source into a `data:` URL suitable for MediaPipe.
 *
 * Handles three cases:
 *  1. Already a `data:` URL — returned as-is.
 *  2. A `blob:` URL (ephemeral object URL) — fetched and converted via FileReader.
 *  3. Raw binary in a `Uint8Array` or base64 `string` — encoded as a data URL.
 *
 * Returns `null` when the source cannot be resolved (e.g. a revoked blob URL).
 */
async function resolveFileUrl(
    url: string | undefined,
    data?: Uint8Array | string,
    mediaType?: string,
): Promise<string | null> {
    if (!url && !data) return null;

    // Already a data URL — use directly.
    if (url && !url.startsWith("blob:")) return url;

    // Blob URL — fetch the referenced Blob and encode it as base64.
    if (url?.startsWith("blob:")) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => {
                    console.error(
                        "[resolveFileUrl] FileReader error while converting blob URL to data URL."
                    );
                    resolve(null);
                };
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.error("[resolveFileUrl] Failed to fetch blob URL:", err);
            return null;
        }
    }

    // Uint8Array — convert to base64 data URL.
    if (data instanceof Uint8Array) {
        const binary = Array.from(data, (b) => String.fromCharCode(b)).join("");
        return `data:${mediaType ?? "application/octet-stream"};base64,${btoa(binary)}`;
    }

    // String — treat as raw base64 payload.
    if (typeof data === "string") {
        return `data:${mediaType ?? "application/octet-stream"};base64,${data}`;
    }

    return null;
}

/**
 * Walks a MediaPipe `Prompt` array and replaces every `{ imageSource: string }`
 * entry with `{ imageSource: ImageBitmap }`.
 *
 * MediaPipe's LiteRT WASM runtime cannot decode data: / blob: URL strings
 * passed as `imageSource` — it needs a decoded pixel buffer (ImageBitmap).
 * Passing a raw string causes the runtime to throw:
 *   "LlmVisionInferenceCalculator failed: Image models could not be created"
 *
 * Non-image parts (strings, audio objects) are returned unchanged.
 */
async function resolvePromptImageSources(prompt: Prompt): Promise<Prompt> {
    // Prompt can be a bare string PromptPart — nothing to convert.
    if (!Array.isArray(prompt)) return prompt;

    const resolved = await Promise.all(
        (prompt as Array<unknown>).map(async (part) => {
            if (
                typeof part !== "object" ||
                part === null ||
                !("imageSource" in part) ||
                typeof (part as Record<string, unknown>).imageSource !== "string"
            ) {
                return part;
            }

            const url = (part as { imageSource: string }).imageSource;
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const bitmap = await createImageBitmap(blob);
                return { imageSource: bitmap };
            } catch (err) {
                console.warn(
                    "[resolvePromptImageSources] Could not decode imageSource to ImageBitmap; " +
                    "falling back to URL string (may cause a WASM runtime error):",
                    err,
                );
                return part;
            }
        }),
    );
    return resolved as Prompt;
}

/**
 * Converts the Vercel AI SDK's `UIMessage[]` into the internal
 * `BuddhiAIMessage[]` format expected by `generateChatTemplate`.
 *
 * Text-only messages produce a plain `string` content (backward-compatible).
 * Messages that include at least one image or audio file produce an array of
 * `BuddhiAIChatTemplate` items so `generateGemma4Template` can inject the
 * correct `<|image|>` / `<|audio|>` placeholders.
 *
 * When `supportsVision` is `false` (the default for text-only model files),
 * image and audio parts are silently stripped — passing `{ imageSource }` to a
 * model that has no vision encoder causes MediaPipe to throw immediately.
 *
 * Unsupported file types (video, documents) are always dropped with a warning.
 * Reasoning parts are never forwarded to the model.
 */
async function uiMessagesToBuddhiMessages(
    messages: UIMessage[],
    supportsVision: boolean,
): Promise<BuddhiAIMessage[]> {
    return Promise.all(
        messages.map(async (msg) => {
            const contentParts: BuddhiAIChatTemplate[] = [];
            let hasMedia = false;

            for (const part of msg.parts) {
                if (part.type === "text") {
                    contentParts.push({ type: "text", text: part.text });
                } else if (part.type === "file") {
                    const filePart = part as FileUIPart;
                    const mediaType = filePart.mediaType ?? "";
                    // `data` exists on the full FileUIPart spec; local parts
                    // only set `url`, so cast to `unknown` first.
                    const rawData = (filePart as unknown as { data?: Uint8Array | string }).data;

                    if (mediaType.startsWith("image/")) {
                        if (!supportsVision) {
                            // Text-only model: passing imageSource crashes MediaPipe.
                            console.warn(
                                `[uiMessagesToBuddhiMessages] Model does not support vision. ` +
                                `Skipping image "${filePart.filename ?? "image"}" — load a ` +
                                `vision-capable model to analyse images.`
                            );
                        } else {
                            const dataUrl = await resolveFileUrl(filePart.url, rawData, mediaType);
                            if (dataUrl) {
                                contentParts.push({
                                    type: "image",
                                    url: dataUrl,
                                    mediaType,
                                    fileName: filePart.filename,
                                });
                                hasMedia = true;
                            } else {
                                console.warn(
                                    `[uiMessagesToBuddhiMessages] Could not resolve image URL for ` +
                                    `"${filePart.filename ?? "image"}"; skipping file part.`
                                );
                            }
                        }
                    } else if (mediaType.startsWith("audio/")) {
                        if (!supportsVision) {
                            console.warn(
                                `[uiMessagesToBuddhiMessages] Model does not support vision/audio. ` +
                                `Skipping audio "${filePart.filename ?? "audio"}" — load a ` +
                                `vision-capable model (E2B/E4B) to process audio.`
                            );
                        } else {
                            const dataUrl = await resolveFileUrl(filePart.url, rawData, mediaType);
                            if (dataUrl) {
                                contentParts.push({
                                    type: "audio",
                                    url: dataUrl,
                                    mediaType,
                                    fileName: filePart.filename,
                                });
                                hasMedia = true;
                            } else {
                                console.warn(
                                    `[uiMessagesToBuddhiMessages] Could not resolve audio URL for ` +
                                    `"${filePart.filename ?? "audio"}"; skipping file part.`
                                );
                            }
                        }
                    } else if (mediaType.startsWith("video/")) {
                        // LiteRT does not support video — dropped with a warning.
                        console.warn(
                            `[uiMessagesToBuddhiMessages] Video files are not supported by the ` +
                            `on-device inference runtime. Skipping "${filePart.filename ?? "video"}".`
                        );
                    } else {
                        // PDFs, DOCX, and other binary formats have no understanding layer.
                        console.warn(
                            `[uiMessagesToBuddhiMessages] Unsupported file type "${mediaType}" ` +
                            `for "${filePart.filename ?? "file"}". Only images and audio ` +
                            `(on vision-capable models) are forwarded to the model.`
                        );
                    }
                }
                // Reasoning parts are produced by the model; never re-sent to it.
            }

            // Text-only messages use a plain string (backward-compatible with
            // Gemma 3n and existing chat history). Multimodal messages use an
            // array so generateGemma4Template can insert media placeholders.
            const content: BuddhiAIMessage["content"] = hasMedia
                ? contentParts
                : contentParts
                      .filter((p) => p.type === "text")
                      .map((p) => p.text!)
                      .join("\n");

            return {
                role: msg.role as BuddhiAIMessage["role"],
                content,
            };
        }),
    );
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

    /**
     * Whether the loaded model file bundles a vision encoder.
     *
     * When `false` (the default), image and audio parts are stripped before the
     * Gemma prompt is built.  Passing `{ imageSource }` to a text-only MediaPipe
     * model causes an immediate "Image models could not be created" crash.
     *
     * Set to `true` via a `useEffect` in ChatSession when the active model's
     * `ModelConfig.supportsVision` flag is `true`.
     */
    supportsVision: boolean = false;

    /**
     * A Promise that resolves to the RAG context string (or `null`) for the
     * current turn.  Replaces the old synchronous `ragContext` property.
     *
     * **Why a Promise?**
     * `sendMessage()` must be called *before* RAG retrieval so the user's
     * message appears in the conversation immediately.  The transport's
     * `execute` callback awaits this promise, so the LLM prompt is not built
     * until the context is ready — but the UI update is not blocked.
     *
     * Usage in ChatSession.handleSubmit:
     * ```ts
     * let resolveRag: (ctx: string | null) => void;
     * transport.ragContextPromise = new Promise(r => { resolveRag = r; });
     * sendMessage({ text, files });   // user message appears immediately
     * // …run retrieval…
     * resolveRag(ragContextBlock);    // transport unblocks and builds prompt
     * ```
     *
     * Reset to `null` after first use so stale context never bleeds into
     * regenerations or follow-up turns.
     */
    ragContextPromise: Promise<string | null> | null = null;

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

                // ── Await RAG context ─────────────────────────────────────────
                // handleSubmit sets ragContextPromise before calling sendMessage so
                // the user message appears in the UI immediately while retrieval
                // runs concurrently.  We await the promise here so the LLM never
                // sees a prompt without its context.  Reset to null after use so
                // stale context never bleeds into regenerations or follow-up turns.
                const pendingRag = this.ragContextPromise;
                this.ragContextPromise = null;
                const ragCtx = pendingRag ? await pendingRag : null;

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
                //
                // supportsVision is checked here so text-only models never receive
                // { imageSource } entries that crash LlmVisionInferenceCalculator.
                const converted = await uiMessagesToBuddhiMessages(messages, this.supportsVision);

                // ── Vision-stripped notice ────────────────────────────────────
                // When the loaded model is text-only, uiMessagesToBuddhiMessages
                // silently drops any image/audio file parts.  Without a note the
                // model has no idea the user attached media and will say something
                // confusing like "you haven't provided an image."  Injecting a
                // brief system note into the last user turn lets the model respond
                // helpfully: explaining the limitation and suggesting a vision model.
                if (!this.supportsVision && converted.length > 0) {
                    const hasMediaAttachments = messages.some((msg) =>
                        msg.parts.some((p) => {
                            if (p.type !== "file") return false;
                            const m = (p as FileUIPart).mediaType ?? "";
                            return m.startsWith("image/") || m.startsWith("audio/");
                        })
                    );
                    if (hasMediaAttachments) {
                        const lastIdx = converted.length - 1;
                        if (converted[lastIdx].role === "user") {
                            const notice =
                                "\n\n[System note: The user has attached one or more media " +
                                "files (image or audio) to this message. You are a text-only " +
                                "model and cannot process media attachments. Please let the " +
                                "user know you cannot analyse their attached file(s) and " +
                                "suggest they load a vision-capable model variant to enable " +
                                "image and audio analysis.]";
                            const lastMsg = converted[lastIdx];
                            converted[lastIdx] = {
                                ...lastMsg,
                                content:
                                    typeof lastMsg.content === "string"
                                        ? lastMsg.content + notice
                                        : [
                                              ...lastMsg.content,
                                              { type: "text" as const, text: notice },
                                          ],
                            };
                        }
                    }
                }

                // ── RAG context injection ─────────────────────────────────────
                // Append the retrieved context as plain text so generateChatTemplate
                // places it inside the correct <|turn>user … <turn|> block.
                if (ragCtx && converted.length > 0) {
                    const lastIdx = converted.length - 1;
                    if (converted[lastIdx].role === "user") {
                        const lastMsg = converted[lastIdx];
                        if (typeof lastMsg.content === "string") {
                            converted[lastIdx] = {
                                ...lastMsg,
                                content: lastMsg.content + ragCtx,
                            };
                        } else if (Array.isArray(lastMsg.content)) {
                            // Multimodal message — append context as an extra text element.
                            converted[lastIdx] = {
                                ...lastMsg,
                                content: [
                                    ...lastMsg.content,
                                    { type: "text" as const, text: ragCtx },
                                ],
                            };
                        }
                    }
                }

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

                // ── Resolve imageSource strings → ImageBitmap ─────────────────
                // MediaPipe's WASM runtime cannot decode data: / blob: URL strings
                // passed as `imageSource` — passing a raw string causes:
                //   "LlmVisionInferenceCalculator failed: Image models could not be created"
                // Convert all string imageSource entries to ImageBitmap objects.
                if (this.supportsVision) {
                    prompt = await resolvePromptImageSources(prompt);
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
