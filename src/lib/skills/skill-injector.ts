import { DEFAULT_SYSTEM_PROMPT } from "@/const/system-prompt";
import { WEB_DESIGNER_SYSTEM_PROMPT } from "@/const/system-prompts/web-designer";
import type { StyleRecipeMeta } from "@/types/skills";

export interface SkillPromptOptions {
    basePrompt?: string;
    coreSkillPrompt?: string | null;
    recipePrompt?: string | null;
    activeRecipe?: StyleRecipeMeta | null;
    isDesignerMode?: boolean;
}

export const MAX_SKILL_TOKEN_BUDGET = 1200;

/**
 * Estimates token count based on standard ~4 characters per token heuristic.
 */
export function estimateTokenCount(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.trim().length / 4);
}

/**
 * Composes the progressive disclosure system prompt for Gemma 4 E2B.
 */
export function composeSkillSystemPrompt(options: SkillPromptOptions): string {
    const {
        basePrompt,
        coreSkillPrompt,
        recipePrompt,
        activeRecipe,
        isDesignerMode = false,
    } = options;

    if (!isDesignerMode && !coreSkillPrompt) {
        return basePrompt || DEFAULT_SYSTEM_PROMPT;
    }

    // Start with core skill prompt if available, otherwise fall back to embedded web designer prompt
    let composed = coreSkillPrompt || WEB_DESIGNER_SYSTEM_PROMPT;

    // Progressive Disclosure: Append style recipe if selected
    if (recipePrompt) {
        const recipeTitle = activeRecipe ? `## Active Aesthetic Recipe: ${activeRecipe.name}` : "## Active Aesthetic Recipe";
        composed += `\n\n---\n${recipeTitle}\n${recipePrompt}`;
    }

    // Safety check on token budget
    const tokenCount = estimateTokenCount(composed);
    if (tokenCount > MAX_SKILL_TOKEN_BUDGET) {
        console.warn(
            `[SkillInjector] Composed skill prompt exceeds budget (${tokenCount} tokens > ${MAX_SKILL_TOKEN_BUDGET}). Progressive disclosure should trim content.`
        );
    }

    return composed;
}
