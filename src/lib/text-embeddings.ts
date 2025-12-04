import {
  WorkerMessage,
  WorkerRequest,
  DocumentItem,
} from "@/types/document-types";

/**
 * Extract text from a PDF file
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Dynamically import pdfjs-dist
    const pdfjsLib = await import("pdfjs-dist");

    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    return fullText.trim();
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(
      `Failed to extract text from PDF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Extract text from a TXT file
 */
async function extractTextFromTXT(file: File): Promise<string> {
  try {
    return await file.text();
  } catch (error) {
    console.error("Error reading text file:", error);
    throw new Error(
      `Failed to read text file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Process a single document: extract text, chunk, generate embeddings
 */
export async function processDocument(
  file: File,
  chatId: string,
  documentId: string,
  onProgress: (message: WorkerMessage) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("@/workers/embedding-worker.ts", import.meta.url),
      {
        type: "module",
      }
    );

    // Handle messages from worker
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;

      // Forward progress to caller
      onProgress(message);

      if (message.type === "complete") {
        worker.terminate();
        resolve();
      } else if (message.type === "error") {
        worker.terminate();
        reject(new Error(message.error || "Unknown error"));
      }
    };

    // Handle worker errors
    worker.onerror = (error) => {
      console.error("Embedding worker error:", error.message);
      worker.terminate();
      reject(new Error(`Worker error: ${error.message}`));
    };

    // Extract text based on file type
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "pdf") {
      extractTextFromPDF(file)
        .then((text) => {
          if (!text || text.trim().length === 0) {
            throw new Error("PDF contains no extractable text");
          }

          const request: WorkerRequest = {
            type: "process",
            documentId,
            fileName: file.name,
            text,
            chatId,
          };

          worker.postMessage(request);
        })
        .catch((error) => {
          worker.terminate();
          reject(error);
        });
    } else if (fileExtension === "txt") {
      extractTextFromTXT(file)
        .then((text) => {
          if (!text || text.trim().length === 0) {
            throw new Error("Text file is empty");
          }

          const request: WorkerRequest = {
            type: "process",
            documentId,
            fileName: file.name,
            text,
            chatId,
          };

          worker.postMessage(request);
        })
        .catch((error) => {
          worker.terminate();
          reject(error);
        });
    } else {
      worker.terminate();
      reject(new Error(`Unsupported file type: ${fileExtension}`));
    }
  });
}

/**
 * Process multiple documents
 */
export async function processDocuments(
  files: File[],
  chatId: string,
  onProgress: (documentId: string, message: WorkerMessage) => void,
  onComplete: (documentId: string) => void,
  onError: (documentId: string, error: string) => void
): Promise<void> {
  const promises = files.map((file) => {
    const documentId = `doc_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    return processDocument(file, chatId, documentId, (message) =>
      onProgress(documentId, message)
    )
      .then(() => onComplete(documentId))
      .catch((error) =>
        onError(
          documentId,
          error instanceof Error ? error.message : "Unknown error"
        )
      );
  });

  await Promise.all(promises);
}
