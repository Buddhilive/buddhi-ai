/**
 * lib/memory.ts
 *
 * Session-based memory management for chat conversations with hybrid compaction:
 * standard single-pass LiteRT-LM summarization and in-WASM recursive RLM compaction.
 *
 * OVERVIEW
 * --------
 * As conversations grow, feeding the entire history to the model on every turn
 * eventually exceeds the context window. This module implements a
 * "summarization + buffer" memory pattern:
 *
 *   [system] [first user] [first assistant]
 *   [SUMMARY of middle messages]            ← replaces middle history
 *   [last user] [last assistant]
 *
 * Summarization is triggered when the prompt token count reaches or exceeds
 * the dynamic compaction threshold (default 80% of maxContextTokens).
 * The summary is stored in sessionStorage (keyed by chatId) so it persists
 * for the browser session but does NOT affect the full history saved to IndexedDB.
 *
 * IMPORTANT CONSTRAINT
 * --------------------
 * LlmInference.sizeInTokens() and LlmInference.generateResponse() are
 * mutually exclusive — you cannot call sizeInTokens while generateResponse is
 * running. Token counting and compaction only happen when status === "ready".
 */

import type { BuddhiAIMessage, GemmaTemplateVersion } from "@/types/messages";
import type { Engine } from "@litert-lm/core";
import type { UIMessage } from "ai";
import { useSettingsStore, DEFAULT_MAX_CONTEXT_TOKENS } from "@/stores/settings-store";
import { useMemoryStore, type CompactionStrategy } from "@/stores/memory-store";
import { rlmService } from "@/lib/rlm-service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default ratio of active maxContextTokens that triggers automatic compaction. */
export const DEFAULT_COMPACTION_THRESHOLD_PERCENT = 0.8;

/** Default fallback threshold when settings are uninitialized. */
export const SUMMARIZATION_THRESHOLD = Math.floor(
    DEFAULT_MAX_CONTEXT_TOKENS * DEFAULT_COMPACTION_THRESHOLD_PERCENT
);

/**
 * Maximum context window size for display in the Context component (fallback).
 * Active limit dynamically reads from useSettingsStore.maxContextTokens.
 */
export const MAX_CONTEXT_TOKENS = DEFAULT_MAX_CONTEXT_TOKENS;

/**
 * Maximum number of middle-slice messages sent to the summarizer in single-pass mode.
 * Guards against summarization prompts that are themselves too large.
 */
const MAX_MIDDLE_MESSAGES = 60;

/**
 * Computes the compaction trigger threshold in tokens based on the current
 * or provided max context window limit.
 */
