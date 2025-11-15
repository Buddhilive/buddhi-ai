import { BuddhiAISavedChat } from '@/lib/chat-manager';
import { ChatCompletionAssistantMessageParam } from '@mlc-ai/web-llm';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ChatState {
  messages: ChatCompletionAssistantMessageParam[];
  inputValue: string;
  chatHistory: BuddhiAISavedChat[];
  chatDB?: IDBDatabase;
  currentChat: BuddhiAISavedChat | null;
  setChatDB: (db: IDBDatabase) => void;
  addMessage: (message: ChatCompletionAssistantMessageParam) => void;
  setMessages: (messages: ChatCompletionAssistantMessageParam[]) => void;
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
    }),
  }))
);