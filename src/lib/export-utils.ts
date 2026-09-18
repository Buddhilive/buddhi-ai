import type { Paper } from "@/types/research";

/**
 * Downloads text as a local file in the user's browser.
 */
export function downloadTextFile(
  content: string,
  filename: string,
  contentType = "text/markdown;charset=utf-8;"
) {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates structured Markdown from paper content and notes.
 */
export function exportPaperAsMarkdown(
  paper: Paper,
  notes?: string
): string {
  const title = paper.metadata.title || paper.fileName;
  const authors = paper.metadata.authors.join(", ");
  const date = new Date(paper.uploadedAt).toLocaleDateString();

  let md = `# ${title}\n\n`;
  md += `**Authors**: ${authors}\n`;
  md += `**Ingested**: ${date}\n`;
  md += `**Pages**: ${paper.pageCount} | **Total Chunks**: ${paper.totalChunks}\n\n`;
  md += `---\n\n`;

  if (notes && notes.trim()) {
    md += `## Researcher Notes & Synthesis\n\n`;
    md += `${notes.trim()}\n\n`;
    md += `---\n\n`;
  }

  if (paper.rawText) {
    md += `## Extracted Text\n\n`;
    md += `${paper.rawText}\n`;
  }

  return md;
}

/**
 * Triggers browser client-side print/PDF export
 */
export function printPaperDocument() {
  if (typeof window !== "undefined") {
    window.print();
  }
}
