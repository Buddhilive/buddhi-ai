import { DEFAULT_SYSTEM_PROMPT, VIBE_CODER_SYSTEM_PROMPT } from "@/const/system-prompt";

export interface SkillPromptOptions {
  basePrompt?: string;
  coreSkillPrompt?: string | null;
  domainSkillPrompt?: string | null;
}

export const MAX_SKILL_TOKEN_BUDGET = 2500;

/**
 * Estimates token count based on standard ~4 characters per token heuristic.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.trim().length / 4);
}

/**
 * Composes the system prompt for on-device Gemma/remote LLM with Next.js vibe coding core + domain skill overlay.
 */
export function composeSkillSystemPrompt(options: SkillPromptOptions): string {
  const { basePrompt, coreSkillPrompt, domainSkillPrompt } = options;

  let composed = basePrompt || VIBE_CODER_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;

  if (coreSkillPrompt) {
    composed += `\n\n---\n## Next.js Best Practices & Architecture\n${coreSkillPrompt}`;
  }

  if (domainSkillPrompt && domainSkillPrompt !== coreSkillPrompt) {
    composed += `\n\n---\n## Active Domain Skill\n${domainSkillPrompt}`;
  }

  // Safety check on token budget
  const tokenCount = estimateTokenCount(composed);
  if (tokenCount > MAX_SKILL_TOKEN_BUDGET) {
    console.warn(
      `[SkillInjector] Composed system prompt exceeds budget (${tokenCount} tokens > ${MAX_SKILL_TOKEN_BUDGET}).`
    );
  }

  return composed;
}
