import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { SkillsIndex, SkillManifestEntry, StyleRecipeMeta } from "@/types/skills";
import { skillManager } from "@/lib/skills/skill-manager";

interface SkillState {
    isDesignerMode: boolean;
    index: SkillsIndex | null;
    activeSkill: SkillManifestEntry | null;
    corePrompt: string | null;
    activeRecipe: StyleRecipeMeta | null;
    recipePrompt: string | null;
    isLoading: boolean;
    error: string | null;

    setDesignerMode: (mode: boolean) => void;
    loadIndex: () => Promise<void>;
    activateSkill: (skillId: string) => Promise<void>;
    activateRecipe: (recipeId: string | null) => Promise<void>;
    processUserPrompt: (prompt: string) => Promise<void>;
}

export const useSkillStore = create<SkillState>()(
    devtools((set, get) => ({
        isDesignerMode: true,
        index: null,
        activeSkill: null,
        corePrompt: null,
        activeRecipe: null,
        recipePrompt: null,
        isLoading: false,
        error: null,

        setDesignerMode: (mode: boolean) => set({ isDesignerMode: mode }),

        loadIndex: async () => {
            set({ isLoading: true, error: null });
            try {
                const index = await skillManager.fetchIndex();
                set({ index, isLoading: false });

                // If in designer mode, pre-activate web-design-engineer
                if (get().isDesignerMode) {
                    await get().activateSkill("web-design-engineer");
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Failed to load skills";
                console.error("[SkillStore.loadIndex] Error:", err);
                set({ error: message, isLoading: false });
            }
        },

        activateSkill: async (skillId: string) => {
            const { index } = get();
            const skill = index?.skills.find((s) => s.id === skillId);
            if (!skill) return;

            set({ isLoading: true, activeSkill: skill });
            try {
                const corePrompt = await skillManager.fetchFile(skill.entryPoint);
                set({ corePrompt, isLoading: false });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Failed to load skill";
                console.error(`[SkillStore.activateSkill] Failed to load ${skill.entryPoint}:`, err);
                set({ error: message, isLoading: false });
            }
        },

        activateRecipe: async (recipeId: string | null) => {
            if (!recipeId) {
                set({ activeRecipe: null, recipePrompt: null });
                return;
            }

            const { activeSkill } = get();
            const recipe = activeSkill?.recipes?.find((r) => r.id === recipeId);
            if (!recipe) return;

            try {
                const recipePrompt = await skillManager.fetchFile(recipe.file);
                set({ activeRecipe: recipe, recipePrompt });
            } catch (err) {
                console.warn(`[SkillStore.activateRecipe] Failed to load recipe ${recipe.file}:`, err);
            }
        },

        processUserPrompt: async (prompt: string) => {
            const { index, isDesignerMode, activeSkill } = get();
            if (!index) return;

            // In designer mode, check if prompt requests a specific recipe (e.g., Linear, Minimal, SaaS)
            const currentSkill = activeSkill || index.skills.find(s => s.id === "web-design-engineer");
            if (currentSkill && isDesignerMode) {
                const matchedRecipe = skillManager.matchRecipe(prompt, currentSkill);
                if (matchedRecipe) {
                    await get().activateRecipe(matchedRecipe.id);
                }
            } else if (!isDesignerMode) {
                // Auto-trigger if matching intent
                const matchedSkill = skillManager.matchSkill(prompt, index);
                if (matchedSkill) {
                    await get().activateSkill(matchedSkill.id);
                    const matchedRecipe = skillManager.matchRecipe(prompt, matchedSkill);
                    if (matchedRecipe) {
                        await get().activateRecipe(matchedRecipe.id);
                    }
                }
            }
        },
    }))
);
