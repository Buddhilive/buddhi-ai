import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
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
 * Splits extracted pages into semantic chunks using LangChain's RecursiveCharacterTextSplitter.
 * Preserves page numbers and calculates approximate token counts.
 */
export async function chunkText(
  pages: ParsedPage[],
  paperId: string,
  chunkSize = 900,
  chunkOverlap = 150
): Promise<Chunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const pageText = page.text.trim();
    if (!pageText) continue;

    const splitSegments = await splitter.splitText(pageText);

    for (const segment of splitSegments) {
      const text = segment.trim();
      if (!text) continue;

      chunks.push({
        id: `${paperId}::${chunkIndex}`,
        paperId,
        chunkIndex,
        pageNumber: page.pageNumber,
        text,
        tokenCount: Math.round(text.split(/\s+/).length * 1.3),
      });

      chunkIndex++;
    }
  }

  return chunks;
}

/**
 * Parses an ArrayBuffer containing a PDF, extracting pages, metadata, and semantic chunks.
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

  const chunks = await chunkText(pages, paperId);

  return {
    title: extractedTitle,
    pages,
    fullText,
    chunks,
  };
}
