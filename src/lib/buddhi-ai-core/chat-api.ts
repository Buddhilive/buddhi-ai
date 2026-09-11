/**
 * buddhi-ai-core/chat-api.ts
 *
 * Implements a custom `ChatTransport` for the Vercel AI SDK's `useChat` hook
 * that drives inference entirely in the browser via Google's official LiteRT-LM Web
 * runtime (@litert-lm/core) — no network requests, no API keys required.
 *
 * HOW IT FITS TOGETHER
 * --------------------
 *  useChat({ transport })
 *    └─ LiteRTChatTransport.sendMessages()
 *         ├─ Converts UIMessage[] → BuddhiAIMessage[]
 *         ├─ Applies session memory context if available
 *         ├─ Creates a LiteRT-LM Conversation with preface
 *         └─ Streams tokens from conversation.sendMessageStreaming()
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

import { DEFAULT_SYSTEM_PROMPT } from "@/const/system-prompt";
import { applyMemoryContext } from "@/lib/memory";
import { useMemoryStore } from "@/stores/memory-store";
import { useSandboxStore } from "@/stores/sandbox-store";
import {
    SANDBOX_TOOLS,
    REACT_AGENT_SYSTEM_INSTRUCTIONS,
    executeSandboxTool,
} from "@/lib/sandbox-tools";
import {
    serializeToolDeclaration,
    serializeToolResponse,
} from "@/lib/buddhi-ai-core/chat-template-generator";
import {
    GemmaChannelStreamParser,
    parseGemmaToolArguments,
    type ToolCallPayload,
} from "@/lib/buddhi-ai-core/gemma-channel-parser";
import type { BuddhiAIChatTemplate, BuddhiAIMessage, GemmaTemplateVersion } from "@/types/messages";
import type { Engine, Message } from "@litert-lm/core";
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
 */
function stripOuterCodeFence(text: string): string {
    return text
        .replace(/^```[\w]*\n/, "") // strip opening fence + optional language tag
        .replace(/\n```\s*$/, "");  // strip closing fence + optional trailing whitespace
}

/**
 * Strips Gemma model template tokens that may appear verbatim at the end of
 * a generated response. Gemma 4 uses `<turn|>` and Gemma 3n uses
 * `<end_of_turn>` as turn-closing markers.
 */
function stripTrailingTemplateTokens(text: string): string {
    return text
        .replace(/<turn\|>\s*$/, "")
        .replace(/<end_of_turn>\s*$/, "")
        .trimEnd();
}

/**
 * Converts a Blob to a data: URL string using FileReader.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () =>
            reject(new Error("FileReader failed to convert Blob to data URL"));
        reader.readAsDataURL(blob);
    });
}

/**
 * Resolves a file part's content to a data: URL.
 */
async function resolveFileUrl(
    url: string | undefined,
    data: Uint8Array | string | undefined,
    mediaType: string,
): Promise<string | null> {
    if (url) {
        if (url.startsWith("data:")) return url;
        if (url.startsWith("blob:")) {
            try {
                const res = await fetch(url);
                const blob = await res.blob();
                return await blobToDataUrl(blob);
            } catch (err) {
                console.warn("[resolveFileUrl] Failed to fetch blob: URL:", err);
                return null;
            }
        }
        return url;
    }

    if (data instanceof Uint8Array) {
        const binary = Array.from(data, (b) => String.fromCharCode(b)).join("");
        return `data:${mediaType ?? "application/octet-stream"};base64,${btoa(binary)}`;
    }

    if (typeof data === "string") {
        return `data:${mediaType ?? "application/octet-stream"};base64,${data}`;
    }

    return null;
}

