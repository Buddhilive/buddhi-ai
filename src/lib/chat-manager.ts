import {
    addItemToStore,
    deleteItemFromStore,
    getAllFromStore,
    getItemByKey,
    initializeDB,
    updateItemInStore,
} from "@/lib/indexeddb";
import { ChatInfo, BuddhiAISavedChat } from "@/types/chat";
export type { ChatInfo };
import type { BuddhiAIMessage, BuddhiAIChatTemplate } from "@/types/messages";
import type { UIMessage } from "ai";

// ─────────────────────────────────────────────────────────
// File-part serialisation helpers
// ─────────────────────────────────────────────────────────

/**
 * Converts a `blob:` URL to a `data:` URL so that file attachments survive
 * page reloads.  Blob object URLs are revoked when the tab closes; data URLs
 * (base64) are self-contained and persist in IndexedDB.
 *
 * Returns `null` on any fetch / FileReader error so callers can fall back
 * gracefully instead of storing a broken URL.
 */
async function blobUrlToDataUrl(blobUrl: string): Promise<string | null> {
    try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => {
                console.error(
                    "[serializeMessagesForStorage] FileReader error converting blob URL to data URL."
                );
                resolve(null);
            };
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.error(
            "[serializeMessagesForStorage] Failed to fetch blob URL for serialisation:",
            err
        );
        return null;
    }
}

/**
 * Walks every `file` part in a `UIMessage[]` and replaces ephemeral `blob:`
 * URLs with persistent `data:` (base64) URLs before the messages are written
 * to IndexedDB.
 *
 * Non-file parts and file parts that already have a `data:` URL are returned
 * unchanged.  If a blob URL cannot be fetched the original part is kept with
 * a console warning — the attachment will display correctly for the current
 * session but will be lost on reload.
 */
export async function serializeMessagesForStorage(
    messages: UIMessage[]
): Promise<UIMessage[]> {
    return Promise.all(
        messages.map(async (msg) => ({
            ...msg,
            parts: await Promise.all(
                msg.parts.map(async (part) => {
                    if (part.type !== "file") return part;

                    const filePart = part as { type: "file"; url?: string } & Record<string, unknown>;
                    // Already a data URL or no URL at all — nothing to do.
                    if (!filePart.url?.startsWith("blob:")) return part;

                    const dataUrl = await blobUrlToDataUrl(filePart.url);
                    if (!dataUrl) {
                        console.warn(
                            "[serializeMessagesForStorage] Could not serialise blob URL for " +
                            `"${(filePart as { filename?: string }).filename ?? "file"}". ` +
                            "The attachment will not be visible after page reload."
                        );
                        return part; // keep original — better than dropping the part entirely
                    }
                    return { ...part, url: dataUrl };
                })
            ),
        }))
    );
}

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
