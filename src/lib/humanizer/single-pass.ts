/**
 * Single-Pass Humanization Engine
 * Transforms documents within single-pass token budget using local LiteRT engine
 */

import type { Engine } from "@litert-lm/core";
import type { StudioConfig, HumanizerConfig } from "@/types/humanizer";
import {
  maskImmutableMarkdown,
  restoreImmutableMarkdown,
  calculateDocumentStats,
  validateDocumentBounds,
} from "./markdown-ast";
import { composeHumanizerSystemDirective } from "./prompt-composer";
import { resolveSamplerParameters } from "./sampling-resolver";
import { inferenceQueue } from "@/lib/inference-queue";
import {
  HUMANIZER_PRESETS,
  INTENSITY_MODIFIERS,
  IMMUTABLE_TOKEN_PROTECTION_DIRECTIVE,
} from "./constants";

export interface SinglePassOptions {
  engine: Engine;
  markdown: string;
  config: StudioConfig;
  signal?: AbortSignal;
  onDelta?: (delta: string, accumulated: string) => void;
}

/**
 * Builds an effective HumanizerConfig from StudioConfig.
 */
export function buildEffectiveConfig(studioConfig: StudioConfig): HumanizerConfig {
  const presetDef = (HUMANIZER_PRESETS as any)[studioConfig.tonePreset] || HUMANIZER_PRESETS.balanced;
  const intensityMod = INTENSITY_MODIFIERS[studioConfig.intensity] || INTENSITY_MODIFIERS.balanced;

  const baseConfig = presetDef.config;
  const temperature = Math.max(0.1, Math.min(1.05, baseConfig.temperature + intensityMod.temperatureDelta));

  return {
    enabled: true,
    preset: studioConfig.tonePreset,
    burstinessLevel: intensityMod.burstinessLevel || studioConfig.burstinessLevel,
    negativeFilterStrictness: intensityMod.strictness,
    customGuidance: studioConfig.customGuidance || baseConfig.customGuidance,
    temperature,
    topP: baseConfig.topP,
    topK: baseConfig.topK,
    presencePenalty: baseConfig.presencePenalty,
    frequencyPenalty: baseConfig.frequencyPenalty,
  };
}

/**
 * Executes a single-pass humanization rewrite over the given markdown string.
 */
export async function executeSinglePass(options: SinglePassOptions): Promise<{
  outputMarkdown: string;
  wordCount: number;
  tokensEstimated: number;
}> {
  const { engine, markdown, config, signal, onDelta } = options;

  if (!markdown || markdown.trim().length === 0) {
    throw new Error("Input text is empty.");
  }

  // 1. Safety check
  const boundsCheck = validateDocumentBounds(markdown);
  if (!boundsCheck.valid) {
    throw new Error(boundsCheck.error);
  }

  // 2. Mask immutable structures (code fences, tables, math)
  const { maskedText, maskMap, blockCount } = maskImmutableMarkdown(markdown);

  // 3. Compose prompt & system directives
  const effectiveConfig = buildEffectiveConfig(config);
  const systemDirectives = composeHumanizerSystemDirective(effectiveConfig);

  let fullPrompt = "";
  if (blockCount > 0) {
    fullPrompt = `${systemDirectives}\n\n${IMMUTABLE_TOKEN_PROTECTION_DIRECTIVE}\n\n[TASK: Rewrite the following markdown text with an authentic, human cadence, varying sentence structure, removing synthetic AI tropes, and hedging claims appropriately. Preserve all Markdown headers, lists, and formatting. Crucially, reproduce any «IMMUTABLE_...» tokens verbatim without modification.]\n\n${maskedText}`;
  } else {
    fullPrompt = `${systemDirectives}\n\n[TASK: Rewrite the following markdown text with an authentic, human cadence, varying sentence structure, eliminating formulaic tropes, and preserving all Markdown hierarchy (headers, bolding, lists). Output only the revised markdown.]\n\n${maskedText}`;
  }

  // 4. Resolve sampler params
  const samplerParams = resolveSamplerParameters(effectiveConfig);

  // 5. Execute via inference queue
  const rewrittenRaw = await inferenceQueue.enqueue(async () => {
    if (signal?.aborted) {
      throw new Error("Humanization aborted by user.");
    }

    const conversation = await engine.createConversation({
      preface: { messages: [] },
      sessionConfig: { samplerParams },
    });

    try {
      const responseStream = conversation.sendMessageStreaming(fullPrompt);
      const reader = responseStream.getReader();
      let accumulated = "";

      while (true) {
        if (signal?.aborted) {
          try {
            await conversation.cancel();
          } catch {}
          throw new Error("Humanization aborted by user.");
        }

        const { done, value: chunk } = await reader.read();
        if (done || !chunk) break;

        const deltaText =
          typeof chunk === "string"
            ? chunk
            : typeof (chunk as any)?.content === "string"
            ? (chunk as any).content
            : Array.isArray((chunk as any)?.content)
            ? (chunk as any).content.map((p: any) => (typeof p === "string" ? p : p?.text || "")).join("")
            : "";

        accumulated += deltaText;
        onDelta?.(deltaText, accumulated);
      }

      return accumulated;
    } finally {
      await conversation.delete().catch(() => {});
    }
  }, signal);

  // 6. Clean model artifacts (e.g. unneeded wrapping code fences or Gemma turn tokens)
  const cleaned = rewrittenRaw
    .replace(/^```(?:markdown|md)?\n/, "")
    .replace(/\n```\s*$/, "")
    .replace(/<turn\|>\s*$/, "")
    .replace(/<end_of_turn>\s*$/, "")
    .trim();

  // 7. Restore immutable blocks
  const outputMarkdown = restoreImmutableMarkdown(cleaned, maskMap);
  const stats = calculateDocumentStats(outputMarkdown);

  return {
    outputMarkdown,
    wordCount: stats.wordCount,
    tokensEstimated: stats.estimatedTokens,
  };
}
