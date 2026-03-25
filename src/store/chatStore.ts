"use client";

import { create } from "zustand";
import { chatsApi, type ChatInfo } from "@/lib/chats";

interface ChatStore {
  chats: ChatInfo[];
  total: number;
  currentChatId: number | null;
  isLoading: boolean;
  fetchChats: () => Promise<void>;
  addChat: (chat: ChatInfo) => void;
  removeChat: (id: number) => void;
  setCurrentChatId: (id: number | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  total: 0,
  currentChatId: null,
  isLoading: false,

  fetchChats: async () => {
    set({ isLoading: true });
    try {
      const { chats, total } = await chatsApi.list(10, 0);
      set({ chats, total });
    } catch (err) {
      console.error("[useChatStore] fetchChats error:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  addChat: (chat: ChatInfo) => {
    set((state) => ({
      chats: [chat, ...state.chats],
      total: state.total + 1,
    }));
  },

  removeChat: (id: number) => {
    set((state) => ({
      chats: state.chats.filter((c) => c.id !== id),
      total: Math.max(0, state.total - 1),
    }));
  },

  setCurrentChatId: (id: number | null) => {
    set({ currentChatId: id });
  },
}));
