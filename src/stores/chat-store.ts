import { BuddhiAISavedChat, ChatInfo, chatsApi } from '@/lib/chat-manager';
import { BuddhiAIMessage } from '@/types/messages';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ChatState {
    // ── Legacy fields (used by chat page & nav-favorites) ──
    messages: BuddhiAIMessage[];
    inputValue: string;
    chatHistory: BuddhiAISavedChat[];
    chatDB?: IDBDatabase;
    currentChat: BuddhiAISavedChat | null;

    // ── New fields (used by NavChatHistory & HistoryPage) ──
    chats: ChatInfo[];
    total: number;
    currentChatId: string | null;
    isLoading: boolean;

    // ── Legacy actions ──
    setChatDB: (db: IDBDatabase) => void;
    addMessage: (message: BuddhiAIMessage) => void;
    setMessages: (messages: BuddhiAIMessage[]) => void;
    setChatHistory: (chatHistory: BuddhiAISavedChat[]) => void;
    setInputValue: (value: string) => void;
    setCurrentChat: (chat: BuddhiAISavedChat | null) => void;
    clearMessages: () => void;

    // ── New actions ──
    setChats: (chats: ChatInfo[]) => void;
    setTotal: (total: number) => void;
    setCurrentChatId: (id: string | null) => void;
    setIsLoading: (loading: boolean) => void;
    /** Removes a chat from the local list and decrements total. */
    removeChat: (id: string) => void;
    /** Re-fetches the first page of chats from IndexedDB and updates the store. */
    refreshChats: () => Promise<void>;
}

export const useChatStore = create<ChatState>()(
    devtools((set) => ({
        // ── Legacy defaults ──
        messages: [],
        chatHistory: [],
        inputValue: '',
        chatDB: undefined,
        currentChat: null,

        // ── New defaults ──
        chats: [],
        total: 0,
        currentChatId: null,
        isLoading: false,

        // ── Legacy actions ──
        setChatDB: (db) => set({ chatDB: db }),
        addMessage: (message) =>
            set((state) => ({ messages: [...state.messages, message] })),
        setMessages: (messages) => set({ messages }),
        setChatHistory: (chatHistory) => set({ chatHistory }),
        setInputValue: (inputValue) => set({ inputValue }),
        setCurrentChat: (currentChat) => set({ currentChat }),
        clearMessages: () => set({ messages: [] }),

        // ── New actions ──
        setChats: (chats) => set({ chats }),
        setTotal: (total) => set({ total }),
        setCurrentChatId: (currentChatId) => set({ currentChatId }),
        setIsLoading: (isLoading) => set({ isLoading }),
        removeChat: (id) =>
            set((state) => ({
                chats: state.chats.filter((c) => c.id !== id),
                total: Math.max(0, state.total - 1),
            })),
        refreshChats: async () => {
            try {
                const { chats, total } = await chatsApi.list(10, 0);
                set({ chats, total });
            } catch (error) {
                console.error('[chatStore.refreshChats] error:', error);
            }
        },
    }))
);