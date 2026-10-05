/**
 * Humanizer Type Definitions
 * Configurable LLM Humanizer & Text Humanizer Studio for Buddhi AI
 */

export type HumanizerPresetId =
  | "balanced"
  | "casual"
  | "conversational"
  | "technical_peer"
  | "academic_hedged"
  | "executive_concise"
  | "custom";

export type NegativeFilterStrictness = "low" | "medium" | "high";

export type BurstinessLevel = 1 | 2 | 3 | 4 | 5;

export type HumanizerIntensity = "low" | "balanced" | "aggressive";

export type HumanizerExecutionStage =
  | "idle"
  | "analyzing"
  | "processing"
  | "reassembling"
  | "completed"
  | "error";

export interface HumanizerSamplingParams {
  temperature: number;
  topP: number;
  topK: number;
  presencePenalty: number;
  frequencyPenalty: number;
}

export interface HumanizerConfig extends HumanizerSamplingParams {
  enabled: boolean;
  preset: HumanizerPresetId;
  burstinessLevel: BurstinessLevel;
  negativeFilterStrictness: NegativeFilterStrictness;
  customGuidance: string;
}

export interface HumanizerPresetDefinition {
  id: HumanizerPresetId;
  name: string;
  description: string;
  badge: string;
  config: Omit<HumanizerConfig, "enabled" | "preset">;
}

export interface HumanizationDocument {
  id: string;
  rawInput: string;
  tokenCount: number;
  wordCount: number;
  status: HumanizerExecutionStage;
  outputMarkdown: string;
  createdAt: number;
}

export interface RLMExecutionChunk {
  index: number;
  total: number;
  headerText?: string;
  rawText: string;
  maskedText: string;
  maskMap: Record<string, string>;
  humanizedText?: string;
  status: "pending" | "processing" | "completed" | "failed";
}

export interface RLMExecutionContext {
  documentId: string;
  totalChunks: number;
  currentChunkIndex: number;
  chunks: RLMExecutionChunk[];
  rollingSummaryContext: string;
  retryCount: number;
  stage: HumanizerExecutionStage;
  progressPercent: number;
  errorMessage?: string;
}

export interface BurstinessMetrics {
  beforeVariance: number;
  afterVariance: number;
  varianceChangePercent: number;
  sentenceCountBefore: number;
  sentenceCountAfter: number;
  avgSentenceLengthBefore: number;
  avgSentenceLengthAfter: number;
}

export interface DiffToken {
  type: "unchanged" | "added" | "removed";
  value: string;
  isCliche?: boolean;
}

export interface DiffAnalysisResult {
  tokens: DiffToken[];
  clichesPrunedCount: number;
  prunedCliches: string[];
  metrics: BurstinessMetrics;
}

export interface StudioConfig {
  tonePreset: HumanizerPresetId;
  intensity: HumanizerIntensity;
  preserveCodeFences: boolean;
  burstinessLevel: BurstinessLevel;
  customGuidance: string;
}