export function getCompactionThreshold(maxTokens?: number): number {
    const limit = maxTokens ?? useSettingsStore.getState().maxContextTokens ?? DEFAULT_MAX_CONTEXT_TOKENS;
    return Math.floor(limit * DEFAULT_COMPACTION_THRESHOLD_PERCENT);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemoryContext {
    chatId: string;
    /** The generated summary of the middle conversation slice. */
    summary: string;
    /** Token count of the summary text (informational). */
    summaryTokenCount: number;
    /** Estimated tokens saved by replacing middle messages with summary. */
    tokensSaved: number;
    /** Strategy used to produce this summary. */
    strategy: CompactionStrategy;
    /** Unix ms timestamp of when this context was created. */
    createdAt: number;
    /** Number of messages in the conversation when summarized. */
    originalMessageCount: number;
}

/** Message slice breakdown for the summarization + buffer pattern. */
export interface MessageSlice {
    /** The system message (0 or 1 items). */
    system: BuddhiAIMessage[];
    /** The first user + assistant pair — always preserved. */
    firstTurn: BuddhiAIMessage[];
    /** The middle messages — these are summarized. May be empty. */
    middle: BuddhiAIMessage[];
    /** The last user + assistant pair — always preserved for context continuity. */
    lastTurn: BuddhiAIMessage[];
}

export interface SummarizationResult {
    summary: string;
    tokensSaved: number;
    strategy: CompactionStrategy;
}

// ---------------------------------------------------------------------------
// sessionStorage helpers
// ---------------------------------------------------------------------------

const memoryKey = (chatId: string) => `buddhi-memory-${chatId}`;

/**
 * Returns the stored MemoryContext for a chat, or null if not found.
 * Never throws — sessionStorage access errors are caught and logged.
 */
export function getMemoryContext(chatId: string): MemoryContext | null {
    if (!chatId) return null;
    try {
        const raw = sessionStorage.getItem(memoryKey(chatId));
        if (!raw) return null;
        return JSON.parse(raw) as MemoryContext;
    } catch (err) {
        console.warn(`[Memory] Failed to read sessionStorage for chat "${chatId}":`, err);
        return null;
    }
}

/**
 * Persists a MemoryContext to sessionStorage.
 * Never throws — errors are caught and logged.
 */
export function setMemoryContext(chatId: string, ctx: MemoryContext): void {
    if (!chatId) return;
    try {
        sessionStorage.setItem(memoryKey(chatId), JSON.stringify(ctx));
    } catch (err) {
        console.warn(`[Memory] Failed to write sessionStorage for chat "${chatId}":`, err);
    }
}

/**
 * Removes the MemoryContext for a chat from sessionStorage.
 * Safe to call even if no context exists.
 */
export function clearMemoryContext(chatId: string): void {
    if (!chatId) return;
    try {
        sessionStorage.removeItem(memoryKey(chatId));
    } catch (err) {
        console.warn(`[Memory] Failed to clear sessionStorage for chat "${chatId}":`, err);
    }
}

/** Returns true if a MemoryContext is stored for the given chatId. */
export function hasMemoryContext(chatId: string): boolean {
    if (!chatId) return false;
    try {
        return sessionStorage.getItem(memoryKey(chatId)) !== null;
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Message slicing
// ---------------------------------------------------------------------------

/**
 * Splits a BuddhiAIMessage[] into the four regions used by the buffer+summary
 * memory pattern.
 *
 * Given [system, u1, a1, u2, a2, u3, a3]:
 *   system    → [system]
 *   firstTurn → [u1, a1]
 *   middle    → [u2, a2]
 *   lastTurn  → [u3, a3]
 *
 * When there are fewer than 3 full turns (not enough to leave a non-empty
 * middle), `middle` will be empty and summarization should be skipped.
 */
export function sliceMessages(messages: BuddhiAIMessage[]): MessageSlice {
    if (messages.length === 0) {
        return { system: [], firstTurn: [], middle: [], lastTurn: [] };
    }

    // Separate system message
    let bodyStart = 0;
    const system: BuddhiAIMessage[] = [];
    if (messages[0].role === "system") {
        system.push(messages[0]);
        bodyStart = 1;
    }

    const body = messages.slice(bodyStart);

    // Need at least 6 body messages (3 full turns) for a non-empty middle.
    if (body.length < 6) {
        const firstTurn = body.slice(0, Math.min(2, body.length));
        const remaining = body.slice(firstTurn.length);
        const lastTurn = remaining.length >= 2 ? remaining.slice(-2) : remaining;
        const middle = remaining.slice(0, remaining.length - lastTurn.length);
        return { system, firstTurn, middle, lastTurn };
    }

    const firstTurn = body.slice(0, 2);
    const lastTurn = body.slice(-2);
    // Cap the middle slice to avoid excessively large summarization prompts.
    const rawMiddle = body.slice(2, -2);
    const middle =
        rawMiddle.length > MAX_MIDDLE_MESSAGES
            ? rawMiddle.slice(-MAX_MIDDLE_MESSAGES)
            : rawMiddle;

    return { system, firstTurn, middle, lastTurn };
}

// ---------------------------------------------------------------------------
// Memory context application (middleware)
// ---------------------------------------------------------------------------

/**
 * Applies an existing MemoryContext to a BuddhiAIMessage array.
 *
 * If a summary exists in sessionStorage for `chatId`, the middle messages are
 * replaced with a single assistant message containing the summary. Otherwise
 * the original messages are returned unchanged.
 */
export function applyMemoryContext(
    messages: BuddhiAIMessage[],
    chatId: string,
): BuddhiAIMessage[] {
    if (!chatId) return messages;

    const ctx = getMemoryContext(chatId);
    if (!ctx) return messages;

    const { middle } = sliceMessages(messages);
    if (middle.length === 0) {
        return messages;
    }

    const { system, firstTurn, lastTurn } = sliceMessages(messages);

    const summaryMessage: BuddhiAIMessage = {
        role: "assistant",
        content:
            `[Conversation summary (${ctx.strategy === "rlm-recursive" ? "in-WASM RLM" : "compacted"}) — ${new Date(ctx.createdAt).toLocaleTimeString()}]\n\n` +
            ctx.summary,
    };

    console.debug(
        `[Memory] Applied memory context for chat "${chatId}". ` +
        `Replaced ${middle.length} middle messages with summary (${ctx.tokensSaved} tokens saved).`
    );

    return [...system, ...firstTurn, summaryMessage, ...lastTurn];
}

// ---------------------------------------------------------------------------
// Token counting & Estimation
// ---------------------------------------------------------------------------

/**
 * Fast, reliable token estimation for messages based on Gemma's tokenizer ratio
 * (~3.7 characters per token plus turn delimiter overhead).
 */
export function estimateMessageTokens(messages: BuddhiAIMessage[]): number {
    if (messages.length === 0) return 0;
    let totalChars = 0;
    for (const msg of messages) {
        totalChars += 16; // Message formatting & role delimiters
        if (typeof msg.content === "string") {
            totalChars += msg.content.length;
        } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part && part.type === "text" && part.text) {
                    totalChars += part.text.length;
                }
            }
        }
    }
    return Math.max(1, Math.round(totalChars / 3.7));
}

