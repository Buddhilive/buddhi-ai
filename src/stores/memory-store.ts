import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type CompactionStrategy = "litert-standard" | "rlm-recursive" | null;

interface MemoryState {
    /** Current prompt token count (updated each time sendMessages builds a prompt or generation completes). */
    tokenCount: number;
    /** True while a summarization/compaction LLM call is in progress. */
    isSummarizing: boolean;
    /** True once the active chat has been successfully summarized and stored. */
    isSummarized: boolean;
    /** Estimated tokens saved by recent compaction. */
    tokensSaved: number;
    /** Compaction strategy used for the active chat session. */
    compactionStrategy: CompactionStrategy;
    setTokenCount: (count: number) => void;
    setIsSummarizing: (v: boolean) => void;
    setIsSummarized: (v: boolean) => void;
    setCompactionSavings: (saved: number, strategy: CompactionStrategy) => void;
    /** Reset all fields — call when navigating to a new/different chat. */
    reset: () => void;
}

export const useMemoryStore = create<MemoryState>()(
    devtools(
        (set) => ({
            tokenCount: 0,
            isSummarizing: false,
            isSummarized: false,
            tokensSaved: 0,
            compactionStrategy: null,
            setTokenCount: (count) => set({ tokenCount: count }),
            setIsSummarizing: (v) => set({ isSummarizing: v }),
            setIsSummarized: (v) => set({ isSummarized: v }),
            setCompactionSavings: (saved, strategy) =>
                set({ tokensSaved: saved, compactionStrategy: strategy, isSummarized: true }),
            reset: () =>
                set({
                    tokenCount: 0,
                    isSummarizing: false,
                    isSummarized: false,
                    tokensSaved: 0,
                    compactionStrategy: null,
                }),
        }),
        { name: "MemoryStore" }
    )
);
