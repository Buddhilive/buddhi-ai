/**
 * Humanizer Constants & Presets
 * Configurable LLM Humanizer & Text Humanizer Studio for Buddhi AI
 */

import type {
  HumanizerConfig,
  HumanizerPresetDefinition,
  NegativeFilterStrictness,
  HumanizerIntensity,
  StudioConfig,
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

export const HUMANIZER_PRESETS: Record<
  "balanced" | "casual" | "conversational" | "technical_peer" | "academic_hedged" | "executive_concise",
  HumanizerPresetDefinition
> = {
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
  conversational: {
    id: "conversational",
    name: "Conversational",
    badge: "Accessible",
    description: "Warm, human-centric prose with relatable pacing, contractions, and natural dialogue markers.",
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
  academic_hedged: {
    id: "academic_hedged",
    name: "Academic Hedged",
    badge: "Scholarly",
    description: "Epistemic modesty with cautious assertions ('suggests', 'indicates', 'under specific conditions'), eliminating unearned certainty.",
    config: {
      burstinessLevel: 3,
      negativeFilterStrictness: "high",
      customGuidance: "Adopt scholarly caution and epistemic modesty. Replace unearned absolutes with nuanced, evidenced claims.",
      temperature: 0.78,
      topP: 0.88,
      topK: 35,
      presencePenalty: 0.25,
      frequencyPenalty: 0.20,
    },
  },
  executive_concise: {
    id: "executive_concise",
    name: "Executive Concise",
    badge: "High Signal",
    description: "Punchy, direct, and high signal-to-noise. Eliminates preamble, pleasantries, and throat-clearing for sharp takeaways.",
    config: {
      burstinessLevel: 4,
      negativeFilterStrictness: "high",
      customGuidance: "Prioritize brevity, active verbs, and high information density. Omit all empty transitions and throat-clearing.",
      temperature: 0.75,
      topP: 0.85,
      topK: 30,
      presencePenalty: 0.30,
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

export const DEFAULT_STUDIO_CONFIG: StudioConfig = {
  tonePreset: "balanced",
  intensity: "balanced",
  preserveCodeFences: true,
  burstinessLevel: 3,
  customGuidance: "",
};

export const INTENSITY_MODIFIERS: Record<
  HumanizerIntensity,
  { temperatureDelta: number; burstinessLevel: 1 | 2 | 3 | 4 | 5; strictness: NegativeFilterStrictness }
> = {
  low: {
    temperatureDelta: -0.1,
    burstinessLevel: 2,
    strictness: "low",
  },
  balanced: {
    temperatureDelta: 0.0,
    burstinessLevel: 3,
    strictness: "medium",
  },
  aggressive: {
    temperatureDelta: 0.1,
    burstinessLevel: 5,
    strictness: "high",
  },
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
    "In today's fast-paced world",
    "Shed light on",
    "A double-edged sword",
    "Unlock the potential",
  ],
};

export const CODE_FENCE_PROTECTION_DIRECTIVE =
  "CRITICAL CODE INTEGRITY RULE: Never alter, stylize, or introduce informal disfluencies into markdown code fences (```...```), JSON structures, mathematical formulas, or shell terminal commands. Keep all code and data blocks syntactically valid, precise, and unaltered.";

export const IMMUTABLE_TOKEN_PROTECTION_DIRECTIVE =
  "CRITICAL IMMUTABLE TOKEN RULE: The input text contains protected placeholder tokens like «IMMUTABLE_CODE_...», «IMMUTABLE_MATH_...», and «IMMUTABLE_TABLE_...». You MUST reproduce every such token EXACTLY as written without changing a single character, punctuation, or bracket.";
