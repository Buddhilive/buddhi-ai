import { initWebLLMEngine } from "@/lib/webllm-provider";
import { InitProgressCallback, MLCEngineInterface } from "@mlc-ai/web-llm";
import { useState, useEffect } from "react";

export interface WebLLMState {
  progress: number;
  text: string;
  timeElapsed: number;
  error: string | null;
  engine: MLCEngineInterface | null;
  isInitialized?: boolean;
}

export const useWebLLM = () => {
  const [webLLMState, setWebLLMState] = useState<WebLLMState>({
    progress: 0,
    text: "Starting initialization...",
    timeElapsed: 0,
    error: null,
    engine: null,
    isInitialized: false,
  });
  
  
  const getWebLLMState: InitProgressCallback = ({ progress, text, timeElapsed }) => {
    setWebLLMState((prevState) => ({
      ...prevState,
      progress,
      text,
      timeElapsed,
    }));
  }

  const initializeWebLLM = async () => {
    try {
      const engine = await initWebLLMEngine(getWebLLMState);
      setWebLLMState((prevState) => ({
        ...prevState,
        engine,
        text: "WebLLM Engine initialized successfully.",
        isInitialized: true,
      }));
    } catch (error) {
      setWebLLMState((prevState) => ({
        ...prevState,
        error: (error as Error).message || "An error occurred during initialization.",
      }));
    }
  }

  const retryInitialization = () => {
    setWebLLMState((prevState) => ({
      ...prevState,
      progress: 0,
      text: "Retrying initialization...",
      timeElapsed: 0,
      error: null,
      engine: null,
      isInitialized: false,
    }));
    initializeWebLLM();
  };

  useEffect(() => {
    initializeWebLLM();
  }, []);

  return { webLLMState, retryInitialization };
};
