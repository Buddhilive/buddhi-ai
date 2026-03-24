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

export const chatsApi = {
  /** Create a new chat. Title should already be truncated to ≤27 chars by caller. */
  async create(title: string): Promise<ChatInfo> {
    // TODO: implement
  },

  /** List chats ordered by newest first. */
  async list(limit = 10, offset = 0): Promise<ChatListResponse> {
    // TODO: implement
  },

  /** Get a single chat with all its messages. */
  async get(chatId: number): Promise<ChatDetail> {
    // TODO: implement
  },

  /** Delete a chat and all its messages. */
  async delete(chatId: number): Promise<void> {
    // TODO: implement
  },

  /** Batch-append messages to an existing chat. */
  async addMessages(
    chatId: number,
    messages: { role: string; content: string }[],
  ): Promise<ChatMessage[]> {
    // TODO: implement
  },
};
