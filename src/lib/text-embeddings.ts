const saveEmbeddings = async (texts: string[]): Promise<boolean> => {
  return new Promise<boolean>((resolve, reject) => {
    const worker = new Worker(
      new URL("@/workers/embedding-worker.ts", import.meta.url),
      {
        type: "module",
      }
    );

    worker.onmessage = (event) => {
      const response = event.data;
      console.log("Embedding response from worker:", response);
      resolve(true);
    };

    worker.onerror = (error) => {
      console.error("Embedding worker error:", error.message);
      reject(false);
    };

    worker.postMessage({ text: texts[0] });

    console.log("Sending texts to embedding worker:", texts, worker);

    // worker.terminate();
  });
};

export { saveEmbeddings };
