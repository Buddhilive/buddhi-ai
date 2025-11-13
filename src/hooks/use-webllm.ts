import { initWebLLMEngine } from "@/lib/webllm-provider";
import { InitProgressCallback } from "@mlc-ai/web-llm";
import { useState } from "react";

export interface WebLLMState {
  isInitialized: boolean;
  progress: number;
  text: string;
  timeElapsed: number;
}

export const useWebLLM = () => {
  const [webLLMState, setWebLLMState] = useState<WebLLMState>({
    isInitialized: false,
    progress: 0,
    text: "",
    timeElapsed: 0,
  });

  const getWebLLMState: InitProgressCallback = async ({
    progress,
    text,
    timeElapsed,
  }) => {
    setWebLLMState({
      isInitialized: progress === 1,
      progress: Number((progress * 100).toFixed(2)),
      text,
      timeElapsed,
    });
  };

  try {
    initWebLLMEngine(getWebLLMState);
  } catch (error) {
    console.error("Failed to initialize WebLLM:", error);
  }

  return { webLLMState };
};
