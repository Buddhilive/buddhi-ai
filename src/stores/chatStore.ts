import { Message } from '@/types/chat';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  inputValue: string;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setInputValue: (value: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  devtools((set) => ({
    messages: [],
    isLoading: false,
    error: null,
    inputValue: '',
    
    addMessage: (message) => 
      set((state) => ({ messages: [...state.messages, message] })),
    
    setMessages: (messages) => set({ messages }),
    
    setIsLoading: (isLoading) => set({ isLoading }),
    
    setError: (error) => set({ error }),
    
    setInputValue: (inputValue) => set({ inputValue }),
    
    clearMessages: () => set({ 
      messages: [],
      error: null,
      isLoading: false
    }),
  }))
);