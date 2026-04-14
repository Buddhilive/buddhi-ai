/**
 * lib/memory.ts
 *
 * Session-based memory management for chat conversations.
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
 * Summarization is triggered when the prompt token count exceeds
 * SUMMARIZATION_THRESHOLD. The summary is stored in sessionStorage (keyed by
 * chatId) so it persists for the browser session but does NOT affect the full
 * history saved to IndexedDB.
 *
 * IMPORTANT CONSTRAINT
 * --------------------
 * LlmInference.sizeInTokens() and LlmInference.generateResponse() are
 * mutually exclusive — you cannot call sizeInTokens while generateResponse is
 * running. Token counting should only happen when status === "ready".
 */

import { generateChatTemplate } from "@/lib/buddhi-ai-core/chat-template-generator";
import type { BuddhiAIMessage, GemmaTemplateVersion } from "@/types/messages";
import type { LlmInference } from "@mediapipe/tasks-genai";
import type { UIMessage } from "ai";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Token threshold that triggers automatic summarization. */
export const SUMMARIZATION_THRESHOLD = 120_000;

/**
 * Maximum context window size for display in the Context component.
 * Reflects the maxTokens value configured in use-ai-model.ts.
 */
export const MAX_CONTEXT_TOKENS = 124_000;

/**
 * Maximum number of middle-slice messages sent to the summarizer.
 * Guards against summarization prompts that are themselves too large.
 */
const MAX_MIDDLE_MESSAGES = 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemoryContext {
    chatId: string;
    /** The generated summary of the middle conversation slice. */
    summary: string;
    /** Token count of the summary text (informational). */
    summaryTokenCount: number;
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
    // With fewer messages there's nothing meaningful to summarize.
    if (body.length < 6) {
        // Still split correctly for consistency, even if middle is empty.
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
 *
 * Called from MediaPipeChatTransport.sendMessages() before building the prompt.
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
        // Nothing was summarized yet — history is short enough to pass through.
        return messages;
    }

    const { system, firstTurn, lastTurn } = sliceMessages(messages);

    const summaryMessage: BuddhiAIMessage = {
        role: "assistant",
        content:
            `[Conversation summary — ${new Date(ctx.createdAt).toLocaleString()}]\n\n` +
            ctx.summary,
    };

    console.debug(
        `[Memory] Applied memory context for chat "${chatId}". ` +
        `Replaced ${middle.length} middle messages with summary.`
    );

    return [...system, ...firstTurn, summaryMessage, ...lastTurn];
}

// ---------------------------------------------------------------------------
// Token counting
// ---------------------------------------------------------------------------

/**
 * Counts the tokens in a BuddhiAIMessage[] by building a Gemma prompt and
 * calling LlmInference.sizeInTokens() on it.
 *
 * Returns 0 on any error (sizeInTokens returning undefined, template build
 * failure, etc.) so callers can proceed safely without hard errors.
 *
 * ⚠️  Do NOT call this while generateResponse() is active — MediaPipe does not
 * allow concurrent inference and tokenization.
 */
export async function countTokensForMessages(
    instance: LlmInference,
    messages: BuddhiAIMessage[],
    templateVersion: GemmaTemplateVersion,
): Promise<number> {
    if (messages.length === 0) return 0;
    try {
        const prompt = await generateChatTemplate(messages, { templateVersion });
        const count = instance.sizeInTokens(prompt);
        if (count === undefined) {
            console.warn(
                "[Memory] sizeInTokens returned undefined — " +
                "cannot determine token count. Returning 0."
            );
            return 0;
        }
        return count;
    } catch (err) {
        console.warn("[Memory] Failed to count tokens:", err);
        return 0;
    }
}

// ---------------------------------------------------------------------------
// UIMessage → BuddhiAIMessage conversion (text-only)
// ---------------------------------------------------------------------------

/**
 * Converts a UIMessage[] to BuddhiAIMessage[] extracting only text parts.
 * Media parts (image, audio, file) are intentionally ignored — the summarizer
 * works on conversation text only.
 *
 * Optionally prepends a system message when `systemPrompt` is provided:
 *   - Gemma 4: prepended as role "system"
 *   - Gemma 3n: injected into the first user message (legacy behaviour)
 */
export function extractBuddhiMessages(
    uiMessages: UIMessage[],
    systemPrompt: string,
    templateVersion: GemmaTemplateVersion,
): BuddhiAIMessage[] {
    const converted: BuddhiAIMessage[] = uiMessages.map((msg) => {
        const text = msg.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("\n");

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
    } else {
        text = msg.content
            .filter((p) => p.type === "text")
            .map((p) => p.text ?? "")
            .join(" ");
    }

    // Include tool calls/responses in the text if present (informational).
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
 * Accepts `UIMessage[]` (from useChat) and `systemPrompt` so it can build the
 * full `BuddhiAIMessage[]` internally without needing the chat transport.
 * Only text parts are used — media is not needed for a text summary.
 *
 * The summarization itself uses a dedicated system prompt and Gemma 4 chat
 * format. `generateResponse` is awaited via a Promise.
 *
 * Throws a descriptive `Error` if:
 *  - The middle slice is empty (nothing to summarize).
 *  - Template generation fails.
 *  - `generateResponse` rejects.
 *
 * The caller (chat-interface.tsx) is responsible for setting `isSummarizing`
 * in useMemoryStore and for showing the "Summarizing…" shimmer.
 */
export async function runSummarization(
    instance: LlmInference,
    uiMessages: UIMessage[],
    systemPrompt: string,
    chatId: string,
    templateVersion: GemmaTemplateVersion,
): Promise<string> {
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
        return "";
    }

    const conversationText = middle.map(formatMessageForSummary).join("\n\n");

    const summarizationMessages: BuddhiAIMessage[] = [
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
        {
            role: "user",
            content:
                "Please summarize the following conversation excerpt. " +
                "The summary will be used as working memory to continue the conversation:\n\n" +
                `<CONVERSATION>\n${conversationText}\n</CONVERSATION>`,
        },
    ];

    let prompt;
    try {
        prompt = await generateChatTemplate(summarizationMessages, { templateVersion });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`[Memory] Failed to build summarization template: ${msg}`);
    }

    console.debug(
        `[Memory] Running summarization for chat "${chatId}" ` +
        `(${middle.length} messages in middle slice).`
    );

    const summary = await new Promise<string>((resolve, reject) => {
        let accumulated = "";
        try {
            instance.generateResponse(prompt, (chunk: string, done: boolean) => {
                if (done) {
                    // Strip trailing template tokens that may bleed through.
                    const clean = accumulated
                        .trim()
                        .replace(/<turn\|>\s*$/, "")
                        .replace(/<end_of_turn>\s*$/, "")
                        .trim();
                    resolve(clean);
                } else {
                    accumulated += chunk;
                }
            });
        } catch (err) {
            reject(
                new Error(
                    `[Memory] generateResponse threw during summarization: ${err instanceof Error ? err.message : String(err)
                    }`
                )
            );
        }
    });

    if (!summary) {
        throw new Error("[Memory] Summarization produced an empty result.");
    }

    const ctx: MemoryContext = {
        chatId,
        summary,
        summaryTokenCount: 0, // Counted separately if needed; kept as 0 to avoid extra LLM call.
        createdAt: Date.now(),
        originalMessageCount: messages.length,
    };
    setMemoryContext(chatId, ctx);

    console.debug(
        `[Memory] Summarization complete for chat "${chatId}". ` +
        `Summary length: ${summary.length} chars.`
    );

    return summary;
}
