import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { IngestionJob, PipelineStage, Paper } from "@/types/research";

interface IngestionStoreState {
  jobs: IngestionJob[];
  isProcessing: boolean;
  activeJobId: string | null;

  // Actions
  addJobs: (newJobs: IngestionJob[]) => void;
  updateJob: (jobId: string, patch: Partial<IngestionJob>) => void;
  setJobStage: (
    jobId: string,
    stage: PipelineStage,
    stepLabel: string,
    progress: number,
    currentStep: number
  ) => void;
  setJobProgress: (jobId: string, currentChunk: number, totalChunks: number) => void;
  setJobError: (jobId: string, error: string) => void;
  setJobCompleted: (jobId: string, paper?: Paper) => void;
  removeJob: (jobId: string) => void;
  clearCompletedJobs: () => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setActiveJobId: (jobId: string | null) => void;
  resetQueue: () => void;
}

export const useIngestionStore = create<IngestionStoreState>()(
  persist(
    (set) => ({
      jobs: [],
      isProcessing: false,
      activeJobId: null,

      addJobs: (newJobs) =>
        set((state) => ({
          jobs: [...state.jobs, ...newJobs],
          isProcessing: true,
        })),

      updateJob: (jobId, patch) =>
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId ? { ...job, ...patch } : job
          ),
        })),

      setJobStage: (jobId, stage, stepLabel, progress, currentStep) =>
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  stage,
                  stepLabel,
                  progress,
                  currentStep,
                }
              : job
          ),
        })),

      setJobProgress: (jobId, currentChunk, totalChunks) =>
        set((state) => ({
          jobs: state.jobs.map((job) => {
            if (job.id !== jobId) return job;
            // Embedding is step 3: maps chunk progress between 40% and 85%
            const chunkPercent = totalChunks > 0 ? (currentChunk / totalChunks) * 45 : 0;
            const progress = Math.min(85, Math.round(40 + chunkPercent));
            return {
              ...job,
              currentChunk,
              totalChunks,
              progress,
              stepLabel: `Embedding chunks (${currentChunk}/${totalChunks})`,
            };
          }),
        })),

      setJobError: (jobId, error) =>
        set((state) => {
          const updatedJobs = state.jobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  stage: "failed" as PipelineStage,
                  stepLabel: "Failed",
                  error,
                  completedTime: Date.now(),
                }
              : job
          );
          const stillProcessing = updatedJobs.some(
            (j) => j.stage !== "completed" && j.stage !== "failed" && j.stage !== "idle"
          );
          return {
            jobs: updatedJobs,
            isProcessing: stillProcessing,
          };
        }),

      setJobCompleted: (jobId, paper) =>
        set((state) => {
          const updatedJobs = state.jobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  stage: "completed" as PipelineStage,
                  stepLabel: "Completed",
                  progress: 100,
                  currentStep: 4,
                  completedTime: Date.now(),
                  paper: paper || job.paper,
                }
              : job
          );
          const stillProcessing = updatedJobs.some(
            (j) => j.stage !== "completed" && j.stage !== "failed" && j.stage !== "idle"
          );
          return {
            jobs: updatedJobs,
            isProcessing: stillProcessing,
          };
        }),

      removeJob: (jobId) =>
        set((state) => {
          const remaining = state.jobs.filter((j) => j.id !== jobId);
          const stillProcessing = remaining.some(
            (j) => j.stage !== "completed" && j.stage !== "failed" && j.stage !== "idle"
          );
          return {
            jobs: remaining,
            isProcessing: stillProcessing,
            activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
          };
        }),

      clearCompletedJobs: () =>
        set((state) => ({
          jobs: state.jobs.filter((j) => j.stage !== "completed" && j.stage !== "failed"),
        })),

      setIsProcessing: (isProcessing) => set({ isProcessing }),

      setActiveJobId: (activeJobId) => set({ activeJobId }),

      resetQueue: () =>
        set({
          jobs: [],
          isProcessing: false,
          activeJobId: null,
        }),
    }),
    {
      name: "buddhi_ingestion_queue",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        jobs: state.jobs,
        isProcessing: state.isProcessing,
        activeJobId: state.activeJobId,
      }),
    }
  )
);
