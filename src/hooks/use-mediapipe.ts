import { initMediapipeGenAI } from "@/lib/mediapipe-provider";
import { FilesetResolver, LlmInference } from "@mediapipe/tasks-genai";
import { WorkerResponse } from "@/workers/mediapipe-worker";
import { useEffect, useState } from "react";

export interface mediaPipeState {
  progress: number;
  text: string;
  error: string | null;
  engine: LlmInference | null;
  isInitialized?: boolean;
}

export const useMediapipe = () => {
  const [mediaPipeState, setMediaPipeState] = useState<mediaPipeState>({
    progress: 0,
    text: "Starting initialization...",
    error: null,
    engine: null,
    isInitialized: false,
  });

  const getMediaPipeState = (response: WorkerResponse) => {
    let progress = 0;
    let text = "";

    switch (response.type) {
      case "progress":
        //console.log(`Download ${response.percentage}% complete`);
        text = `Model downloading. ${response.percentage}% complete...`;
        progress = response.percentage;
        if (response.status === "caching") {
          // console.log("Caching model...");
          text = "Caching model...";
        }
        if (response.fromCache) {
          // console.log("Model loaded from cache instantly!");
          progress = 100;
          text = "Model loaded from cache.";
        }
        break;

      case "complete":
        // console.log("Model ready:", response);
        text = "Model initializing...";
        progress = 100;
        loadEngine(response.data);
        break;

      case "error":
        console.error("Download failed:", response);
        text = `Download failed: ${response.message}`;
        break;
    }

    setMediaPipeState((prevState) => ({
      ...prevState,
      progress,
      text,
    }));
  };

  const initializeMediapipe = async () => {
    try {
      await initMediapipeGenAI(getMediaPipeState);
    } catch (error) {
      setMediaPipeState((prevState) => ({
        ...prevState,
        error:
          (error as Error).message ||
          "An error occurred during initialization.",
      }));
    }
  };

  const retryInitialization = () => {
    setMediaPipeState({
      progress: 0,
      text: "Retrying initialization...",
      error: null,
      engine: null,
      isInitialized: false,
    });
    initializeMediapipe();
  };

  const loadEngine = async (modelUrl: string) => {
    try {
      const genai = await FilesetResolver.forGenAiTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest/wasm"
      );
      const llmInference = await LlmInference.createFromOptions(genai, {
        baseOptions: {
          modelAssetPath: modelUrl,
        },
        maxTokens: 32000
      });
      setMediaPipeState((prevState) => ({
        ...prevState,
        engine: llmInference,
        isInitialized: true,
        progress: 100,
      }));
    } catch (error) {
      setMediaPipeState((prevState) => ({
        ...prevState,
        error:
          (error as Error).message ||
          "An error occurred while loading the model.",
      }));
    }
  };

  useEffect(() => {
    initializeMediapipe();
  }, []);

  return {
    mediaPipeState,
    initializeMediapipe,
    retryInitialization,
  };
};