/**
 * Counts the tokens in a BuddhiAIMessage[] using LiteRT-LM conversation if within
 * buffer limits, with immediate fallback to calibrated estimation.
 * Guaranteed to return an accurate, non-zero token count for non-empty messages.
 *
 * ⚠️ Do NOT call this while inference streaming is active.
 */
export async function countTokensForMessages(
    instance: Engine,
    messages: BuddhiAIMessage[]
): Promise<number> {
    if (messages.length === 0) return 0;
    const fallbackEstimate = estimateMessageTokens(messages);

    // If message tokens exceed LiteRT-LM's KV cache safety ceiling, use estimate directly
    // to avoid triggering an engine crash or prefill buffer overflow.
    if (fallbackEstimate > 3800) {
        return fallbackEstimate;
    }

    try {
        const prefaceMessages = messages.map((m) => ({
            role: m.role,
            content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        }));
        const conversation = await instance.createConversation({
            preface: { messages: prefaceMessages },
            prefillPrefaceOnInit: true,
        });
        const count = await conversation.getTokenCount();
        await conversation.delete().catch(() => {});
        return count && count > 0 ? count : fallbackEstimate;
    } catch (err) {
        console.warn("[Memory] Engine token count failed or exceeded buffer, using estimate:", err);
        return fallbackEstimate;
    }
}

// ---------------------------------------------------------------------------
// UIMessage → BuddhiAIMessage conversion (text-only)
// ---------------------------------------------------------------------------

/**
 * Converts a UIMessage[] to BuddhiAIMessage[] extracting text parts safely,
 * with full resilience against reasoning parts, tool outputs, and legacy message structures.
 */
