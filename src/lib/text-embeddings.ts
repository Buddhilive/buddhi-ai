import { FilesetResolver, TextEmbedder } from "@mediapipe/tasks-text";

const getEmbeddingModel = async (): Promise<TextEmbedder> => {
  try {
    const textFiles = await FilesetResolver.forTextTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-text@latest/wasm/"
    );
    const textEmbedder = await TextEmbedder.createFromOptions(textFiles, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-tasks/text_embedder/universal_sentence_encoder.tflite`,
      },
      quantize: true,
    });
    return textEmbedder;
  } catch (error) {
    console.error("Error loading text embedding model:", error);
    throw error;
  }
};

export { getEmbeddingModel };
