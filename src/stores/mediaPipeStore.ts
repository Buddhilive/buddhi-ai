import { LlmInference } from '@mediapipe/tasks-genai';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface WebLLMState {
  webLLMInstance?: LlmInference;
  webLLMModel?: string;
  setWebLLMInstance: (instance?: LlmInference) => void;
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