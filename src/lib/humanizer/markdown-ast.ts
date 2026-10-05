/**
 * Markdown AST & Immutable Tokenizer
 * Masks and restores code fences, math blocks, and tables with verbatim protection.
 * Sanitizes malformed markdown structures gracefully.
 */

import { nanoid } from "nanoid";

export const MAX_DOCUMENT_WORDS = 200000;

export interface MaskResult {
  maskedText: string;
  maskMap: Record<string, string>;
  blockCount: number;
}

export interface DocumentStats {
  wordCount: number;
  charCount: number;
  estimatedTokens: number;
  codeBlockCount: number;
  tableCount: number;
}

/**
 * Sanitizes common malformed markdown artifacts to prevent AST syntax disruption.
 */
export function sanitizeMarkdown(input: string): string {
  if (!input) return "";

  let sanitized = input;

  // 1. Balance unclosed code fences: count triple backticks
  const codeFences = sanitized.match(/```/g) || [];
  if (codeFences.length % 2 !== 0) {
    sanitized += "\n```\n";
  }

  // 2. Balance unclosed tildes fences: count triple tildes
  const tildeFences = sanitized.match(/~~~/g) || [];
  if (tildeFences.length % 2 !== 0) {
    sanitized += "\n~~~\n";
  }

  // 3. Balance unclosed math block ($$)
  const mathBlocks = sanitized.match(/\$\$/g) || [];
  if (mathBlocks.length % 2 !== 0) {
    sanitized += "\n$$\n";
  }

  return sanitized;
}

/**
 * Computes statistics for a document.
 */
export function calculateDocumentStats(markdown: string): DocumentStats {
  if (!markdown || markdown.trim().length === 0) {
    return {
      wordCount: 0,
      charCount: 0,
      estimatedTokens: 0,
      codeBlockCount: 0,
      tableCount: 0,
    };
  }

  const clean = markdown.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = clean.length;
  // Standard rule-of-thumb: ~1 token per 4 chars or 0.75 words per token
  const estimatedTokens = Math.ceil(Math.max(charCount / 3.8, wordCount * 1.3));

  const codeMatches = markdown.match(/(?:```[\s\S]*?```|~~~[\s\S]*?~~~)/g) || [];
  const tableMatches = markdown.match(/\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|\n?)+/g) || [];

  return {
    wordCount,
    charCount,
    estimatedTokens,
    codeBlockCount: codeMatches.length,
    tableCount: tableMatches.length,
  };
}

/**
 * Validates document bounds against system safety caps.
 */
export function validateDocumentBounds(input: string): { valid: boolean; error?: string } {
  const stats = calculateDocumentStats(input);
  if (stats.wordCount > MAX_DOCUMENT_WORDS) {
    return {
      valid: false,
      error: `Input size of ${stats.wordCount.toLocaleString()} words exceeds the safety cap of ${MAX_DOCUMENT_WORDS.toLocaleString()} words. Please process your text in smaller segments.`,
    };
  }
  return { valid: true };
}

/**
 * Scans markdown and replaces immutable blocks (code blocks, math, markdown tables)
 * with non-colliding placeholder markers.
 */
export function maskImmutableMarkdown(markdown: string): MaskResult {
  const maskMap: Record<string, string> = {};
  let counter = 0;

  // First sanitize unclosed fences
  let processed = sanitizeMarkdown(markdown);

  // 1. Mask fenced code blocks (```...``` and ~~~...~~~)
  processed = processed.replace(
    /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g,
    (match) => {
      const marker = `«IMMUTABLE_CODE_${counter++}_${nanoid(6)}»`;
      maskMap[marker] = match;
      return marker;
    }
  );

  // 2. Mask display math blocks ($$...$$)
  processed = processed.replace(
    /(\$\$[\s\S]*?\$\$)/g,
    (match) => {
      const marker = `«IMMUTABLE_MATH_${counter++}_${nanoid(6)}»`;
      maskMap[marker] = match;
      return marker;
    }
  );

  // 3. Mask Markdown tables (| header | \n | --- | \n | row |)
  processed = processed.replace(
    /((?:^|\n)\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|(?:\n|$))+)/g,
    (match) => {
      const marker = `\n«IMMUTABLE_TABLE_${counter++}_${nanoid(6)}»\n`;
      maskMap[marker.trim()] = match.trim();
      return marker;
    }
  );

  // 4. Mask inline code (`...`) to preserve verbatim variable/function names
  processed = processed.replace(
    /(`[^`\n]+`)/g,
    (match) => {
      const marker = `«IMMUTABLE_INLINE_${counter++}_${nanoid(6)}»`;
      maskMap[marker] = match;
      return marker;
    }
  );

  return {
    maskedText: processed,
    maskMap,
    blockCount: counter,
  };
}

/**
 * Restores masked immutable blocks back to their original verbatim content.
 */
export function restoreImmutableMarkdown(
  maskedText: string,
  maskMap: Record<string, string>
): string {
  if (!maskedText || Object.keys(maskMap).length === 0) {
    return maskedText;
  }

  let restored = maskedText;

  for (const [marker, originalContent] of Object.entries(maskMap)) {
    // Replace all occurrences of this marker
    restored = restored.split(marker).join(originalContent);
  }

  return restored;
}
