/**
 * Humanizer Prompt Directives Composer
 * Compiles anti-formulaic negative constraints, burstiness rules, and code safety
 */

import type { HumanizerConfig } from "@/types/humanizer";
import {
  BANNED_CLICHES_BY_STRICTNESS,
  CODE_FENCE_PROTECTION_DIRECTIVE,
} from "./constants";

export interface ComposeDirectiveOptions {
  /** Maximum character budget allocated for humanizer directives */
  maxChars?: number;
  /** Whether the conversation query is in English */
  isEnglish?: boolean;
  /** Optional user prompt text for automatic multilingual detection */
  promptText?: string;
}

/**
 * Heuristic to detect whether the user's prompt is predominantly English/Latin.
 * Avoids injecting English cliché negative constraints into non-English queries.
 */
export function detectIsEnglish(text?: string): boolean {
  if (!text || text.trim().length === 0) return true;
  // Check for non-Latin script ranges: CJK, Cyrillic, Arabic, Devanagari, Hebrew, Thai
  const nonLatinMatch = text.match(/[\u4e00-\u9fff\u0400-\u04ff\u0600-\u06ff\u0900-\u097f\u0590-\u05ff\u0e00-\u0e7f]/g);
  if (nonLatinMatch && nonLatinMatch.length > text.trim().length * 0.25) {
    return false;
  }
  return true;
}

/**
 * Builds instructions for sentence cadence variation according to the burstiness level.
 */
function getBurstinessDirective(level: number): string {
  switch (level) {
    case 1:
      return "Maintain a clear, balanced sentence structure.";
    case 2:
      return "Incorporate natural variation in sentence length and flow.";
    case 4:
      return "Vary sentence length dynamically: alternate deliberately between concise, punchy sentences and detailed, multi-clause analytical sentences to produce an authentic human cadence.";
    case 5:
      return "Maximize syntactic burstiness: create sharp rhythmic contrast by pairing brief, punchy declarative statements (3-8 words) with longer, compound-complex sentences. Avoid predictable or uniform sentence length.";
    case 3:
    default:
      return "Introduce rhythmic variety: mix short, direct sentences with richer explanatory clauses so the prose avoids monotonic or repetitive AI pacing.";
  }
}

/**
 * Builds the preset-specific tone directive.
 */
function getPresetToneDirective(preset: string): string {
  switch (preset) {
    case "academic_hedged":
      return "Tone: Academic and scholarly with rigorous epistemic modesty. Replace blunt, absolute claims with cautious, evidence-backed hedging ('suggests that', 'indicates under standard conditions', 'points toward'). Maintain analytical precision without generic AI throat-clearing.";
    case "executive_concise":
      return "Tone: Executive, concise, and punchy. Eliminate all filler, throat-clearing, and verbose transitional phrasing. Prioritize active voice, immediate takeaways, and high information density.";
    case "conversational":
    case "casual":
      return "Tone: Warm, conversational, and approachable. Use natural contractions and casual transitional phrasing as an authentic human speaker would.";
    case "technical_peer":
      return "Tone: Direct, collegial, and technically rigorous. Speak as a seasoned engineering peer. Eliminate all introductory pleasantries, sycophantic praise, or apologetic hedging. Jump straight into the substantive technical answer.";
    case "balanced":
    default:
      return "Tone: Natural, thoughtful, and authentic. Exhibit epistemic modesty (e.g., acknowledge nuance and practical limits without unnecessary throat-clearing).";
  }
}

/**
 * Composes the comprehensive humanizer system directive block to inject into the LLM context.
 */
export function composeHumanizerSystemDirective(
  config: HumanizerConfig,
  options?: ComposeDirectiveOptions
): string {
  if (!config.enabled) {
    return "";
  }

  const isEnglish = options?.isEnglish ?? detectIsEnglish(options?.promptText);
  const sections: string[] = ["[STYLE & CADENCE DIRECTIVES]"];

  // 1. Preset Tone
  sections.push(getPresetToneDirective(config.preset));

  // 2. Burstiness / Cadence
  sections.push(`Cadence: ${getBurstinessDirective(config.burstinessLevel)}`);

  // 3. Negative Constraints (Banned Clichés)
  if (isEnglish) {
    const cliches = [...(BANNED_CLICHES_BY_STRICTNESS[config.negativeFilterStrictness] || [])];

    // If maxChars constraint is specified, trim clichés from the end to stay under budget
    if (options?.maxChars && options.maxChars > 0) {
      while (cliches.length > 3 && sections.join("\n").length + cliches.join(", ").length > options.maxChars) {
        cliches.pop();
      }
    }

    if (cliches.length > 0) {
      sections.push(
        `Negative Constraints: Strictly avoid formulaic AI clichés and discourse markers, including but not limited to: ${cliches.map((c) => `"${c}"`).join(", ")}.`
      );
    }
  }

  // 4. Custom User Guidance
  if (config.customGuidance && config.customGuidance.trim().length > 0) {
    sections.push(`Custom Guidance: ${config.customGuidance.trim()}`);
  }

  // 5. Code Fence & Technical Integrity
  sections.push(CODE_FENCE_PROTECTION_DIRECTIVE);

  return sections.join("\n\n");
}
