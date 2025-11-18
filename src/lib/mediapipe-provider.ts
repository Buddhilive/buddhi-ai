const initMediapipeGenAI = async () => {
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

    switch (response.type) {
      case "progress":
        console.log(`Download ${response.percentage}% complete`);
        if (response.fromCache) {
          console.log("Loaded from cache instantly!");
        }
        break;

      case "complete":
        console.log("File ready:", response.data);
        break;

      case "error":
        console.error("Download failed:", response.message);
        break;
    }
  };

  // Start download
  worker.postMessage({
    type: "download",
    url: `${window.location.origin}/models/gemma3-270m-it-q8-web.task`,
    cacheKey: "my-model", // Optional custom cache key
  });
};

export { initMediapipeGenAI };
