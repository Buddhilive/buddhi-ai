import type { UIMessage } from "ai";

export interface ChatInfo {
    id: string;
    title: string;
    message_count: number;
    updated_at: string;
}

export interface BuddhiAISavedChat {
    id: string;
    title?: string;
    messages: UIMessage[];
    updated_at?: string;
}