/**
 * Converts the Vercel AI SDK's `UIMessage[]` into the internal
 * `BuddhiAIMessage[]` format.
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
                } else if (part.type === "dynamic-tool" || (part as { type: string }).type?.startsWith?.("tool-")) {
                    const toolPart = part as { toolName?: string; input?: unknown; output?: unknown; errorText?: string };
                    if (toolPart.toolName) {
                        const repr = `[Tool: ${toolPart.toolName} args: ${JSON.stringify(toolPart.input || {})} result: ${JSON.stringify(toolPart.output ?? toolPart.errorText ?? {})}]`;
                        contentParts.push({ type: "text", text: repr });
                    }
                } else if (part.type === "file") {
                    const filePart = part as FileUIPart;
                    const mediaType = filePart.mediaType ?? "";
                    const rawData = (filePart as unknown as { data?: Uint8Array | string }).data;

                    if (mediaType.startsWith("image/")) {
                        if (!supportsVision) {
                            console.warn(
                                `[uiMessagesToBuddhiMessages] Model does not support vision. ` +
                                `Skipping image "${filePart.filename ?? "image"}".`
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
                            }
                        }
                    } else if (mediaType.startsWith("audio/")) {
                        if (!supportsVision) {
                            console.warn(
                                `[uiMessagesToBuddhiMessages] Model does not support audio. ` +
                                `Skipping audio "${filePart.filename ?? "audio"}".`
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
                            }
                        }
                    }
                }
            }

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
// LiteRTChatTransport
// ---------------------------------------------------------------------------

export interface TransportOptions {
    isReasoningOn?: boolean;
    systemPrompt?: string;
    supportsVision?: boolean;
    chatId?: string | null;
}

/**
 * A `ChatTransport` that runs LLM inference directly in the browser using
 * Google's official LiteRT-LM Web runtime (@litert-lm/core).
 */
export class LiteRTChatTransport implements ChatTransport<UIMessage> {
    private _isReasoningOn: boolean = false;
    private _systemPrompt: string = DEFAULT_SYSTEM_PROMPT;
    private _supportsVision: boolean = false;
    private _chatId: string | null = null;

    constructor(
        private readonly engine: Engine,
        private readonly getOptions?: () => TransportOptions,
        private readonly templateVersion: GemmaTemplateVersion = "gemma4",
    ) { }

    get isReasoningOn(): boolean {
        return this.getOptions ? (this.getOptions().isReasoningOn ?? this._isReasoningOn) : this._isReasoningOn;
    }
    set isReasoningOn(val: boolean) {
        this._isReasoningOn = val;
    }

    get systemPrompt(): string {
        return this.getOptions ? (this.getOptions().systemPrompt ?? this._systemPrompt) : this._systemPrompt;
    }
    set systemPrompt(val: string) {
        this._systemPrompt = val;
    }

    get supportsVision(): boolean {
        return this.getOptions ? (this.getOptions().supportsVision ?? this._supportsVision) : this._supportsVision;
    }
    set supportsVision(val: boolean) {
        this._supportsVision = val;
    }

    get chatId(): string | null {
        return this.getOptions ? (this.getOptions().chatId ?? this._chatId) : this._chatId;
    }
    set chatId(val: string | null) {
        this._chatId = val;
    }

