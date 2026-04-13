import {
    addItemToStore,
    deleteItemFromStore,
    getAllFromStore,
    getItemByKey,
    initializeDB,
    updateItemInStore,
} from "@/lib/indexeddb";
import { ChatInfo, BuddhiAISavedChat } from "@/types/chat";
import type { BuddhiAIMessage, BuddhiAIChatTemplate } from "@/types/messages";
import type { UIMessage } from "ai";

// ─────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────

/**
 * Converts a single BuddhiAIMessage (old format) to a UIMessage (new format).
 * Old messages stored `content` as a string or BuddhiAIChatTemplate[].
 * New messages use `parts: UIMessagePart[]`.
 */
function legacyMessageToUIMessage(msg: BuddhiAIMessage, index: number): UIMessage {
    let text = "";
    if (typeof msg.content === "string") {
        text = msg.content;
    } else if (Array.isArray(msg.content)) {
        text = (msg.content as BuddhiAIChatTemplate[])
            .filter((c) => c.type === "text" && c.text)
            .map((c) => c.text as string)
            .join("\n");
    }
    return {
        id: `legacy-${index}`,
        role: msg.role as UIMessage["role"],
        parts: [{ type: "text", text }],
    };
}

/**
 * Normalizes a raw messages array from IndexedDB.
 * Handles both the current UIMessage format and the legacy BuddhiAIMessage format
 * (which lacked a `parts` array).
 */
function normalizeMessages(raw: unknown[]): UIMessage[] {
    return raw.map((msg, index) => {
        const m = msg as Record<string, unknown>;
        // UIMessage format: has a `parts` array
        if (Array.isArray(m.parts)) return m as unknown as UIMessage;
        // Legacy BuddhiAIMessage format: has a `content` field
        if ("content" in m) return legacyMessageToUIMessage(m as unknown as BuddhiAIMessage, index);
        // Unknown shape — emit a warning and return a blank assistant message
        console.warn("[normalizeMessages] Unrecognised message shape at index", index, m);
        return {
            id: `unknown-${index}`,
            role: "assistant" as UIMessage["role"],
            parts: [{ type: "text", text: "" }],
        };
    });
}

function toChatInfo(chat: BuddhiAISavedChat): ChatInfo {
    const numericId = parseInt(chat.id, 10);
    return {
        id: chat.id,
        title: chat.title ?? `Chat ${chat.id}`,
        message_count: chat.messages.length,
        updated_at:
            chat.updated_at ??
            (isNaN(numericId)
                ? new Date().toISOString()
                : new Date(numericId).toISOString()),
    };
}

// Lazy singleton DB connection shared by all chat functions
let _db: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
    if (typeof window === "undefined") {
        throw new Error("IndexedDB is not available in this environment.");
    }
    if (!_db) {
        _db = await initializeDB("buddhi-ai-database", 1, [{ name: "chats" }]);
    }
    return _db;
}

// ─────────────────────────────────────────────────────────
// Public chat API (used by NavChatHistory and HistoryPage)
// ─────────────────────────────────────────────────────────

export const chatsApi = {
    /**
     * Returns a paginated, time-sorted list of chats.
     */
    async list(
        limit: number = 10,
        offset: number = 0
    ): Promise<{ chats: ChatInfo[]; total: number }> {
        try {
            const idb = await getDB();
            const all = await getAllFromStore<BuddhiAISavedChat>(idb, "chats");

            const sorted = [...all].sort((a, b) => {
                const aTime = a.updated_at
                    ? new Date(a.updated_at).getTime()
                    : parseInt(a.id, 10) || 0;
                const bTime = b.updated_at
                    ? new Date(b.updated_at).getTime()
                    : parseInt(b.id, 10) || 0;
                return bTime - aTime;
            });

            return {
                chats: sorted.slice(offset, offset + limit).map(toChatInfo),
                total: sorted.length,
            };
        } catch (error) {
            console.error("[chatsApi.list] error:", error);
            throw error;
        }
    },

    /**
     * Permanently deletes a chat by id.
     */
    async delete(id: string): Promise<void> {
        try {
            const idb = await getDB();
            await deleteItemFromStore(idb, "chats", id);
        } catch (error) {
            console.error("[chatsApi.delete] error:", error);
            throw error;
        }
    },
};

