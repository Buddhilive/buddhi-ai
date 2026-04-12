import { create } from "zustand";
import type { DocumentStore } from "@/types/documents";

export const useDocumentStore = create<DocumentStore>()((set) => ({
    docs: {},
    activeCount: 0,

    initDoc(id) {
        set((s) => ({
            docs: {
                ...s.docs,
                [id]: {
                    status: "pending",
                    phase: null,
                    overallPct: 0,
                    chunkCount: null,
                    errorMsg: null,
                },
            },
            activeCount: s.activeCount + 1,
        }));
    },

    updateProgress(id, phase, overallPct) {
        set((s) => ({
            docs: {
                ...s.docs,
                [id]: {
                    ...s.docs[id],
                    status: "processing",
                    phase,
                    overallPct,
                },
            },
        }));
    },

    completeDoc(id, chunkCount) {
        set((s) => ({
            docs: {
                ...s.docs,
                [id]: {
                    ...s.docs[id],
                    status: "completed",
                    phase: null,
                    overallPct: 100,
                    chunkCount,
                    errorMsg: null,
                },
            },
            activeCount: Math.max(0, s.activeCount - 1),
        }));
    },

    failDoc(id, errorMsg) {
        set((s) => ({
            docs: {
                ...s.docs,
                [id]: {
                    ...s.docs[id],
                    status: "failed",
                    phase: null,
                    errorMsg,
                },
            },
            activeCount: Math.max(0, s.activeCount - 1),
        }));
    },

    removeDoc(id) {
        set((s) => {
            const { [id]: removed, ...rest } = s.docs;
            const wasActive =
                removed?.status === "pending" || removed?.status === "processing";
            return {
                docs: rest,
                activeCount: wasActive
                    ? Math.max(0, s.activeCount - 1)
                    : s.activeCount,
            };
        });
    },
}));