/**
 * Humanizer Type Definitions
 * Configurable LLM Humanizer for Gemma 2B in Buddhi AI
 */

export type HumanizerPresetId = "balanced" | "casual" | "technical_peer" | "custom";

export type NegativeFilterStrictness = "low" | "medium" | "high";

export type BurstinessLevel = 1 | 2 | 3 | 4 | 5;

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
