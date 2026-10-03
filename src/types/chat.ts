import type { UIMessage } from "ai";

export type ChatMode = "library" | "paper";

export interface ChatInfo {
    id: string;
    title: string;
    message_count: number;
    updated_at: string;
    chatMode?: ChatMode;
    paperId?: string;
    paperTitle?: string;
}

export interface BuddhiAISavedChat {
    id: string;
    title?: string;
    messages: UIMessage[];
    updated_at?: string;
    chatMode?: ChatMode;
    paperId?: string;
    paperTitle?: string;
}
