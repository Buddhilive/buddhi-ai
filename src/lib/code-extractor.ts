export interface ExtractedCodeBlock {
    language: string;
    code: string;
    isComplete: boolean;
}

/**
 * Extracts the primary HTML/web code block from an AI assistant markdown message.
 */
export function extractWebCodeFromMarkdown(markdown: string): ExtractedCodeBlock | null {
    if (!markdown) return null;

    // 1. Look for completed HTML block
    const htmlRegex = /```(?:html|htm)\s*([\s\S]*?)```/i;
    const match = markdown.match(htmlRegex);
    if (match && match[1]?.trim()) {
        return {
            language: "html",
            code: match[1].trim(),
            isComplete: true,
        };
    }

    // 2. Look for open/streaming HTML block (unclosed triple backticks)
    const openHtmlRegex = /```(?:html|htm)\s*([\s\S]*)$/i;
    const openMatch = markdown.match(openHtmlRegex);
    if (openMatch && openMatch[1]?.trim()) {
        return {
            language: "html",
            code: openMatch[1].trim(),
            isComplete: false,
        };
    }

    // 3. Fallback: check if raw text contains DOCTYPE or <html>
    if (markdown.includes("<!DOCTYPE html>") || markdown.includes("<html") || markdown.includes("<body")) {
        return {
            language: "html",
            code: markdown.trim(),
            isComplete: true,
        };
    }

    return null;
}
