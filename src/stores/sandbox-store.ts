import { create } from "zustand";
import { SandboxStatus } from "@/types/sandbox";

interface SandboxState {
  status: SandboxStatus;
  previewUrl: string | null;
  activePort: number | null;
  logs: string[];
  files: string[];
  errorMessage: string | null;
  activeTab: "preview" | "terminal" | "files";

  // Actions
  setStatus: (status: SandboxStatus) => void;
  setPreviewUrl: (url: string | null) => void;
  setActivePort: (port: number | null) => void;
  appendLog: (line: string) => void;
  clearLogs: () => void;
  setFiles: (files: string[]) => void;
  setActiveTab: (tab: "preview" | "terminal" | "files") => void;
  setErrorMessage: (msg: string | null) => void;
  reset: () => void;
}

const MAX_LOGS = 500;

export const useSandboxStore = create<SandboxState>()((set) => ({
  status: "idle",
  previewUrl: null,
  activePort: null,
  logs: [],
  files: [],
  errorMessage: null,
  activeTab: "preview",

  setStatus: (status) => set({ status }),
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
      previewUrl: null,
      activePort: null,
      logs: [],
      files: [],
      errorMessage: null,
      activeTab: "preview",
    }),
}));
