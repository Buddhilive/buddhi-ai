/**
 * Which Gemma chat-template format to use when formatting a conversation.
 *
 * - "gemma3n" – legacy `<start_of_turn>` / `<end_of_turn>` format used by Gemma 3n.
 *              System prompts are injected into the first user turn.
 * - "gemma4"  – new `<|turn>role\ncontent<turn|>` format used by Gemma 4.
 *              Supports a native system role, tool calling, and extended thinking.
 */
export type GemmaTemplateVersion = "gemma3n" | "gemma4";

type BuddhiAIChatRole = "system" | "user" | "assistant";

type BuddhiAIContentType = "text" | "image" | "audio";

interface BuddhiAIChatTemplate {
    type: BuddhiAIContentType;
    text?: string;
    url?: string;
    mediaType?: string;
    fileName?: string;
    // RAG source metadata
    source?: string;       // Document name
    documentId?: string;   // Document ID for tracking
    chunkId?: string;      // Chunk ID within document
    score?: number;        // Similarity score from retrieval
}

// ---------------------------------------------------------------------------
// Tool-calling types (Gemma 4 only)
// ---------------------------------------------------------------------------

/**
 * Describes a single parameter in a tool's schema.
 */
interface BuddhiAIToolParameter {
    type: string; // "string" | "number" | "boolean" | "object" | "array"
    description?: string;
    enum?: string[];
    properties?: Record<string, BuddhiAIToolParameter>;
    required?: string[];
    items?: BuddhiAIToolParameter; // for array types
}

/**
 * Declares a callable tool available to the model.
 * Placed on the system message to register tools for the conversation.
 */
interface BuddhiAIToolDefinition {
    name: string;
    description: string;
    parameters?: Record<string, BuddhiAIToolParameter>;
    required?: string[]; // required parameter names
}

/**
 * Represents the model requesting execution of a specific tool.
 * Placed on the assistant message when the model emits a tool call.
 */
interface BuddhiAIToolCall {
    name: string;
    arguments: Record<string, unknown>;
}

/**
 * Carries the result of a tool execution back to the model.
 * Placed on the assistant message alongside the toolCall that triggered it.
 */
interface BuddhiAIToolResponse {
    name: string;
    response: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Core message type
// ---------------------------------------------------------------------------

interface BuddhiAIMessage {
    role: BuddhiAIChatRole;
    content: BuddhiAIChatTemplate[] | string;

    // ── Gemma 4 tool-calling fields ──────────────────────────────────────────
    /** Available tools for this conversation. Set on the system message. */
    tools?: BuddhiAIToolDefinition[];
    /** Tool calls requested by the model in an assistant turn. */
    toolCalls?: BuddhiAIToolCall[];
    /** Results of tool executions, paired with the preceding toolCalls. */
    toolResponses?: BuddhiAIToolResponse[];

    // ── Gemma 4 thinking fields ──────────────────────────────────────────────
    /** Set to true on the system message to activate extended thinking (<|think|>). */
    enableThinking?: boolean;
    /** Captured reasoning content from a model turn (<|channel>thought…<channel|>). */
    thinking?: string;
}

export type {
    BuddhiAIMessage,
    BuddhiAIChatRole,
    BuddhiAIChatTemplate,
    BuddhiAIToolParameter,
    BuddhiAIToolDefinition,
    BuddhiAIToolCall,
    BuddhiAIToolResponse,
};
