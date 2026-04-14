/**
 * buddhi-ai-core/chat-template-generator.ts
 *
 * Converts a BuddhiAIMessage[] conversation into a MediaPipe `Prompt` array
 * that can be fed directly to `LlmInference.generateResponse()`.
 *
 * TWO TEMPLATE FORMATS ARE SUPPORTED
 * -----------------------------------
 *  "gemma3n" (legacy) — Gemma 3n instruction-tuned format:
 *     <start_of_turn>role
 *     content
 *     <end_of_turn>
 *
 *     System prompts are injected into the first user turn because Gemma 3n
 *     does not recognise a "system" role.
 *
 *  "gemma4" (default) — Gemma 4 instruction-tuned format:
 *     <|turn>role
 *     content<turn|>
 *
 *     Gemma 4 natively understands "system", "user", and "model" roles.
 *     It also supports tool calling, extended thinking, and inline multimodal
 *     placeholders (<|image|> / <|audio|>).
 *
 * BACKWARD COMPATIBILITY
 * ----------------------
 * Old chats saved when Gemma 3n was the active model are stored as plain
 * UIMessage[] text — they carry no model-specific formatting. Loading them
 * under Gemma 4 with the "gemma4" template produces correct output because
 * the message content itself is format-agnostic.
 *
 * Pass templateVersion: "gemma3n" explicitly only when re-running the legacy
 * model (e.g. if a user has the old model cached locally).
 */

import type {
    Prompt,
    Image as MediaPipeImage,
    Audio as MediaPipeAudio,
} from "@mediapipe/tasks-genai";

/** Element type of a MediaPipe Prompt array. */
type PromptPart = string | MediaPipeImage | MediaPipeAudio;
import type {
    BuddhiAIMessage,
    BuddhiAIChatTemplate,
    BuddhiAIToolDefinition,
    BuddhiAIToolCall,
    BuddhiAIToolResponse,
    GemmaTemplateVersion,
} from "@/types/messages";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ChatTemplateOptions {
    /**
     * Which template format to use. Defaults to "gemma4".
     * Pass "gemma3n" only when using the legacy Gemma 3n model.
     */
    templateVersion?: GemmaTemplateVersion;
}

/**
 * Converts a conversation into a MediaPipe `Prompt` suitable for
 * `LlmInference.generateResponse()`.
 *
 * @param messages  - Full conversation history (system + user + assistant turns).
 * @param options   - Optional configuration; see `ChatTemplateOptions`.
 * @returns Promise that resolves to a `Prompt` array, or rejects with a
 *          descriptive error if the conversation is malformed.
 *
 * @example
 * // Gemma 4 (default)
 * const prompt = await generateChatTemplate(messages);
 *
 * @example
 * // Legacy Gemma 3n
 * const prompt = await generateChatTemplate(messages, { templateVersion: "gemma3n" });
 */
async function generateChatTemplate(
    messages: BuddhiAIMessage[],
    options?: ChatTemplateOptions
): Promise<Prompt> {
    const version = options?.templateVersion ?? "gemma4";
    try {
        validateMessages(messages, version);
        const result =
            version === "gemma3n"
                ? generateGemma3nTemplate(messages)
                : generateGemma4Template(messages);
        return result;
    } catch (error) {
        // Re-throw with context so callers can surface a human-readable message.
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(
            `[ChatTemplateGenerator] Failed to build ${version} template: ${msg}`
        );
    }
}

export { generateChatTemplate };

// ---------------------------------------------------------------------------
// Shared validation
// ---------------------------------------------------------------------------

function validateMessages(
    messages: BuddhiAIMessage[],
    version: GemmaTemplateVersion
): void {
    if (messages.length === 0) {
        throw new Error(
            "Messages array is empty. " +
                "At least one user or system message is required."
        );
    }

    if (messages[0].role === "assistant") {
        throw new Error(
            "The first message cannot be from the 'assistant' role. " +
                "Conversations must begin with a 'system' or 'user' message."
        );
    }

    // Gemma 3n: system role must only appear as the very first message
    // (it gets merged into the following user turn).
    if (version === "gemma3n") {
        for (let i = 1; i < messages.length; i++) {
            if (messages[i].role === "system") {
                throw new Error(
                    `System message found at position ${i} (0-indexed). ` +
                        "For Gemma 3n, the system message must be the first entry " +
                        "and will be merged into the first user turn."
                );
            }
        }
    }

    // Warn (but don't throw) for consecutive same-role turns — the model will
    // receive an unusual prompt and may produce incoherent output.
    const nonSystem = messages.filter((m) => m.role !== "system");
    for (let i = 1; i < nonSystem.length; i++) {
        if (nonSystem[i].role === nonSystem[i - 1].role) {
            console.warn(
                `[ChatTemplateGenerator] Warning: consecutive '${nonSystem[i].role}' ` +
                    `messages at filtered indices ${i - 1} and ${i}. ` +
                    "This may produce unexpected model output."
            );
        }
    }
}