export function extractBuddhiMessages(
    uiMessages: UIMessage[],
    systemPrompt: string,
    templateVersion: GemmaTemplateVersion,
): BuddhiAIMessage[] {
    const converted: BuddhiAIMessage[] = uiMessages.map((msg) => {
        let text = "";
        if (Array.isArray(msg.parts)) {
            text = msg.parts
                .filter((p) => p && (p.type === "text" || (p as { type: string }).type === "reasoning" || (p as { text?: string }).text))
                .map((p) => ((p as { text?: string }).text as string) || "")
                .filter(Boolean)
                .join("\n");
        }
        if (!text && typeof (msg as unknown as { content?: string }).content === "string") {
            text = (msg as unknown as { content: string }).content;
        }

        return {
            role: msg.role as BuddhiAIMessage["role"],
            content: text,
        };
    });

    if (templateVersion === "gemma4") {
        return [{ role: "system", content: systemPrompt }, ...converted];
    }

    // Gemma 3n: inject system prompt into first user turn.
    if (converted.length > 0 && converted[0].role === "user") {
        return [
            {
                ...converted[0],
                content: `${systemPrompt}\n\n${converted[0].content}`,
            },
            ...converted.slice(1),
        ];
    }

    return converted;
}

// ---------------------------------------------------------------------------
// Summarization
// ---------------------------------------------------------------------------

/**
 * Serializes a BuddhiAIMessage to a plain-text line suitable for the
 * summarization prompt.
 */
function formatMessageForSummary(msg: BuddhiAIMessage): string {
    const role =
        msg.role === "assistant"
            ? "ASSISTANT"
            : msg.role === "user"
                ? "USER"
                : "SYSTEM";

    let text = "";
    if (typeof msg.content === "string") {
        text = msg.content;
    } else if (Array.isArray(msg.content)) {
        text = msg.content
            .filter((p) => p.type === "text")
            .map((p) => p.text ?? "")
            .join(" ");
    }

    if (msg.toolCalls && msg.toolCalls.length > 0) {
        const tools = msg.toolCalls
            .map((tc) => `[tool call: ${tc.name}(${JSON.stringify(tc.arguments)})]`)
            .join(", ");
        text += text ? `\n${tools}` : tools;
    }

    return `${role}: ${text.trim()}`;
}

/**
 * Runs an LLM summarization over the middle slice of the conversation, stores
 * the result in sessionStorage, and returns the generated summary text.
 *
 * Supports hybrid execution:
 *   - When Extended Context (RLM) is active and context is heavy, executes in-WASM
 *     recursive analysis via rlmService.
 *   - Otherwise uses standard LiteRT-LM summarization with safe token prompt clamping.
 */
