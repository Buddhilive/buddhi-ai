/**
 * pdf.ts — PDF text extraction for OKF ingestion.
 */

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
            `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"
            }`
        );
    }
}
