import { MLCEngineInterface } from '@mlc-ai/web-llm';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface WebLLMState {
  webLLMInstance?: MLCEngineInterface;
  setWebLLMInstance: (instance?: MLCEngineInterface) => void;
}

export const useWebLLMStore = create<WebLLMState>()(
  devtools((set) => ({
    webLLMInstance: undefined,
    setWebLLMInstance: (instance) => set({ webLLMInstance: instance }),
  }))
);