/**
 * Stylometric Diff & Burstiness Diagnostic Analyzer
 * Performs word-level diffing, cliché detection, and sentence length variance calculations.
 */

import type {
  DiffAnalysisResult,
  DiffToken,
  BurstinessMetrics,
} from "@/types/humanizer";
import { BANNED_CLICHES_BY_STRICTNESS } from "./constants";

/**
 * Splits text into individual sentences based on standard punctuation boundaries.
 */
export function extractSentences(text: string): string[] {
  if (!text) return [];
  // Clean markdown headers and fences before computing sentence burstiness
  const clean = text
    .replace(/(?:```[\s\S]*?```|~~~[\s\S]*?~~~)/g, " ")
    .replace(/^#+\s+[^\n]+/gm, " ")
    .replace(/«IMMUTABLE_[^»]+»/g, " ");

  return clean
    .split(/(?<=[.!?])\s+(?=[A-Z0-9«"'])/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.split(/\s+/).length > 2);
}

/**
 * Calculates sentence length variance (burstiness standard deviation) over a collection of sentences.
 */
export function calculateBurstiness(text: string): {
  variance: number;
  stdDev: number;
  sentenceCount: number;
  avgLength: number;
} {
  const sentences = extractSentences(text);
  if (sentences.length === 0) {
    return { variance: 0, stdDev: 0, sentenceCount: 0, avgLength: 0 };
  }

  const lengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const totalWords = lengths.reduce((acc, len) => acc + len, 0);
  const avgLength = totalWords / lengths.length;

  const squaredDiffs = lengths.map((len) => Math.pow(len - avgLength, 2));
  const variance = squaredDiffs.reduce((acc, diff) => acc + diff, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  return {
    variance: Math.round(variance * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    sentenceCount: sentences.length,
    avgLength: Math.round(avgLength * 10) / 10,
  };
}

/**
 * Simple word-level LCS diff algorithm.
 */
export function computeWordDiff(original: string, rewritten: string): DiffToken[] {
  const origWords = original.split(/(\s+)/).filter((w) => w.length > 0);
  const rewWords = rewritten.split(/(\s+)/).filter((w) => w.length > 0);

  // If identical, return quickly
  if (original === rewritten) {
    return [{ type: "unchanged", value: original }];
  }

  // To prevent matrix explosion on very large documents, chunk by lines or use bounded LCS
  const MAX_DIFF_WORDS = 3000;
  if (origWords.length > MAX_DIFF_WORDS || rewWords.length > MAX_DIFF_WORDS) {
    // Return high-level paragraph diff
    return [
      { type: "removed", value: original.slice(0, 1000) + "... [Truncated for diff preview]" },
      { type: "added", value: rewritten.slice(0, 1000) + "... [Truncated for diff preview]" },
    ];
  }

  const n = origWords.length;
  const m = rewWords.length;

  // LCS DP table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (origWords[i - 1] === rewWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to assemble diff tokens
  let i = n;
  let j = m;
  const tokens: DiffToken[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1] === rewWords[j - 1]) {
      tokens.unshift({ type: "unchanged", value: origWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tokens.unshift({ type: "added", value: rewWords[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      tokens.unshift({ type: "removed", value: origWords[i - 1] });
      i--;
    }
  }

  return tokens;
}

/**
 * Identifies pruned clichés from removed tokens.
 */
export function identifyPrunedCliches(tokens: DiffToken[]): {
  clichesCount: number;
  clichesList: string[];
} {
  const allCliches = BANNED_CLICHES_BY_STRICTNESS.high;
  const removedText = tokens
    .filter((t) => t.type === "removed")
    .map((t) => t.value)
    .join("")
    .toLowerCase();

  const found: string[] = [];

  for (const cliche of allCliches) {
    if (removedText.includes(cliche.toLowerCase())) {
      found.push(cliche);
    }
  }

  return {
    clichesCount: found.length,
    clichesList: found,
  };
}

/**
 * Complete diff & diagnostics pipeline.
 */
export function analyzeDiff(original: string, rewritten: string): DiffAnalysisResult {
  const beforeStats = calculateBurstiness(original);
  const afterStats = calculateBurstiness(rewritten);

  const beforeVar = beforeStats.stdDev;
  const afterVar = afterStats.stdDev;

  let varianceChangePercent = 0;
  if (beforeVar > 0) {
    varianceChangePercent = Math.round(((afterVar - beforeVar) / beforeVar) * 100);
  } else if (afterVar > 0) {
    varianceChangePercent = 100;
  }

  const metrics: BurstinessMetrics = {
    beforeVariance: beforeVar,
    afterVariance: afterVar,
    varianceChangePercent,
    sentenceCountBefore: beforeStats.sentenceCount,
    sentenceCountAfter: afterStats.sentenceCount,
    avgSentenceLengthBefore: beforeStats.avgLength,
    avgSentenceLengthAfter: afterStats.avgLength,
  };

  const tokens = computeWordDiff(original, rewritten);
  const { clichesCount, clichesList } = identifyPrunedCliches(tokens);

  return {
    tokens,
    clichesPrunedCount: clichesCount,
    prunedCliches: clichesList,
    metrics,
  };
}
