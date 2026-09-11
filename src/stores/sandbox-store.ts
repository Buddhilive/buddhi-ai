import { create } from "zustand";
import { SandboxStatus, SandboxInitStage } from "@/types/sandbox";

interface SandboxState {
  status: SandboxStatus;
  initStage: SandboxInitStage;
  initProgressText: string;
  previewUrl: string | null;
  activePort: number | null;
  logs: string[];
  files: string[];
  errorMessage: string | null;
  activeTab: "preview" | "terminal" | "files";

  // Actions
  setStatus: (status: SandboxStatus) => void;
  setInitStage: (stage: SandboxInitStage, progressText?: string) => void;
  setPreviewUrl: (url: string | null) => void;
  setActivePort: (port: number | null) => void;
  appendLog: (line: string) => void;
  clearLogs: () => void;
  setFiles: (files: string[]) => void;
  setActiveTab: (tab: "preview" | "terminal" | "files") => void;
  setErrorMessage: (msg: string | null) => void;
  reset: () => void;
}

const MAX_LOGS = 1000;

export const useSandboxStore = create<SandboxState>()((set) => ({
  status: "idle",
  initStage: "booting",
  initProgressText: "Booting WebAssembly Sandbox...",
  previewUrl: null,
  activePort: null,
  logs: [],
  files: [],
  errorMessage: null,
  activeTab: "preview",

  setStatus: (status) => set({ status }),
  setInitStage: (initStage, progressText) =>
    set((state) => ({
      initStage,
      initProgressText: progressText ?? state.initProgressText,
    })),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  setActivePort: (activePort) => set({ activePort }),
  appendLog: (line) =>
    set((state) => {
      const newLogs = [...state.logs, line];
      if (newLogs.length > MAX_LOGS) {
        return { logs: newLogs.slice(newLogs.length - MAX_LOGS) };
      }
      return { logs: newLogs };
    }),
  clearLogs: () => set({ logs: [] }),
  setFiles: (files) => set({ files }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  reset: () =>
    set({
      status: "idle",
      initStage: "booting",
      initProgressText: "Booting WebAssembly Sandbox...",
      previewUrl: null,
      activePort: null,
      logs: [],
      files: [],
      errorMessage: null,
      activeTab: "preview",
    }),
}));
