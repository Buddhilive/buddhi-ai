import type { Chunk } from "@/types/research";

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParseResult {
  title: string;
  pages: ParsedPage[];
  fullText: string;
  chunks: Chunk[];
}

/**
 * Robustly load pdfjs-dist on client side and configure worker
 */
async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjs;
}

/**
 * Splits text into ~512 token chunks with ~64 token overlap.
 * Uses whitespace/word-based approximation (1 word ~= 1.3 tokens).
 */
export function chunkText(
  pages: ParsedPage[],
  paperId: string,
  targetTokenLength = 380, // ~500 tokens
  tokenOverlap = 50 // ~65 tokens
): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const words = page.text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    let start = 0;
    while (start < words.length) {
      const end = Math.min(start + targetTokenLength, words.length);
      const chunkWords = words.slice(start, end);
      const text = chunkWords.join(" ");

      chunks.push({
        id: `${paperId}::${chunkIndex}`,
        paperId,
        chunkIndex,
        pageNumber: page.pageNumber,
        text,
        tokenCount: Math.round(chunkWords.length * 1.3),
      });

      chunkIndex++;
      if (end >= words.length) break;
      start = end - tokenOverlap;
    }
  }

  return chunks;
}

/**
 * Parses an ArrayBuffer containing a PDF, extracting pages and text.
 */
export async function parsePdfDocument(
  data: ArrayBuffer,
  paperId: string,
  fallbackTitle: string
): Promise<ParseResult> {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  const pages: ParsedPage[] = [];
  let fullText = "";
  let extractedTitle = fallbackTitle;

  try {
    const metadata = await pdf.getMetadata();
    const info = metadata?.info as Record<string, unknown> | undefined;
    if (info?.Title && typeof info.Title === "string" && info.Title.trim()) {
      extractedTitle = info.Title.trim();
    }
  } catch (err) {
    console.warn("[pdf-parser] Could not read PDF metadata:", err);
  }

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageStrings = textContent.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .filter(Boolean);

    const pageText = pageStrings.join(" ");
    pages.push({
      pageNumber: i,
      text: pageText,
    });
    fullText += pageText + "\n\n";
  }

  const chunks = chunkText(pages, paperId);

  return {
    title: extractedTitle,
    pages,
    fullText,
    chunks,
  };
}
