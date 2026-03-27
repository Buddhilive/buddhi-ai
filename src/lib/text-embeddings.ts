import { WorkerMessage } from "@/types/document-types";

/**
 * Extract text from a PDF file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Load pdfjs-dist directly from CDN, bypassing Webpack bundling.
    // pdfjs-dist v5 ESM uses Object.defineProperty patterns that break
    // when bundled by Webpack — the webpackIgnore comment skips bundling.
    // @ts-expect-error — TypeScript doesn't resolve URL imports; the browser handles this at runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjsLib: any = await import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/build/pdf.min.mjs");

    // Fetch the worker bundle and serve it as a same-origin blob.
    // Using an `import` proxy statement fails for classic workers (SyntaxError),
    // causing getTextContent() to silently return empty items.
    // Fetching the full bundle content works for both classic and module workers.
    const workerResponse = await fetch(
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs"
    );
    const workerText = await workerResponse.text();
    const workerBlob = new Blob([workerText], { type: "text/javascript" });
    const workerBlobUrl = URL.createObjectURL(workerBlob);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerBlobUrl;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
      // Yield to the event loop after each page so the UI stays responsive
      // during extraction of large, multi-page PDFs.
      await new Promise((r) => setTimeout(r, 0));
    }

    URL.revokeObjectURL(workerBlobUrl);
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
export async function extractTextFromTXT(file: File): Promise<string> {
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
  try {
    // Helper to send progress updates
    const sendProgress = (
      stage: "reading" | "chunking" | "embedding" | "saving",
      progress: number,
      total: number
    ) => {
      const progressMsg: WorkerMessage = {
        type: "progress",
        documentId,
        progress: { stage, progress, total, documentId },
      };
      onProgress(progressMsg);
    };

    // Step 1: Extract text from file
    sendProgress("reading", 0, 100);

    let text: string;
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "pdf") {
      text = await extractTextFromPDF(file);
    } else if (fileExtension === "txt") {
      text = await extractTextFromTXT(file);
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    if (!text || text.trim().length === 0) {
      throw new Error(
        "File contains no extractable text. If this is a scanned document, text extraction is not supported — please use a text-based PDF."
      );
    }

    sendProgress("reading", 100, 100);

    // Step 2: Chunk the text
    sendProgress("chunking", 0, 100);

    // Import chunking function
    const { chunkText } = await import("@/lib/llamaindex-provider");
    const chunks = await chunkText(text, 200, 20);

    sendProgress("chunking", 100, 100);
    // console.log(`Created ${chunks.length} chunks for ${file.name}`);

    // Step 3: Generate embeddings and save
    sendProgress("embedding", 0, chunks.length);

    // Import vector index creation
    const { createVectorIndex } = await import("@/lib/llamaindex-provider");
    await createVectorIndex(chunks, chatId, documentId, file.name);

    sendProgress("embedding", chunks.length, chunks.length);

    // Step 4: Save complete
    sendProgress("saving", 100, 100);
    // console.log(`Successfully processed document: ${file.name}`);

    // Send completion message
    const completeMsg: WorkerMessage = {
      type: "complete",
      documentId,
    };
    onProgress(completeMsg);
  } catch (error) {
    console.error("Error processing document:", error);

    const errorMsg: WorkerMessage = {
      type: "error",
      documentId,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    onProgress(errorMsg);

    throw error;
  }
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
