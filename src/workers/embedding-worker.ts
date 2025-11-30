import { FilesetResolver, TextEmbedder } from "@mediapipe/tasks-text";

const getEmbeddingModel = async (): Promise<TextEmbedder> => {
  try {
    const textFiles = await FilesetResolver.forTextTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-text@latest/wasm"
    );
    const textEmbedder = await TextEmbedder.createFromOptions(textFiles, {
      baseOptions: {
        modelAssetPath: `http://localhost:3000/models/universal_sentence_encoder.tflite`,
      },
    });
    return textEmbedder;
  } catch (error) {
    console.error("Error loading text embedding model:", error);
    throw error;
  }
};

self.addEventListener("message", async (event) => {
  const { text } = event.data;
  console.log("Received text for embedding:", text);

  try {
    const embeddingModel = await getEmbeddingModel();
    const embeddings = embeddingModel.embed(text);
    const embeddingArray = await embeddings.embeddings;
    console.log("Computed embedding:", embeddings);
    self.postMessage({ embedding: embeddingArray[0] });
  } catch (error) {
    const result = { error: "Failed to compute embedding." };
    self.postMessage(result);
  }
});

self.addEventListener("error", (error) => {
  console.error("Worker error:", error.message);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection in worker:", event.reason);
});