    /**
     * Called by `useChat` whenever the user submits a message or requests a
     * regeneration. Returns a `ReadableStream<UIMessageChunk>`.
     */
    sendMessages({
        messages,
        abortSignal,
    }: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]): Promise<
        ReadableStream<UIMessageChunk>
    > {
        const stream = createUIMessageStream({
            execute: async ({ writer }) => {
                if (abortSignal?.aborted) {
                    writer.write({
                        type: "abort",
                        reason: "Request was aborted before generation started.",
                    });
                    return;
                }

                // Convert UI messages
                const rawConverted = await uiMessagesToBuddhiMessages(messages, this.supportsVision);

                // Apply memory middleware
                const converted = applyMemoryContext(rawConverted, this.chatId ?? "");

                // Notice when text-only model receives media
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
                                "\n\n[System note: The user has attached media files to this message. " +
                                "You are a text-only model and cannot process media attachments.]";
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

                // Partition messages into preface (prior turns) and the active user prompt
                const prefaceMessages: Message[] = [];
                if (this.systemPrompt) {
                    const toolDeclarations = SANDBOX_TOOLS.map(
                        (t) => `<|channel>declaration:${t.name}${serializeToolDeclaration(t)}<channel|>`
                    ).join("\n");
                    const fullSystem = `${this.systemPrompt}\n\n${REACT_AGENT_SYSTEM_INSTRUCTIONS}\n\n${toolDeclarations}`;
                    prefaceMessages.push({
                        role: "system",
                        content: this.isReasoningOn ? `${fullSystem}\n<|think|>` : fullSystem,
                    });
                }

                // All prior turns go to preface
                for (let i = 0; i < converted.length - 1; i++) {
                    const turn = converted[i];
                    prefaceMessages.push({
                        role: turn.role,
                        content: typeof turn.content === "string" ? turn.content : JSON.stringify(turn.content),
                    });
                }

                // Active prompt is the last turn
                const lastTurn = converted[converted.length - 1];
                const userPrompt = lastTurn
                    ? typeof lastTurn.content === "string"
                        ? lastTurn.content
                        : JSON.stringify(lastTurn.content)
                    : "";

                let conversation;
                try {
                    conversation = await this.engine.createConversation({
                        preface: {
                            messages: prefaceMessages,
                            tools: SANDBOX_TOOLS.map((t) => ({
                                type: "function" as const,
                                function: {
                                    name: t.name,
                                    description: t.description,
                                    parameters: t.parameters,
                                },
                            })),
                        },
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    throw new Error(`Failed to create LiteRT conversation: ${msg}`);
                }

                // Update token count in memory store
                try {
                    const tokenCount = await conversation.getTokenCount();
                    if (tokenCount !== undefined && !useMemoryStore.getState().isSummarizing) {
                        useMemoryStore.getState().setTokenCount(tokenCount);
                    }
                } catch (err) {
                    console.warn("[LiteRTChatTransport] getTokenCount threw:", err);
                }

                if (abortSignal?.aborted) {
                    await conversation.delete().catch(() => {});
                    writer.write({
                        type: "abort",
                        reason: "Request was aborted before generation started.",
                    });
                    return;
                }

                // Open assistant message
                const messageId = nanoid();
                const reasoningPartId = nanoid();
                let textPartId = nanoid();

                writer.write({ type: "start", messageId });

                let settled = false;
                const onAbort = () => {
                    try {
                        conversation.cancel();
                    } catch { }
                };
                if (abortSignal) {
                    abortSignal.addEventListener("abort", onAbort, { once: true });
                }

                try {
                    let currentPrompt: Message | string = userPrompt;
                    let loopCount = 0;
                    const MAX_REACT_TURNS = 6;

                    while (loopCount < MAX_REACT_TURNS && !settled && !abortSignal?.aborted) {
                        loopCount++;
                        const pendingToolCalls: ToolCallPayload[] = [];
                        let textStartedForTurn = false;

                        const parser = new GemmaChannelStreamParser(
                            {
                                onReasoningStart: () => {
                                    writer.write({ type: "reasoning-start", id: reasoningPartId });
                                },
                                onReasoningDelta: (delta: string) => {
                                    writer.write({ type: "reasoning-delta", id: reasoningPartId, delta });
                                },
                                onReasoningEnd: () => {
                                    writer.write({ type: "reasoning-end", id: reasoningPartId });
                                },
                                onTextStart: () => {
                                    if (!textStartedForTurn) {
                                        writer.write({ type: "text-start", id: textPartId });
                                        textStartedForTurn = true;
                                    }
                                },
                                onTextDelta: (delta: string) => {
                                    writer.write({ type: "text-delta", id: textPartId, delta });
                                },
                                onTextEnd: () => {
                                    if (textStartedForTurn) {
                                        writer.write({ type: "text-end", id: textPartId });
                                        textStartedForTurn = false;
                                        textPartId = nanoid();
                                    }
                                },
                                onToolCall: (call: ToolCallPayload) => {
                                    pendingToolCalls.push(call);
                                },
                            },
                            this.isReasoningOn
                        );

                        const responseStream = conversation.sendMessageStreaming(currentPrompt as unknown as string);
                        const reader = responseStream.getReader();

                        try {
                            while (true) {
                                const { done, value: chunk } = await reader.read();
                                if (done || !chunk || settled) break;

                                if (abortSignal?.aborted) {
                                    writer.write({
                                        type: "abort",
                                        reason: "User stopped generation.",
                                    });
                                    settled = true;
                                    break;
                                }

                                // If LiteRT parsed native tool calls, extract them
                                if (chunk.tool_calls && chunk.tool_calls.length > 0) {
                                    for (const tc of chunk.tool_calls) {
                                        const name = tc.function?.name || (tc as any).name;
                                        const rawArgs = tc.function?.arguments || (tc as any).arguments || {};
                                        pendingToolCalls.push({
                                            name,
                                            args: typeof rawArgs === "string" ? parseGemmaToolArguments(rawArgs) : (rawArgs as Record<string, unknown>),
                                            raw: JSON.stringify(tc),
                                        });
                                    }
                                }

                                let partial = "";
                                if (typeof chunk.content === "string") {
                                    partial = chunk.content;
                                } else if (Array.isArray(chunk.content)) {
                                    for (const p of chunk.content) {
                                        if (p.type === "text" && p.text) {
                                            partial += p.text;
                                        }
                                    }
                                }

                                if (chunk.channels?.thought && !partial) {
                                    partial = `<|channel>thought\n${chunk.channels.thought}<channel|>\n`;
                                }

                                if (partial) {
                                    parser.push(partial);
                                }
                            }
                        } finally {
                            reader.releaseLock();
                        }

                        parser.flush();

                        if (settled || abortSignal?.aborted || pendingToolCalls.length === 0) {
                            break;
                        }

                        // Execute pending tool calls and prepare next prompt
                        const toolResponses: Array<{ type: "tool_response"; name: string; response: Record<string, unknown> }> = [];

                        for (const call of pendingToolCalls) {
                            const toolCallId = nanoid();
                            writer.write({
                                type: "tool-input-available",
                                toolCallId,
                                toolName: call.name,
                                input: call.args,
                                dynamic: true,
                            });

                            const bridge = useSandboxStore.getState().bridge;
                            const execResult = await executeSandboxTool(call.name, call.args, bridge);

                            const resultObj = (execResult.success
                                ? (execResult.result ?? { success: true })
                                : { error: execResult.error || "Tool execution failed." }) as Record<string, unknown>;

                            if (execResult.success) {
                                writer.write({
                                    type: "tool-output-available",
                                    toolCallId,
                                    output: execResult.result,
                                    dynamic: true,
                                });
                            } else {
                                writer.write({
                                    type: "tool-output-error",
                                    toolCallId,
                                    errorText: execResult.error || "Tool execution failed.",
                                    dynamic: true,
                                });
                            }

                            toolResponses.push({
                                type: "tool_response",
                                name: call.name,
                                response: resultObj,
                            });
                        }

                        currentPrompt = {
                            role: "tool",
                            content: toolResponses,
                        } as unknown as Message;
                    }

                    if (!settled) {
                        writer.write({ type: "finish", finishReason: "stop" });
                        settled = true;
                    }
                } catch (err) {
                    if (!abortSignal?.aborted) {
                        const msg = err instanceof Error ? err.message : String(err);
                        throw new Error(`LiteRT-LM inference failed: ${msg}.`);
                    }
                } finally {
                    if (abortSignal) {
                        abortSignal.removeEventListener("abort", onAbort);
                    }
                    await conversation.delete().catch(() => {});
                }

                if (!settled) {
                    writer.write({ type: "finish", finishReason: "stop" });
                }
            },

            onError: (error: unknown): string => {
                const message = error instanceof Error ? error.message : String(error);
                console.error("[LiteRTChatTransport] Stream error:", error);
                return message;
            },
        });

        return Promise.resolve(stream);
    }

    reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
        return Promise.resolve(null);
    }
}

// Backwards compatibility alias
export { LiteRTChatTransport as MediaPipeChatTransport };
