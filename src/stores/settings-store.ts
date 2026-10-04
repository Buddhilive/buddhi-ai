import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HumanizerConfig, HumanizerPresetId } from "@/types/humanizer";
import { DEFAULT_HUMANIZER_CONFIG, HUMANIZER_PRESETS } from "@/lib/humanizer/constants";

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
  humanizer: HumanizerConfig;
  setTheme: (theme: "system" | "light" | "dark") => void;
  setTopK: (topK: number) => void;
  setSimilarityThreshold: (thresh: number) => void;
  setDefaultCitationFormat: (fmt: "apa" | "mla" | "bibtex" | "chicago" | "ieee") => void;
  setHasConfiguredHFToken: (hasToken: boolean) => void;
  setEnableExtendedContext: (enabled: boolean) => void;
  setMaxContextTokens: (tokens: number) => void;
  setHumanizerEnabled: (enabled: boolean) => void;
  setHumanizerPreset: (preset: HumanizerPresetId) => void;
  updateHumanizerConfig: (updates: Partial<HumanizerConfig>) => void;
  resetHumanizerDefaults: () => void;
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
      humanizer: DEFAULT_HUMANIZER_CONFIG,
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
      setHumanizerEnabled: (enabled) =>
        set((state) => ({
          humanizer: {
            ...state.humanizer,
            enabled,
          },
        })),
      setHumanizerPreset: (preset) =>
        set((state) => {
          if (preset === "custom") {
            return {
              humanizer: {
                ...state.humanizer,
                preset: "custom",
              },
            };
          }
          const presetDef = HUMANIZER_PRESETS[preset];
          return {
            humanizer: {
              ...state.humanizer,
              preset,
              ...presetDef.config,
            },
          };
        }),
      updateHumanizerConfig: (updates) =>
        set((state) => ({
          humanizer: {
            ...state.humanizer,
            ...updates,
          },
        })),
      resetHumanizerDefaults: () =>
        set((state) => ({
          humanizer: {
            ...DEFAULT_HUMANIZER_CONFIG,
            enabled: state.humanizer.enabled,
          },
        })),
    }),
    {
      name: "buddhi-research-settings",
    }
  )
);

