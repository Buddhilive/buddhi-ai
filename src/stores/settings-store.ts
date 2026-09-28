import { create } from "zustand";
import { persist } from "zustand/middleware";

export const LITERT_MAX_CONTEXT_TOKENS = 4096;
export const RLM_MAX_CONTEXT_TOKENS = 131072;
export const DEFAULT_MAX_CONTEXT_TOKENS = 4096;

interface SettingsState {
  theme: "system" | "light" | "dark";
  topK: number;
  similarityThreshold: number;
  defaultCitationFormat: "apa" | "mla" | "bibtex" | "chicago" | "ieee";
  hasConfiguredHFToken: boolean;
  enableExtendedContext: boolean;
  maxContextTokens: number;
  setTheme: (theme: "system" | "light" | "dark") => void;
  setTopK: (topK: number) => void;
  setSimilarityThreshold: (thresh: number) => void;
  setDefaultCitationFormat: (fmt: "apa" | "mla" | "bibtex" | "chicago" | "ieee") => void;
  setHasConfiguredHFToken: (hasToken: boolean) => void;
  setEnableExtendedContext: (enabled: boolean) => void;
  setMaxContextTokens: (tokens: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "system",
      topK: 5,
      similarityThreshold: 0.35,
      defaultCitationFormat: "apa",
      hasConfiguredHFToken: false,
      enableExtendedContext: true,
      maxContextTokens: DEFAULT_MAX_CONTEXT_TOKENS,
      setTheme: (theme) => set({ theme }),
      setTopK: (topK) => set({ topK }),
      setSimilarityThreshold: (similarityThreshold) => set({ similarityThreshold }),
      setDefaultCitationFormat: (defaultCitationFormat) => set({ defaultCitationFormat }),
      setHasConfiguredHFToken: (hasConfiguredHFToken) => set({ hasConfiguredHFToken }),
      setEnableExtendedContext: (enableExtendedContext) =>
        set((state) => ({
          enableExtendedContext,
          // If turning off RLM, clamp maxContextTokens back to 4096 LiteRT limit
          maxContextTokens: !enableExtendedContext && state.maxContextTokens > LITERT_MAX_CONTEXT_TOKENS
            ? LITERT_MAX_CONTEXT_TOKENS
            : state.maxContextTokens,
        })),
      setMaxContextTokens: (tokens) => {
        const isRlm = get().enableExtendedContext;
        const upperLimit = isRlm ? RLM_MAX_CONTEXT_TOKENS : LITERT_MAX_CONTEXT_TOKENS;
        const clamped = Math.min(Math.max(tokens, 1024), upperLimit);
        set({ maxContextTokens: clamped });
      },
    }),
    {
      name: "buddhi-research-settings",
    }
  )
);
