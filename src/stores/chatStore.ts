import { BuddhiAISavedChat } from '@/lib/chat-manager';
import { BuddhiAIMessage } from '@/lib/chat-template-generator';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ChatState {
  messages: BuddhiAIMessage[];
  inputValue: string;
  chatHistory: BuddhiAISavedChat[];
  chatDB?: IDBDatabase;
  currentChat: BuddhiAISavedChat | null;
  setChatDB: (db: IDBDatabase) => void;
  addMessage: (message: BuddhiAIMessage) => void;
  setMessages: (messages: BuddhiAIMessage[]) => void;
  setChatHistory: (chatHistory: BuddhiAISavedChat[]) => void;
  setInputValue: (value: string) => void;
  setCurrentChat: (chat: BuddhiAISavedChat | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  devtools((set) => ({
    messages: [],
    chatHistory: [],
    inputValue: '',
    chatDB: undefined,
    setChatDB: (db) => set({ chatDB: db }),   
    addMessage: (message) => 
      set((state) => ({ messages: [...state.messages, message] })),   
    setMessages: (messages) => set({ messages }),
    setChatHistory: (chatHistory) => set({ chatHistory }),
    setInputValue: (inputValue) => set({ inputValue }),
    setCurrentChat: (currentChat) => set({ currentChat }),   
    clearMessages: () => set({ 
      messages: [],
    })
  }))
);