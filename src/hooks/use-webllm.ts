import { initWebLLMEngine } from "@/lib/webllm-provider";
import { InitProgressCallback, MLCEngine } from "@mlc-ai/web-llm";
import { useState, useEffect, useRef, useCallback } from "react";

export interface WebLLMState {
  isInitialized: boolean;
  isInitializing: boolean;
  progress: number;
  text: string;
  timeElapsed: number;
  error: string | null;
  engine: MLCEngine | null;
}

export const useWebLLM = () => {
  const [webLLMState, setWebLLMState] = useState<WebLLMState>({
    isInitialized: false,
    isInitializing: false,
    progress: 0,
    text: "Starting initialization...",
    timeElapsed: 0,
    error: null,
    engine: null,
  });
  
  const initializationRef = useRef(false);
  const engineRef = useRef<MLCEngine | null>(null);
  
  const getWebLLMState: InitProgressCallback = useCallback(({
    progress,
    text,
    timeElapsed,
  }) => {
    let isReady = false;
    if (engineRef) {
      isReady = true;
    }
    setWebLLMState(prev => ({
      ...prev,
      isInitializing: progress < 1,
      isInitialized: isReady,
      progress: Number((progress * 100).toFixed(2)),
      text,
      timeElapsed,
      error: null,
    }));
  }, []);
  
  const initializeEngine = useCallback(async () => {
    if (initializationRef.current || engineRef.current) {
      return;
    }
    
    initializationRef.current = true;
    
    setWebLLMState(prev => ({
      ...prev,
      isInitializing: true,
      error: null,
      text: "Initializing WebLLM engine...",
    }));
    
    try {
      const engine = await initWebLLMEngine(getWebLLMState);
      engineRef.current = engine;
      
      setWebLLMState(prev => ({
        ...prev,
        engine,
        isInitialized: true,
        isInitializing: false,
        text: "WebLLM ready!",
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Failed to initialize WebLLM:", error);
      
      setWebLLMState(prev => ({
        ...prev,
        error: errorMessage,
        isInitializing: false,
        isInitialized: false,
        text: "Failed to initialize WebLLM",
      }));
    }
  }, [getWebLLMState]);
  
  useEffect(() => {
    // Only initialize if we're in a browser environment
    if (typeof window !== 'undefined' && !initializationRef.current) {
      // Add a small delay to ensure the component is fully mounted
      const timeoutId = setTimeout(() => {
        initializeEngine();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [initializeEngine]);
  
  const retryInitialization = useCallback(() => {
    initializationRef.current = false;
    engineRef.current = null;
    initializeEngine();
  }, [initializeEngine]);

  return { webLLMState, retryInitialization };
};