export async function runSummarization(
    instance: Engine,
    uiMessages: UIMessage[],
    systemPrompt: string,
    chatId: string,
    templateVersion: GemmaTemplateVersion,
): Promise<SummarizationResult> {
    if (!chatId) {
        throw new Error("[Memory] runSummarization called without a chatId.");
    }

    const messages = extractBuddhiMessages(uiMessages, systemPrompt, templateVersion);
    const { middle } = sliceMessages(messages);

    if (middle.length === 0) {
        console.debug(
            "[Memory] Skipping summarization — middle slice is empty " +
            `(conversation has ${messages.length} messages total).`
        );
        return { summary: "", tokensSaved: 0, strategy: null };
    }

    const conversationText = middle.map(formatMessageForSummary).join("\n\n");
    const isRlmEnabled = useSettingsStore.getState().enableExtendedContext;
    const isHeavyContext = conversationText.length > 4000 || /\[cite:|\bpaper\b/i.test(conversationText);

    let clean = "";
    let strategy: CompactionStrategy = "litert-standard";

    // Branch A: In-WASM RLM Recursive Compaction
    if (isRlmEnabled && isHeavyContext) {
        try {
            console.debug(
                `[Memory] Running in-WASM RLM recursive compaction for chat "${chatId}" ` +
                `(${middle.length} messages, ${Math.round(conversationText.length / 1024)}KB).`
            );
            strategy = "rlm-recursive";
            const rlmResult = await rlmService.analyzeDocument(
                {
                    query:
                        "Summarize the key discussion points, user requests, code/technical decisions, " +
                        "and research citations established in this conversation excerpt. " +
                        "Produce a comprehensive, structured summary for continuing the conversation.",
                    documentText: conversationText,
                    documentTitle: `Chat ${chatId} History Excerpt`,
                    maxDepth: 4,
                },
                instance
            );
            clean = rlmResult.answer.trim();
        } catch (rlmErr) {
            console.warn("[Memory] RLM recursive compaction failed, falling back to LiteRT single-pass:", rlmErr);
            strategy = "litert-standard";
            clean = "";
        }
    }

    // Branch B: Standard LiteRT-LM Conversation Summarization with safe prompt clamping
    if (!clean) {
        strategy = "litert-standard";

        // Clamp conversation text to ~8,000 characters (~2,000 tokens) so that the
        // summarization prompt never overflows the model's 4,096 KV-cache limit.
        let safeConversationText = conversationText;
        if (safeConversationText.length > 8000) {
            const head = safeConversationText.slice(0, 3800);
            const tail = safeConversationText.slice(-3800);
            safeConversationText = `${head}\n\n[... intermediate conversation turns omitted for context buffer ...]\n\n${tail}`;
        }

        const conversation = await instance.createConversation({
            preface: {
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a summarization assistant. Your sole task is to create a " +
                            "comprehensive yet concise summary of the conversation excerpt provided. " +
                            "Include: key topics discussed, decisions made, code written or reviewed, " +
                            "questions asked and answered, any important facts or context established, " +
                            "and the overall progression of the conversation. " +
                            "Write the summary in third-person prose. Do not add commentary or preamble — " +
                            "output only the summary itself.",
                    },
                ],
            },
        });

        const userPrompt =
            "Please summarize the following conversation excerpt. " +
            "The summary will be used as working memory to continue the conversation:\n\n" +
            `<CONVERSATION>\n${safeConversationText}\n</CONVERSATION>`;

        console.debug(
            `[Memory] Running LiteRT single-pass summarization for chat "${chatId}" ` +
            `(${middle.length} messages in middle slice).`
        );

        let accumulated = "";
        const stream = conversation.sendMessageStreaming(userPrompt);
        const reader = stream.getReader();
        try {
            while (true) {
                const { done, value: chunk } = await reader.read();
                if (done) break;
                if (chunk?.content) {
                    if (typeof chunk.content === "string") {
                        accumulated += chunk.content;
                    } else if (Array.isArray(chunk.content)) {
                        for (const part of chunk.content) {
                            if (part.type === "text" && part.text) {
                                accumulated += part.text;
                            }
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
            await conversation.delete().catch(() => {});
        }

        clean = accumulated
            .trim()
            .replace(/<turn\|>\s*$/, "")
            .replace(/<end_of_turn>\s*$/, "")
            .trim();
    }

    if (!clean) {
        throw new Error("[Memory] Summarization produced an empty result.");
    }

    // Estimate token savings
    const middleEstimatedTokens = Math.max(1, Math.round(conversationText.length / 3.7));
    const summaryEstimatedTokens = Math.max(1, Math.round(clean.length / 3.7));
    const tokensSaved = Math.max(0, middleEstimatedTokens - summaryEstimatedTokens);

    const ctx: MemoryContext = {
        chatId,
        summary: clean,
        summaryTokenCount: summaryEstimatedTokens,
        tokensSaved,
        strategy,
        createdAt: Date.now(),
        originalMessageCount: messages.length,
    };
    setMemoryContext(chatId, ctx);

    // Update memory store state
    useMemoryStore.getState().setCompactionSavings(tokensSaved, strategy);

    // Recalculate prompt tokens with compacted context
    const compactedMessages = applyMemoryContext(messages, chatId);
    const newCount = await countTokensForMessages(instance, compactedMessages);
    useMemoryStore.getState().setTokenCount(newCount);

    console.debug(
        `[Memory] Summarization complete for chat "${chatId}" (${strategy}). ` +
        `Saved ~${tokensSaved} tokens. Active prompt token count: ${newCount}.`
    );

    return { summary: clean, tokensSaved, strategy };
}
