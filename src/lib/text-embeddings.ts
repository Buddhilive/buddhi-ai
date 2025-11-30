const getEmbeddings = async (texts: string[]) => {
  // Create worker instance
  const worker = new Worker(
    new URL("@/workers/embedding-worker.ts", import.meta.url),
    {
      type: "module",
    }
  );

  worker.onmessage = (event) => {
    const response = event.data;
    console.log("Embedding response from worker:", response);
  };

  worker.onerror = (error) => {
    console.error("Embedding worker error:", error.message);
  };

  const embeddings: number[][] = [];

  worker.postMessage({ text: texts[0] });

  console.log("Sending texts to embedding worker:", texts, worker);

  // worker.terminate();

  return embeddings;
};

export { getEmbeddings };
