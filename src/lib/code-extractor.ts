import { VibeCodingFile } from "@/types/sandbox";

export interface ExtractedCodeBlock {
  language: string;
  code: string;
  isComplete: boolean;
}

/**
 * Extracts all multi-file code blocks with `path=` annotations from AI markdown.
 * Supports streaming/unclosed code blocks.
 */
export function extractVibeCodingFiles(markdown: string): VibeCodingFile[] {
  if (!markdown) return [];

  const filesMap = new Map<string, VibeCodingFile>();

  // Matches ```lang path=some/path.ext\n content ``` or unclosed at end of string
  const blockRegex = /```(\w+)?\s+path=([^\n\r]+)[\r\n]([\s\S]*?)(?:```|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(markdown)) !== null) {
    const language = (match[1] || "plaintext").toLowerCase();
    const rawPath = match[2].trim();
    // Normalize path: strip leading /workspace/, ./, or leading slashes
    const normalizedPath = rawPath
      .replace(/^[/\\]+/, "")
      .replace(/^workspace[/\\]+/i, "")
      .replace(/^\.[/\\]+/, "");

    const content = match[3] ?? "";
    const isComplete = match[0].endsWith("```");

    if (normalizedPath) {
      filesMap.set(normalizedPath, {
        path: normalizedPath,
        content: content.trimEnd(),
        language,
        isComplete,
      });
    }
  }

  // Fallback: If no path= blocks found, check if there's a single package.json or jsx/tsx/html block
  if (filesMap.size === 0) {
    const genericBlockRegex = /```(tsx|jsx|html|javascript|typescript|js|ts)\s*[\r\n]([\s\S]*?)(?:```|$)/gi;
    const fallbackMatch = genericBlockRegex.exec(markdown);
    if (fallbackMatch && fallbackMatch[2]?.trim()) {
      const lang = fallbackMatch[1].toLowerCase();
      const defaultName = lang === "html" ? "app/page.html" : "app/page.tsx";
      filesMap.set(defaultName, {
        path: defaultName,
        content: fallbackMatch[2].trimEnd(),
        language: lang,
        isComplete: fallbackMatch[0].endsWith("```"),
      });
    }
  }

  return Array.from(filesMap.values());
}

/**
 * Legacy compatibility helper.
 */
export function extractWebCodeFromMarkdown(markdown: string): ExtractedCodeBlock | null {
  const files = extractVibeCodingFiles(markdown);
  const mainFile = files.find((f) => f.path.includes("page.") || f.path.endsWith(".html")) || files[0];
  if (mainFile) {
    return {
      language: mainFile.language,
      code: mainFile.content,
      isComplete: mainFile.isComplete,
    };
  }
  return null;
}
