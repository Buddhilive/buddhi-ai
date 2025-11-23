import { WorkerResponse } from "@/workers/mediapipe-worker";

const initMediapipeGenAI = async (callback: (response: WorkerResponse) => void) => {
  // Create worker instance
  const worker = new Worker(
    new URL("@/workers/mediapipe-worker.ts", import.meta.url),
    {
      type: "module",
    }
  );
  // console.log("Mediapipe GenAI worker initialized.");

  // Listen for responses
  worker.onmessage = (event) => {
    const response = event.data;
    callback(response);
  };

  worker.onerror = (error) => {
    callback({ type: "error", message: error.message, url: "" });
  };

  // Start download
  worker.postMessage({
    type: "download",
    url: `${window.location.origin}/models/gemma-3n-E2B-it-int4-Web.litertlm`, //gemma-3n-E2B-it-int4-Web.litertlm
    cacheKey: "gemma-3n-E2B", // gemma-3n-E2B
  });
};

export { initMediapipeGenAI };
