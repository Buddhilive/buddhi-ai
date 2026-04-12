import { BuddhiAIMessage } from "@/types/messages";

export interface ChatInfo {
    id: string;
    title: string;
    message_count: number;
    updated_at: string;
}

export interface BuddhiAISavedChat {
    id: string;
    title?: string;
    messages: BuddhiAIMessage[];
    updated_at?: string;
}
