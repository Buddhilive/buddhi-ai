import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  theme: "system" | "light" | "dark";
  topK: number;
  similarityThreshold: number;
  defaultCitationFormat: "apa" | "mla" | "bibtex" | "chicago" | "ieee";
  hasConfiguredHFToken: boolean;
  setTheme: (theme: "system" | "light" | "dark") => void;
  setTopK: (topK: number) => void;
  setSimilarityThreshold: (thresh: number) => void;
  setDefaultCitationFormat: (fmt: "apa" | "mla" | "bibtex" | "chicago" | "ieee") => void;
  setHasConfiguredHFToken: (hasToken: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      topK: 5,
      similarityThreshold: 0.35,
      defaultCitationFormat: "apa",
      hasConfiguredHFToken: false,
      setTheme: (theme) => set({ theme }),
      setTopK: (topK) => set({ topK }),
      setSimilarityThreshold: (similarityThreshold) => set({ similarityThreshold }),
      setDefaultCitationFormat: (defaultCitationFormat) => set({ defaultCitationFormat }),
      setHasConfiguredHFToken: (hasConfiguredHFToken) => set({ hasConfiguredHFToken }),
    }),
    {
      name: "buddhi-research-settings",
    }
  )
);
