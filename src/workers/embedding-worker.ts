import { chunkText, createVectorIndex } from "@/lib/llamaindex-provider";

self.addEventListener("message", async (event) => {
  const { text } = event.data;
  console.log("Received text for embedding:", text);

  try {
    // Step 1: Chunk the text
    const chunks = await chunkText(text);

    // Step 2: Create Index (Embedding happens here)
    const index = await createVectorIndex(chunks);
    console.log("Computed embedding:", index);
    self.postMessage({ index });
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
