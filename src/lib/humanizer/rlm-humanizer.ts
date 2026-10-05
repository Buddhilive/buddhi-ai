/**
 * Recursive Language Model (RLM) Long-Context Execution Engine
 * Partitions long documents into semantic sections, applies rolling context summaries,
 * and reassembles humanized output without context rot or narrative seams.
 */

import type { Engine } from "@litert-lm/core";
import type {
  StudioConfig,
  RLMExecutionContext,
  RLMExecutionChunk,
} from "@/types/humanizer";
import {
  maskImmutableMarkdown,
  restoreImmutableMarkdown,
  calculateDocumentStats,
  validateDocumentBounds,
} from "./markdown-ast";
import { buildEffectiveConfig } from "./single-pass";
import { composeHumanizerSystemDirective } from "./prompt-composer";
import { resolveSamplerParameters } from "./sampling-resolver";
import { inferenceQueue } from "@/lib/inference-queue";
import { IMMUTABLE_TOKEN_PROTECTION_DIRECTIVE } from "./constants";
import { nanoid } from "nanoid";

export const RLM_TOKEN_THRESHOLD = 3000;
export const CHUNK_WORD_TARGET = 1000;

export interface RLMHumanizerOptions {
  engine: Engine;
  markdown: string;
  config: StudioConfig;
  signal?: AbortSignal;
  onProgress?: (ctx: RLMExecutionContext) => void;
}

/**
 * Splits text into logical markdown sections respecting headers and paragraph boundaries.
 */
