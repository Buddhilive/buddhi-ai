/**
 * Humanizer Constants & Presets
 * Configurable LLM Humanizer for Gemma 2B in Buddhi AI
 */

import type {
  HumanizerConfig,
  HumanizerPresetDefinition,
  NegativeFilterStrictness,
} from "@/types/humanizer";

export const HUMANIZER_CLAMP_LIMITS = {
  minTemperature: 0.1,
  maxTemperature: 1.05,
  minTopP: 0.5,
  maxTopP: 0.98,
  minTopK: 10,
  maxTopK: 100,
  minPresencePenalty: 0.0,
  maxPresencePenalty: 1.0,
  minFrequencyPenalty: 0.0,
  maxFrequencyPenalty: 1.0,
} as const;

export const HUMANIZER_PRESETS: Record<"balanced" | "casual" | "technical_peer", HumanizerPresetDefinition> = {
  balanced: {
    id: "balanced",
    name: "Balanced",
    badge: "Recommended",
    description: "Natural sentence cadence, conversational epistemic modesty, and suppression of formulaic AI transitions.",
    config: {
      burstinessLevel: 3,
      negativeFilterStrictness: "medium",
      customGuidance: "",
      temperature: 0.85,
      topP: 0.90,
      topK: 40,
      presencePenalty: 0.30,
      frequencyPenalty: 0.20,
    },
  },
  casual: {
    id: "casual",
    name: "Casual / Conversational",
    badge: "Relaxed",
    description: "Warm, accessible tone with natural contractions, informal pacing, and authentic conversational cadence.",
    config: {
      burstinessLevel: 4,
      negativeFilterStrictness: "medium",
      customGuidance: "",
      temperature: 0.92,
      topP: 0.92,
      topK: 40,
      presencePenalty: 0.35,
      frequencyPenalty: 0.25,
    },
  },
  technical_peer: {
    id: "technical_peer",
    name: "Technical Peer",
    badge: "Engineering",
    description: "Direct, collegial phrasing with zero conversational fluff, maintaining technical precision and natural rhythm.",
    config: {
      burstinessLevel: 3,
      negativeFilterStrictness: "high",
      customGuidance: "",
      temperature: 0.75,
      topP: 0.88,
      topK: 40,
      presencePenalty: 0.20,
      frequencyPenalty: 0.15,
    },
  },
};

export const DEFAULT_HUMANIZER_CONFIG: HumanizerConfig = {
  enabled: false,
  preset: "balanced",
  ...HUMANIZER_PRESETS.balanced.config,
};

export const BANNED_CLICHES_BY_STRICTNESS: Record<NegativeFilterStrictness, string[]> = {
  low: [
    "In conclusion",
    "Delve into",
    "Furthermore",
    "In summary",
  ],
  medium: [
    "In conclusion",
    "Delve into",
    "Furthermore",
    "In summary",
    "It is important to note",
    "By contrast",
    "Testament to",
    "Tapestry",
    "Beacon",
    "Pivotal role",
    "Crucial to remember",
    "At the end of the day",
  ],
  high: [
    "In conclusion",
    "Delve into",
    "Furthermore",
    "In summary",
    "It is important to note",
    "By contrast",
    "Testament to",
    "Tapestry",
    "Beacon",
    "Pivotal role",
    "Crucial to remember",
    "At the end of the day",
    "First and foremost",
    "Moreover",
    "Needless to say",
    "As an AI",
    "It is worth noting",
    "Remember that",
    "Certainly!",
    "Great question!",
    "Navigating the landscape",
    "Harness the power of",
  ],
};

export const CODE_FENCE_PROTECTION_DIRECTIVE =
  "CRITICAL CODE INTEGRITY RULE: Never alter, stylize, or introduce informal disfluencies into markdown code fences (```...```), JSON structures, mathematical formulas, or shell terminal commands. Keep all code and data blocks syntactically valid, precise, and unaltered.";
