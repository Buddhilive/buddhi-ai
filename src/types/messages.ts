type BuddhiAIChatRole = "system" | "user" | "assistant";

type BuddhiAIContentType = "text" | "image" | "audio";

interface BuddhiAIChatTemplate {
    type: BuddhiAIContentType;
    text?: string;
    url?: string;
    mediaType?: string;
    fileName?: string;
    // RAG source metadata
    source?: string; // Document name
    documentId?: string; // Document ID for tracking
    chunkId?: string; // Chunk ID within document
    score?: number; // Similarity score from retrieval
}

interface BuddhiAIMessage {
    role: BuddhiAIChatRole;
    content: BuddhiAIChatTemplate[] | string;
}

export type { BuddhiAIMessage, BuddhiAIChatRole, BuddhiAIChatTemplate };