export function partitionMarkdownSections(markdown: string): string[] {
  // Try splitting by top-level headers (# or ##)
  const headerSplit = markdown.split(/(?=(?:^|\n)#{1,3}\s+)/g).filter((s) => s.trim().length > 0);

  const sections: string[] = [];

  for (const piece of headerSplit) {
    const stats = calculateDocumentStats(piece);
    // If a section is larger than ~1,500 words, sub-partition by double line breaks
    if (stats.wordCount > 1500) {
      const paragraphs = piece.split(/\n\s*\n/);
      let currentBatch = "";

      for (const p of paragraphs) {
        if (!p.trim()) continue;
        const currentBatchWords = currentBatch.split(/\s+/).filter(Boolean).length;
        const pWords = p.split(/\s+/).filter(Boolean).length;

        if (currentBatch && currentBatchWords + pWords > CHUNK_WORD_TARGET) {
          sections.push(currentBatch.trim());
          currentBatch = p + "\n\n";
        } else {
          currentBatch += p + "\n\n";
        }
      }

      if (currentBatch.trim()) {
        sections.push(currentBatch.trim());
      }
    } else {
      sections.push(piece.trim());
    }
  }

  return sections.length > 0 ? sections : [markdown];
}

/**
 * Generates a rolling context snippet from previously rewritten prose to preserve narrative cohesion.
 */
export function extractRollingContext(humanizedChunk: string): string {
  if (!humanizedChunk) return "";
  // Strip code placeholders and headers
  const prose = humanizedChunk
    .replace(/«IMMUTABLE_[^»]+»/g, "")
    .replace(/^#+\s+[^\n]+/gm, "")
    .trim();

  const words = prose.split(/\s+/).filter(Boolean);
  if (words.length <= 120) return words.join(" ");

  // Take the last 100 words of the previous section
  return words.slice(-100).join(" ");
}

/**
 * Executes full RLM recursive transformation over arbitrary-length markdown documents.
 */
export async function executeRLMHumanizer(
  options: RLMHumanizerOptions
): Promise<{ outputMarkdown: string; context: RLMExecutionContext }> {
  const { engine, markdown, config, signal, onProgress } = options;

  // 1. Validation
  const bounds = validateDocumentBounds(markdown);
  if (!bounds.valid) {
    throw new Error(bounds.error);
  }

  // 2. Mask immutable structures
  const { maskedText, maskMap } = maskImmutableMarkdown(markdown);

  // 3. Partition into chunks
  const rawSections = partitionMarkdownSections(maskedText);
  const totalChunks = rawSections.length;
  const documentId = `doc_${nanoid(8)}`;

  const chunks: RLMExecutionChunk[] = rawSections.map((sec, idx) => ({
    index: idx,
    total: totalChunks,
    rawText: sec,
    maskedText: sec,
    maskMap,
    status: "pending",
  }));

  const context: RLMExecutionContext = {
    documentId,
    totalChunks,
    currentChunkIndex: 0,
    chunks,
    rollingSummaryContext: "",
    retryCount: 0,
    stage: "analyzing",
    progressPercent: 5,
  };

  onProgress?.(context);

  const effectiveConfig = buildEffectiveConfig(config);
  const systemDirectives = composeHumanizerSystemDirective(effectiveConfig);
  const samplerParams = resolveSamplerParameters(effectiveConfig);

  const humanizedSectionOutputs: string[] = [];

  // 4. Sequential execution of recursive chunks with retry guard
  for (let i = 0; i < totalChunks; i++) {
    if (signal?.aborted) {
      throw new Error("RLM humanization was aborted by user.");
    }

    context.currentChunkIndex = i;
    context.stage = "processing";
    context.chunks[i].status = "processing";
    const chunkPercent = Math.round(10 + (i / totalChunks) * 80);
    context.progressPercent = chunkPercent;
    onProgress?.(context);

    const chunkText = chunks[i].maskedText;
    let rollingDirective = "";
    if (context.rollingSummaryContext) {
      rollingDirective = `\n[PRIOR SECTION NARRATIVE CONTEXT for cross-section continuity (do not repeat these sentences, maintain matching tone): "...${context.rollingSummaryContext}..."]\n`;
    }

    const chunkPrompt = `${systemDirectives}\n\n${IMMUTABLE_TOKEN_PROTECTION_DIRECTIVE}${rollingDirective}\n\n[TASK: Rewrite section ${i + 1} of ${totalChunks} with an authentic, human cadence. Vary clause length, eliminate robotic tropes, and strictly preserve all «IMMUTABLE_...» tokens and markdown structure.]\n\n${chunkText}`;

    // Retry loop: up to 2 retries per chunk
    let attempt = 0;
    const MAX_RETRIES = 2;
    let chunkOutput = "";
    let success = false;
    let lastError: unknown = null;

    while (attempt <= MAX_RETRIES && !success) {
      if (signal?.aborted) throw new Error("RLM humanization was aborted by user.");

      try {
        chunkOutput = await inferenceQueue.enqueue(async () => {
          if (signal?.aborted) throw new Error("Inference aborted.");

          const conversation = await engine.createConversation({
            preface: { messages: [] },
            sessionConfig: { samplerParams },
          });

          try {
            const stream = conversation.sendMessageStreaming(chunkPrompt);
            const reader = stream.getReader();
            let accumulated = "";

            while (true) {
              if (signal?.aborted) {
                try {
                  await conversation.cancel();
                } catch {}
                throw new Error("Inference aborted.");
              }

              const { done, value: piece } = await reader.read();
              if (done || !piece) break;

              const deltaText =
                typeof piece === "string"
                  ? piece
                  : typeof (piece as any)?.content === "string"
                  ? (piece as any).content
                  : Array.isArray((piece as any)?.content)
                  ? (piece as any).content.map((p: any) => (typeof p === "string" ? p : p?.text || "")).join("")
                  : "";

              accumulated += deltaText;
            }

            return accumulated;
          } finally {
            await conversation.delete().catch(() => {});
          }
        }, signal);

        success = true;
      } catch (err: unknown) {
        lastError = err;
        attempt++;
        context.retryCount++;
        if (attempt <= MAX_RETRIES) {
          // Brief backoff
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    if (!success) {
      context.chunks[i].status = "failed";
      context.stage = "error";
      const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
      context.errorMessage = `Chunk ${i + 1}/${totalChunks} failed after 2 retries: ${errMsg}`;
      onProgress?.(context);
      throw new Error(context.errorMessage);
    }

    // Clean model tags
    const cleanedChunk = chunkOutput
      .replace(/^```(?:markdown|md)?\n/, "")
      .replace(/\n```\s*$/, "")
      .replace(/<turn\|>\s*$/, "")
      .replace(/<end_of_turn>\s*$/, "")
      .trim();

    chunks[i].status = "completed";
    chunks[i].humanizedText = cleanedChunk;
    humanizedSectionOutputs.push(cleanedChunk);

    // Update rolling context for next chunk
    context.rollingSummaryContext = extractRollingContext(cleanedChunk);
  }

  // 5. Reassembly stage
  context.stage = "reassembling";
  context.progressPercent = 95;
  onProgress?.(context);

  const stitchedMasked = humanizedSectionOutputs.join("\n\n");
  const finalOutput = restoreImmutableMarkdown(stitchedMasked, maskMap);

  context.stage = "completed";
  context.progressPercent = 100;
  onProgress?.(context);

  return {
    outputMarkdown: finalOutput,
    context,
  };
}
