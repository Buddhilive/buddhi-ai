import {
    addItemToStore,
    deleteItemFromStore,
    getAllFromStore,
    initializeDB,
    updateItemInStore,
} from "@/lib/indexeddb";
import { ChatInfo, BuddhiAISavedChat } from "@/types/chat";
import { BuddhiAIMessage } from "@/types/messages";

// ─────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────

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

// Lazy singleton DB connection shared by chatsApi
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
// Legacy helpers (used by chat page)
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

const saveOrUpdateChatMessages = async (
    idb: IDBDatabase,
    chatId: string,
    messages: BuddhiAIMessage[],
    title?: string,
    isNewChat: boolean = false
): Promise<void> => {
    try {
        const chatData: BuddhiAISavedChat = {
            id: chatId,
            title,
            messages,
            updated_at: new Date().toISOString(),
        };

        if (isNewChat) {
            await addItemToStore<BuddhiAISavedChat>(idb, "chats", chatData, chatId);
        } else {
            await updateItemInStore<BuddhiAISavedChat>(
                idb,
                "chats",
                chatData,
                chatId
            );
        }
    } catch (error) {
        console.error("Failed to save or update chat messages:", error);
        throw error;
    }
};

export { initChatManager, saveOrUpdateChatMessages };