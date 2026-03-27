import { LlmInference } from '@mediapipe/tasks-genai';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface WebLLMState {
  webLLMInstance?: LlmInference;
  webLLMModel?: string;
  webLLMStatus?: "idle" | "loading" | "ready" | "error";
  setWebLLMInstance: (instance?: LlmInference) => void;
  setWebLLMModel: (model?: string) => void;
  setWebLLMStatus: (status?: "idle" | "loading" | "ready" | "error") => void;
}

export const useWebLLMStore = create<WebLLMState>()(
  devtools((set) => ({
    webLLMInstance: undefined,
    webLLMModel: undefined,
    webLLMStatus: "idle",
    setWebLLMModel: (model) => set({ webLLMModel: model }),
    setWebLLMInstance: (instance) => set({ webLLMInstance: instance }),
    setWebLLMStatus: (status) => set({ webLLMStatus: status }),
  }))
);