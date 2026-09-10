import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { SkillsIndex, SkillManifestEntry } from "@/types/skills";
import { skillManager } from "@/lib/skills/skill-manager";

interface SkillState {
  index: SkillsIndex | null;
  activeSkill: SkillManifestEntry | null;
  corePrompt: string | null;
  isLoading: boolean;
  error: string | null;

  loadIndex: () => Promise<void>;
  activateSkill: (skillId: string) => Promise<void>;
  processUserPrompt: (prompt: string) => Promise<void>;
}

export const useSkillStore = create<SkillState>()(
  devtools((set, get) => ({
    index: null,
    activeSkill: null,
    corePrompt: null,
    isLoading: false,
    error: null,

    loadIndex: async () => {
      set({ isLoading: true, error: null });
      try {
        const index = await skillManager.fetchIndex();
        set({ index, isLoading: false });

        // Auto-activate nextjs-vibe-coder skill by default
        await get().activateSkill("nextjs-vibe-coder");
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

    processUserPrompt: async (prompt: string) => {
      const { index, activeSkill } = get();
      if (!index) return;

      if (!activeSkill) {
        const matchedSkill = skillManager.matchSkill(prompt, index);
        if (matchedSkill) {
          await get().activateSkill(matchedSkill.id);
        } else {
          await get().activateSkill("nextjs-vibe-coder");
        }
      }
    },
  }))
);
