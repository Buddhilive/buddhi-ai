import {
  ProcessingProgress,
  WorkerMessage,
  WorkerRequest,
} from "@/types/document-types";
import { chunkText, createVectorIndex } from "@/lib/llamaindex-provider";

self.addEventListener("message", async (event) => {
  const request: WorkerRequest = event.data;

  if (request.type !== "process") {
    console.error("Unknown worker request type:", request.type);
    return;
  }

  const { documentId, fileName, text, chatId } = request;

  try {
    /* console.log(
      `[Worker] Processing document: ${fileName} for chat: ${chatId}`
    ); */

    // Step 1: Chunk the text
    const sendProgress = (
      stage: ProcessingProgress["stage"],
      progress: number,
      total: number
    ) => {
      const progressMsg: WorkerMessage = {
        type: "progress",
        documentId,
        progress: { stage, progress, total, documentId },
      };
      self.postMessage(progressMsg);
    };

    sendProgress("chunking", 0, 100);
    const chunks = await chunkText(text, 200, 20);
    sendProgress("chunking", 100, 100);

    // console.log(`[Worker] Created ${chunks.length} chunks`);

    // Step 2: Generate embeddings and save
    sendProgress("embedding", 0, chunks.length);

    // Create index with chat context
    const index = await createVectorIndex(chunks, chatId, documentId, fileName);

    sendProgress("embedding", chunks.length, chunks.length);
    sendProgress("saving", 100, 100);

    // console.log(`[Worker] Successfully processed document: ${fileName}`);

    const completeMsg: WorkerMessage = {
      type: "complete",
      documentId,
      index,
    };
    self.postMessage(completeMsg);
  } catch (error) {
    console.error(`[Worker] Error processing document ${fileName}:`, error);
    const errorMsg: WorkerMessage = {
      type: "error",
      documentId,
      error:
        error instanceof Error ? error.message : "Failed to process document",
    };
    self.postMessage(errorMsg);
  }
});

self.addEventListener("error", (error) => {
  console.error("[Worker] Worker error:", error.message);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("[Worker] Unhandled rejection in worker:", event.reason);
});