// ---------------------------------------------------------------------------
// Shared helper: extract plain text from mixed content
// ---------------------------------------------------------------------------

function extractTextFromContent(
    content: BuddhiAIChatTemplate[] | string
): string {
    if (typeof content === "string") return content;
    return content
        .filter((item) => item.type === "text" && item.text != null)
        .map((item) => item.text!)
        .join("\n");
}

// ---------------------------------------------------------------------------
// Gemma 4 – value serialisation
// ---------------------------------------------------------------------------
// Gemma 4 uses a custom text encoding for tool arguments / responses rather
// than raw JSON.  Strings are delimited by <|"|> and composite values use
// brace / bracket notation.

function serializeValue(value: unknown): string {
    if (value === null || value === undefined) return "null";
    if (typeof value === "string") return `<|"|>${value}<|"|>`;
    if (typeof value === "number" || typeof value === "boolean")
        return String(value);
    if (Array.isArray(value))
        return `[${value.map(serializeValue).join(",")}]`;
    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .map(([k, v]) => `${k}:${serializeValue(v)}`)
            .join(",");
        return `{${entries}}`;
    }
    // Fallback — wrap unknown types as strings
    return `<|"|>${String(value)}<|"|>`;
}

function serializeObject(obj: Record<string, unknown>): string {
    const entries = Object.entries(obj)
        .map(([k, v]) => `${k}:${serializeValue(v)}`)
        .join(",");
    return `{${entries}}`;
}

function serializeToolDeclaration(tool: BuddhiAIToolDefinition): string {
    const schema: Record<string, unknown> = {
        description: tool.description,
    };
    if (tool.parameters && Object.keys(tool.parameters).length > 0) {
        schema.parameters = tool.parameters;
    }
    if (tool.required && tool.required.length > 0) {
        schema.required = tool.required;
    }
    return serializeObject(schema);
}

function serializeToolCall(tc: BuddhiAIToolCall): string {
    if (Object.keys(tc.arguments).length === 0) {
        return `<|tool_call>call:${tc.name}{}<tool_call|>`;
    }
    return `<|tool_call>call:${tc.name}${serializeObject(tc.arguments)}<tool_call|>`;
}

function serializeToolResponse(tr: BuddhiAIToolResponse): string {
    if (Object.keys(tr.response).length === 0) {
        return `<|tool_response>response:${tr.name}{}<tool_response|>`;
    }
    return `<|tool_response>response:${tr.name}${serializeObject(tr.response)}<tool_response|>`;
}

// ---------------------------------------------------------------------------
// Gemma 4 template generator
// ---------------------------------------------------------------------------

