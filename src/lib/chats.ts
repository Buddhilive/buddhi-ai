"use client";

import { PGlite } from "@electric-sql/pglite";

// ─── Types ────────────────────────────────────────────────────────────────

export interface ChatInfo {
  id: number;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  chat_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatDetail {
  id: number;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatListResponse {
  chats: ChatInfo[];
  total: number;
}

// ─── PGlite Singleton ─────────────────────────────────────────────────────

let _db: PGlite | null = null;
let _dbInitPromise: Promise<PGlite> | null = null;

async function getChatsDB(): Promise<PGlite> {
  if (_db) return _db;
  if (_dbInitPromise) return _dbInitPromise;

  _dbInitPromise = (async () => {
    const db = new PGlite("idb://buddhi-ai-chats");

    // Initialize schema
    await db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id         SERIAL PRIMARY KEY,
        title      TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id         SERIAL PRIMARY KEY,
        chat_id    INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
        content    TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS chat_messages_chat_id_idx ON chat_messages(chat_id);
    `);

    _db = db;
    return db;
  })();

  return _dbInitPromise;
}

// ─── API Implementation ────────────────────────────────────────────────────

export const chatsApi = {
  /** Create a new chat. Title should already be truncated to ≤27 chars by caller. */
  async create(title: string): Promise<ChatInfo> {
    try {
      const db = await getChatsDB();
      const result = await db.query<{ id: number; created_at: string; updated_at: string }>(
        "INSERT INTO chats (title) VALUES ($1) RETURNING id, created_at, updated_at",
        [title]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        title,
        message_count: 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (err) {
      console.error("[chatsApi.create] error:", err);
      throw new Error(`Failed to create chat: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  },

  /** List chats ordered by newest first. */
  async list(limit = 10, offset = 0): Promise<ChatListResponse> {
    try {
      const db = await getChatsDB();

      // Get total count
      const countResult = await db.query<{ count: number }>("SELECT COUNT(*) as count FROM chats");
      const total = countResult.rows[0]?.count ?? 0;

      // Get paginated chats with message counts
      const chatsResult = await db.query<{
        id: number;
        title: string;
        message_count: string;
        created_at: string;
        updated_at: string;
      }>(
        `SELECT c.id, c.title, COUNT(m.id)::text as message_count, c.created_at, c.updated_at
         FROM chats c
         LEFT JOIN chat_messages m ON c.id = m.chat_id
         GROUP BY c.id, c.title, c.created_at, c.updated_at
         ORDER BY c.updated_at DESC
         LIMIT $1 OFFSET $2`,
        [limit.toString(), offset.toString()]
      );

      const chats = chatsResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        message_count: parseInt(row.message_count || "0", 10),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      return { chats, total };
    } catch (err) {
      console.error("[chatsApi.list] error:", err);
      throw new Error(`Failed to list chats: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  },

  /** Get a single chat with all its messages. */
  async get(chatId: number): Promise<ChatDetail> {
    try {
      const db = await getChatsDB();

      // Get chat info
      const chatResult = await db.query<{
        id: number;
        title: string;
        created_at: string;
        updated_at: string;
      }>(
        "SELECT id, title, created_at, updated_at FROM chats WHERE id = $1",
        [chatId]
      );

      if (!chatResult.rows[0]) {
        throw new Error(`Chat not found: ${chatId}`);
      }

      const chat = chatResult.rows[0];

      // Get all messages ordered by creation time
      const messagesResult = await db.query<ChatMessage>(
        `SELECT id, chat_id, role, content, created_at FROM chat_messages
         WHERE chat_id = $1
         ORDER BY created_at ASC`,
        [chatId]
      );

      return {
        id: chat.id,
        title: chat.title,
        messages: messagesResult.rows,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
      };
    } catch (err) {
      console.error("[chatsApi.get] error:", err);
      throw new Error(`Failed to get chat: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  },

  /** Delete a chat and all its messages. */
  async delete(chatId: number): Promise<void> {
    try {
      const db = await getChatsDB();
      await db.query("DELETE FROM chats WHERE id = $1", [chatId]);
    } catch (err) {
      console.error("[chatsApi.delete] error:", err);
      throw new Error(`Failed to delete chat: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  },

  /** Batch-append messages to an existing chat. */
  async addMessages(
    chatId: number,
    messages: { role: string; content: string }[],
  ): Promise<ChatMessage[]> {
    try {
      if (messages.length === 0) return [];

      const db = await getChatsDB();

      // Insert all messages in a transaction-like manner
      const insertedMessages: ChatMessage[] = [];

      for (const msg of messages) {
        const result = await db.query<ChatMessage>(
          `INSERT INTO chat_messages (chat_id, role, content)
           VALUES ($1, $2, $3)
           RETURNING id, chat_id, role, content, created_at`,
          [chatId, msg.role, msg.content]
        );
        insertedMessages.push(result.rows[0]);
      }

      // Update chat's updated_at timestamp
      await db.query("UPDATE chats SET updated_at = NOW() WHERE id = $1", [chatId]);

      return insertedMessages;
    } catch (err) {
      console.error("[chatsApi.addMessages] error:", err);
      throw new Error(`Failed to add messages: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  },
};
