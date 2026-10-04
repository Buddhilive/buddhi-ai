import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  StudioConfig,
  HumanizerExecutionStage,
  RLMExecutionContext,
  DiffAnalysisResult,
  HumanizerPresetId,
  HumanizerIntensity,
} from "@/types/humanizer";
import { DEFAULT_STUDIO_CONFIG, INTENSITY_MODIFIERS, HUMANIZER_PRESETS } from "@/lib/humanizer/constants";

interface HumanizerStudioState {
  rawInput: string;
  outputMarkdown: string;
  activeTab: "editor" | "preview" | "diff";
  previewMode: "rendered" | "raw";
  config: StudioConfig;
  stage: HumanizerExecutionStage;
  progressPercent: number;
  currentStageMessage: string;
  errorMessage?: string;
  rlmContext: RLMExecutionContext | null;
  diffResult: DiffAnalysisResult | null;
  hasExecuted: boolean;

  // Actions
  setRawInput: (input: string) => void;
  setOutputMarkdown: (output: string) => void;
  setActiveTab: (tab: "editor" | "preview" | "diff") => void;
  setPreviewMode: (mode: "rendered" | "raw") => void;
  setTonePreset: (preset: HumanizerPresetId) => void;
  setIntensity: (intensity: HumanizerIntensity) => void;
  updateConfig: (updates: Partial<StudioConfig>) => void;
  setStage: (stage: HumanizerExecutionStage, message?: string, progress?: number) => void;
  setError: (error?: string) => void;
  setDiffResult: (result: DiffAnalysisResult | null) => void;
  setRLMContext: (ctx: RLMExecutionContext | null) => void;
  clearInput: () => void;
  resetStudio: () => void;
}

export const useHumanizerStore = create<HumanizerStudioState>()(
  persist(
    (set) => ({
      rawInput: "",
      outputMarkdown: "",
      activeTab: "editor",
      previewMode: "rendered",
      config: DEFAULT_STUDIO_CONFIG,
      stage: "idle",
      progressPercent: 0,
      currentStageMessage: "",
      errorMessage: undefined,
      rlmContext: null,
      diffResult: null,
      hasExecuted: false,

      setRawInput: (rawInput) => set({ rawInput, errorMessage: undefined }),
      setOutputMarkdown: (outputMarkdown) => set({ outputMarkdown, hasExecuted: true }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setPreviewMode: (previewMode) => set({ previewMode }),

      setTonePreset: (preset) =>
        set((state) => {
          const presetDef = (HUMANIZER_PRESETS as any)[preset];
          return {
            config: {
              ...state.config,
              tonePreset: preset,
              burstinessLevel: presetDef?.config.burstinessLevel ?? state.config.burstinessLevel,
              customGuidance: presetDef?.config.customGuidance ?? state.config.customGuidance,
            },
          };
        }),

      setIntensity: (intensity) =>
        set((state) => {
          const mod = INTENSITY_MODIFIERS[intensity];
          return {
            config: {
              ...state.config,
              intensity,
              burstinessLevel: mod.burstinessLevel,
            },
          };
        }),

      updateConfig: (updates) =>
        set((state) => ({
          config: { ...state.config, ...updates },
        })),

      setStage: (stage, message, progress) =>
        set((state) => ({
          stage,
          currentStageMessage: message ?? state.currentStageMessage,
          progressPercent: progress !== undefined ? progress : state.progressPercent,
          errorMessage: stage === "error" ? state.errorMessage : undefined,
        })),

      setError: (errorMessage) =>
        set({
          stage: "error",
          errorMessage,
          currentStageMessage: errorMessage || "An error occurred during humanization.",
        }),

      setDiffResult: (diffResult) => set({ diffResult }),
      setRLMContext: (rlmContext) => set({ rlmContext }),

      clearInput: () =>
        set({
          rawInput: "",
          outputMarkdown: "",
          stage: "idle",
          progressPercent: 0,
          currentStageMessage: "",
          errorMessage: undefined,
          diffResult: null,
          rlmContext: null,
          hasExecuted: false,
        }),

      resetStudio: () =>
        set({
          rawInput: "",
          outputMarkdown: "",
          activeTab: "editor",
          previewMode: "rendered",
          config: DEFAULT_STUDIO_CONFIG,
          stage: "idle",
          progressPercent: 0,
          currentStageMessage: "",
          errorMessage: undefined,
          diffResult: null,
          rlmContext: null,
          hasExecuted: false,
        }),
    }),
    {
      name: "buddhi-humanizer-studio-storage",
      partialize: (state) => ({
        rawInput: state.rawInput,
        outputMarkdown: state.outputMarkdown,
        config: state.config,
        previewMode: state.previewMode,
      }),
    }
  )
);