function generateGemma4Template(messages: BuddhiAIMessage[]): Prompt {
    const parts: Prompt = [];

    for (const message of messages) {
        switch (message.role) {
            case "system": {
                const text = extractTextFromContent(message.content).trim();
                let turnContent = "";

                // <|think|> activates extended reasoning for the whole conversation.
                if (message.enableThinking) {
                    turnContent += "<|think|>\n";
                }

                turnContent += text;

                // Tool declarations follow the system prompt text.
                if (message.tools && message.tools.length > 0) {
                    const decls = message.tools
                        .map(
                            (t) =>
                                `<|tool>declaration:${t.name}${serializeToolDeclaration(t)}<tool|>`
                        )
                        .join("\n");
                    turnContent += `\n${decls}`;
                }

                parts.push(`<|turn>system\n${turnContent}<turn|>\n`);
                break;
            }

            case "user": {
                if (typeof message.content === "string") {
                    const text = message.content.trim();
                    if (!text) {
                        console.warn(
                            "[ChatTemplateGenerator] Empty user message encountered; skipping."
                        );
                        continue;
                    }
                    parts.push(`<|turn>user\n${text}<turn|>\n`);
                } else {
                    // Multimodal: inline placeholders in text, media objects appended after.
                    let textContent = "";
                    const mediaParts: Array<
                        { imageSource: string } | { audioSource: string }
                    > = [];

                    for (const item of message.content) {
                        if (item.type === "text" && item.text) {
                            textContent += item.text.trim();
                        } else if (item.type === "image" && item.url) {
                            textContent += "<|image|>";
                            mediaParts.push({ imageSource: item.url });
                        } else if (item.type === "audio" && item.url) {
                            textContent += "<|audio|>";
                            mediaParts.push({ audioSource: item.url });
                        }
                    }

                    if (!textContent && mediaParts.length === 0) {
                        console.warn(
                            "[ChatTemplateGenerator] User message has no content; skipping."
                        );
                        continue;
                    }

                    parts.push(`<|turn>user\n${textContent}<turn|>\n`);
                    for (const mp of mediaParts) {
                        parts.push(mp as PromptPart);
                    }
                }
                break;
            }

            case "assistant": {
                let turnContent = "";

                // Extended thinking block (strip from follow-up turns per Gemma 4 docs,
                // but include here so earlier turns in the context are well-formed).
                if (message.thinking) {
                    turnContent += `<|channel>thought\n${message.thinking}\n<channel|>`;
                }

                // Tool calls emitted by the model.
                if (message.toolCalls && message.toolCalls.length > 0) {
                    for (const tc of message.toolCalls) {
                        turnContent += `${serializeToolCall(tc)}\n`;
                    }
                }

                // Tool execution results fed back to the model.
                if (message.toolResponses && message.toolResponses.length > 0) {
                    for (const tr of message.toolResponses) {
                        turnContent += `${serializeToolResponse(tr)}\n`;
                    }
                }

                // Visible assistant text (may be absent if the turn is pure tool use).
                const text =
                    typeof message.content === "string"
                        ? message.content.trim()
                        : extractTextFromContent(message.content).trim();
                if (text) {
                    turnContent += text;
                }

                if (!turnContent) {
                    console.warn(
                        "[ChatTemplateGenerator] Assistant message has no content; skipping."
                    );
                    continue;
                }

                parts.push(`<|turn>model\n${turnContent}<turn|>\n`);
                break;
            }

            default: {
                // TypeScript exhaustiveness guard — should never reach here at runtime.
                const unknown = (message as BuddhiAIMessage).role;
                throw new Error(
                    `Unrecognised message role '${unknown}'. ` +
                        "Expected 'system', 'user', or 'assistant'."
                );
            }
        }
    }

    // Open the model's response turn — MediaPipe continues generation from here.
    parts.push("<|turn>model\n");
    return parts;
}

// ---------------------------------------------------------------------------
// Gemma 3n template generator (legacy)
// ---------------------------------------------------------------------------
// Preserved verbatim in its behaviour so that any Gemma 3n model file that
// is still cached locally continues to produce correct output.

function generateGemma3nTemplate(messages: BuddhiAIMessage[]): Prompt {
    // Extract system prefix from the first message (if present).
    const systemPrefix =
        messages[0].role === "system"
            ? extractTextFromContent(messages[0].content)
            : null;

    const parts: Prompt = [];

    for (const message of messages) {
        const role = message.role === "assistant" ? "model" : message.role;

        // The system message is merged into the first turn and handled below.
        if (message.role === "system") {
            parts.push(`<start_of_turn>${role}\n${systemPrefix!.trim()}\n<end_of_turn>\n`);
            continue;
        }

        if (message.role === "user" && typeof message.content === "string") {
            // First user turn: prepend the system prefix when no explicit system
            // message was provided (chat-api.ts injects it directly into content).
            parts.push(
                `<start_of_turn>${role}\n${message.content.trim()}\n<end_of_turn>\n`
            );
            continue;
        }

        if (message.role === "user" && Array.isArray(message.content)) {
            for (const item of message.content) {
                if (item.type === "text" && item.text) {
                    parts.push(
                        `<start_of_turn>${role}\n${item.text.trim()}\n`
                    );
                } else if (item.type === "image" && item.url) {
                    parts.push({ imageSource: item.url } as PromptPart);
                } else if (item.type === "audio" && item.url) {
                    parts.push({ audioSource: item.url } as PromptPart);
                }
            }
            parts.push("<end_of_turn>\n");
            continue;
        }

        if (message.role === "assistant" && typeof message.content === "string") {
            parts.push(
                `<start_of_turn>${role}\n${message.content.trim()}\n<end_of_turn>\n`
            );
            continue;
        }

        // Assistant message with array content — extract text only.
        if (message.role === "assistant" && Array.isArray(message.content)) {
            const text = extractTextFromContent(message.content).trim();
            if (text) {
                parts.push(
                    `<start_of_turn>${role}\n${text}\n<end_of_turn>\n`
                );
            }
            continue;
        }
    }

    // Open the model's response turn.
    parts.push("<start_of_turn>model\n");
    return parts;
}
