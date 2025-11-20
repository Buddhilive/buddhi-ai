import { initMediapipeGenAI } from "@/lib/mediapipe-provider";
import { FilesetResolver, LlmInference } from "@mediapipe/tasks-genai";
import { WorkerResponse } from "@/workers/mediapipe-worker";
import { useState } from "react";

export interface mediaPipeState {
  progress: string;
  error: string | null;
  engine: LlmInference | null;
  isInitialized?: boolean;
}

export const useMediapipe = () => {
  const [mediaPipeState, setMediaPipeState] = useState<mediaPipeState>({
    progress: "Starting initialization...",
    error: null,
    engine: null,
    isInitialized: false,
  });

  const getMediaPipeState = (response: WorkerResponse) => {
    let progress = "";

    switch (response.type) {
      case "progress":
        console.log(`Download ${response.percentage}% complete`);
        progress = `Download ${response.percentage}% complete`;
        if (response.fromCache) {
          console.log("Loaded from cache instantly!");
          progress = "Loaded from cache instantly!";
        }
        break;

      case "complete":
        console.log("File ready:", response.data);
        progress = "File ready";
        loadEngine(response.url);
        break;

      case "error":
        console.error("Download failed:", response.message);
        progress = `Download failed: ${response.message}`;
        break;
    }

    setMediaPipeState((prevState) => ({
      ...prevState,
      progress,
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

  const loadEngine = async (modelUrl: string) => {
    try {
      const genai = await FilesetResolver.forGenAiTasks(
        // path/to/wasm/root
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest/wasm"
      );
      const llmInference = await LlmInference.createFromOptions(genai, {
        baseOptions: {
          modelAssetPath: "/assets/gemma-3n-E4B-it-int4-Web.litertlm",
        },
        maxTokens: 1000,
        topK: 40,
        temperature: 0.8,
        randomSeed: 101,
      });
      setMediaPipeState((prevState) => ({
        ...prevState,
        engine: llmInference,
        isInitialized: true,
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

  return {
    mediaPipeState,
    initializeMediapipe,
  };
};
