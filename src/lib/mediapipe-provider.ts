import { WorkerResponse } from "@/workers/mediapipe-worker";

const initMediapipeGenAI = async (callback: (response: WorkerResponse) => void) => {
  // Create worker instance
  const worker = new Worker(
    new URL("@/workers/mediapipe-worker.ts", import.meta.url),
    {
      type: "module",
    }
  );
  console.log("Mediapipe GenAI worker initialized.");

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
    url: `${window.location.origin}/models/gemma3-270m-it-q8-web.task`,
    cacheKey: "my-model", // Optional custom cache key
  });
};

export { initMediapipeGenAI };
