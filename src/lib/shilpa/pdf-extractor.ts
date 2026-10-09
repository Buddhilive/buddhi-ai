/**
 * Client-Side PDF Extractor for Shilpa Studio
 * Uses pdfjs-dist entirely in the browser to extract bookmarks, TOC, and chapter text.
 */

import type { ShilpaSection } from "@/types/shilpa";

async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjs;
}

export interface ExtractedOutlineResult {
  title: string;
  pageCount: number;
  sections: ShilpaSection[];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

/**
 * Extracts bookmark tree or applies heuristic TOC fallback.
 */
export async function extractPdfOutlineAndChapters(
  data: ArrayBuffer,
  fileName: string
): Promise<ExtractedOutlineResult> {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  let title = fileName.replace(/\.[^/.]+$/, "");
  try {
    const metadata = await pdf.getMetadata();
    const info = metadata?.info as Record<string, unknown> | undefined;
    if (info?.Title && typeof info.Title === "string" && info.Title.trim()) {
      title = info.Title.trim();
    }
  } catch (err) {
    console.warn("[pdf-extractor] Metadata extraction error:", err);
  }

  let outline: any[] | null = null;
  try {
    outline = await pdf.getOutline();
  } catch (err) {
    console.warn("[pdf-extractor] Outline extraction error:", err);
  }

  const sections: ShilpaSection[] = [];

  if (outline && outline.length > 0) {
    // Resolve destinations to page numbers
    interface FlattenedNode {
      title: string;
      unit?: string;
      pageNumber: number;
    }

    const flatNodes: FlattenedNode[] = [];

    const traverse = async (items: any[], currentUnit?: string) => {
      for (const item of items) {
        let dest = item.dest;
        if (typeof dest === "string") {
          dest = await pdf.getDestination(dest);
        }
        let pageIndex = -1;
        if (Array.isArray(dest) && dest.length > 0) {
          try {
            pageIndex = await pdf.getPageIndex(dest[0]);
          } catch {
            // fallback
          }
        }
        const pageNumber = pageIndex >= 0 ? pageIndex + 1 : 1;

        if (item.items && item.items.length > 0) {
          await traverse(item.items, item.title);
        } else {
          flatNodes.push({
            title: item.title,
            unit: currentUnit,
            pageNumber,
          });
        }
      }
    };

    await traverse(outline);

    // Filter and sort nodes by page number
    const sortedNodes = flatNodes
      .filter((n) => n.pageNumber >= 1 && n.pageNumber <= pageCount)
      .sort((a, b) => a.pageNumber - b.pageNumber);

    // Deduplicate and construct sections
    let chapterIndex = 1;
    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i];
      const startPage = node.pageNumber;
      const nextStart =
        i + 1 < sortedNodes.length ? sortedNodes[i + 1].pageNumber : pageCount + 1;
      const endPage = Math.max(startPage, nextStart - 1);

      sections.push({
        chapterNumber: chapterIndex,
        folder: `ch${String(chapterIndex).padStart(2, "0")}`,
        title: node.title.replace(/^Chapter\s+\d+[:.\s]*/i, "").trim() || node.title,
        unit: node.unit,
        startPage,
        endPage: Math.min(endPage, pageCount),
        chapterStartPage: startPage,
        estimatedMinutes: Math.max(3, Math.round((endPage - startPage + 1) * 1.5)),
        status: "unprocessed",
      });
      chapterIndex++;
    }
  }

  // Fallback if no bookmarks were found or parsed
  if (sections.length === 0) {
    sections.push(...(await heuristicChapterDivision(pdf, pageCount)));
  }

  return {
    title,
    pageCount,
    sections,
  };
}

/**
 * Heuristic chapter division when PDF has no bookmark tree.
 */
async function heuristicChapterDivision(
  pdf: any,
  pageCount: number
): Promise<ShilpaSection[]> {
  const sections: ShilpaSection[] = [];
  const pagesPerChapter = Math.min(12, Math.max(5, Math.ceil(pageCount / 8)));
  const totalChapters = Math.ceil(pageCount / pagesPerChapter);

  for (let ch = 1; ch <= totalChapters; ch++) {
    const startPage = (ch - 1) * pagesPerChapter + 1;
    const endPage = Math.min(pageCount, ch * pagesPerChapter);

    // Attempt to extract title from start page
    let chapterTitle = `Chapter ${ch}`;
    try {
      const page = await pdf.getPage(startPage);
      const textContent = await page.getTextContent();
      const firstLines = textContent.items
        .map((item: any) => item.str)
        .join(" ")
        .split(/\n|\.\s+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 3 && s.length < 80);

      if (firstLines.length > 0) {
        const candidate = firstLines.find((line: string) =>
          /chapter|part|section|intro|unit/i.test(line)
        );
        if (candidate) {
          chapterTitle = candidate;
        } else if (firstLines[0]) {
          chapterTitle = firstLines[0];
        }
      }
    } catch {
      // fallback
    }

    sections.push({
      chapterNumber: ch,
      folder: `ch${String(ch).padStart(2, "0")}`,
      title: chapterTitle,
      startPage,
      endPage,
      chapterStartPage: startPage,
      estimatedMinutes: Math.max(3, Math.round((endPage - startPage + 1) * 1.2)),
      status: "unprocessed",
    });
  }

  return sections;
}

/**
 * Extracts raw page text for a specific chapter range and formats it into clean Markdown.
 */
export async function extractChapterText(
  pdfBuffer: ArrayBuffer,
  startPage: number,
  endPage: number
): Promise<string> {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBuffer.slice(0)) });
  const pdf = await loadingTask.promise;

  const validStart = Math.max(1, startPage);
  const validEnd = Math.min(pdf.numPages, endPage);

  const pagesText: string[] = [];

  for (let p = validStart; p <= validEnd; p++) {
    try {
      const page = await pdf.getPage(p);
      const textContent = await page.getTextContent();
      const lines: string[] = [];
      let currentLine = "";
      let lastY: number | null = null;

      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        const y = item.transform ? item.transform[5] : 0;
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = item.str;
        } else {
          currentLine += (currentLine.length ? " " : "") + item.str;
        }
        lastY = y;
      }
      if (currentLine.trim()) lines.push(currentLine.trim());

      pagesText.push(`## Page ${p}\n\n${lines.join("\n")}\n`);
    } catch (err) {
      console.warn(`[pdf-extractor] Failed to extract page ${p}:`, err);
    }
  }

  return pagesText.join("\n\n");
}
