import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ModelStatus =
    | "not_installed"
    | "downloading"
    | "completed"
    | "failed"
    | "unavailable";

export interface ModelState {
    status: ModelStatus;
    progress: number; // 0–100
    error?: string;
}

interface ModelStore {
    models: Record<string, ModelState>;
    setModel(id: string, state: Partial<ModelState>): void;
    removeModel(id: string): void;
    hydrated: boolean;
    setHydrated(hydrated: boolean): void;
}

export const useModelStore = create<ModelStore>()(
    persist(
        (set) => ({
            models: {},
            hydrated: false,
            setModel: (id, state) =>
                set((s) => ({
                    models: {
                        ...s.models,
                        [id]: { ...s.models[id], ...state },
                    },
                })),
            removeModel: (id) =>
                set((s) => {
                    const { [id]: _, ...rest } = s.models;
                    return { models: rest };
                }),
            setHydrated: (hydrated) => set({ hydrated }),
        }),
        {
            name: "buddhi-model-store",
            partialize: (state) => ({ models: state.models }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.setHydrated(true);
                }
            },
        }
    )
);