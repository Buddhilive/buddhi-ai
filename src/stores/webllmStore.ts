import { MLCEngineInterface } from '@mlc-ai/web-llm';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface WebLLMState {
  webLLMInstance?: MLCEngineInterface;
  webLLMModel?: string;
  setWebLLMInstance: (instance?: MLCEngineInterface) => void;
  setWebLLMModel: (model?: string) => void;
}

export const useWebLLMStore = create<WebLLMState>()(
  devtools((set) => ({
    webLLMInstance: undefined,
    webLLMModel: undefined,
    setWebLLMModel: (model) => set({ webLLMModel: model }),
    setWebLLMInstance: (instance) => set({ webLLMInstance: instance }),
  }))
);