// ─────────────────────────────────────────────────────────
// Chat session helpers (used by ChatSession in chat-interface.tsx)
// ─────────────────────────────────────────────────────────

/**
 * Derives a chat title from the first user message.
 * Truncates to 20 characters and appends "..." if longer.
 */
export function generateChatTitle(messages: UIMessage[]): string {
    const firstUser = messages.find((m) => m.role === "user");
    const text = (firstUser?.parts ?? [])
        .filter((p) => p.type === "text")
        .map((p) => (p as { type: "text"; text: string }).text)
        .join(" ")
        .trim();

    if (!text) return `Chat ${Date.now()}`;
    return text.length > 20 ? `${text.substring(0, 20)}...` : text;
}

/**
 * Fetches a single saved chat by ID.
 * Returns null if the chat does not exist or on any read error.
 */
export async function loadChat(
    chatId: string
): Promise<BuddhiAISavedChat | null> {
    try {
        const idb = await getDB();
        const chat = await getItemByKey<BuddhiAISavedChat>(
            idb,
            "chats",
            chatId
        );
        if (!chat) return null;
        // Normalise messages to UIMessage[] — handles legacy BuddhiAIMessage format
        return { ...chat, messages: normalizeMessages(chat.messages as unknown[]) };
    } catch (error) {
        console.error("[loadChat] error:", error);
        return null;
    }
}

/**
 * Persists a brand-new chat to IndexedDB.
 * Uses the current timestamp as the chat ID.
 * Returns the generated chatId.
 */
export async function createNewChat(
    messages: UIMessage[],
    title: string
): Promise<string> {
    try {
        const idb = await getDB();
        const chatId = Date.now().toString();
        const chatData: BuddhiAISavedChat = {
            id: chatId,
            title,
            messages,
            updated_at: new Date().toISOString(),
        };
        await addItemToStore<BuddhiAISavedChat>(idb, "chats", chatData, chatId);
        return chatId;
    } catch (error) {
        console.error("[createNewChat] error:", error);
        throw error;
    }
}

/**
 * Updates the messages of an existing chat in IndexedDB.
 * Fetches the current record to preserve its title unless a new title is provided.
 */
export async function updateExistingChat(
    chatId: string,
    messages: UIMessage[],
    title?: string
): Promise<void> {
    try {
        const idb = await getDB();
        let resolvedTitle = title;
        if (!resolvedTitle) {
            try {
                const existing = await getItemByKey<BuddhiAISavedChat>(
                    idb,
                    "chats",
                    chatId
                );
                resolvedTitle = existing?.title;
            } catch {
                // Non-fatal — title will just be undefined
            }
        }
        const chatData: BuddhiAISavedChat = {
            id: chatId,
            title: resolvedTitle,
            messages,
            updated_at: new Date().toISOString(),
        };
        await updateItemInStore<BuddhiAISavedChat>(
            idb,
            "chats",
            chatData,
            chatId
        );
    } catch (error) {
        console.error("[updateExistingChat] error:", error);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────
// Legacy helpers (kept for backward compatibility)
// ─────────────────────────────────────────────────────────

const initChatManager = async (): Promise<IDBDatabase> => {
    try {
        const idb = await initializeDB("buddhi-ai-database", 1, [
            { name: "chats" },
        ]);
        // Keep the lazy singleton in sync when the chat page initialises
        _db = idb;
        return idb;
    } catch (error) {
        console.error("Failed to initialize chat manager:", error);
        throw error;
    }
};

export { initChatManager };
