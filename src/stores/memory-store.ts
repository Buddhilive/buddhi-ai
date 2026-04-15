import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface MemoryState {
    /** Current prompt token count (updated each time sendMessages builds a prompt). */
    tokenCount: number;
    /** True while a summarization LLM call is in progress. */
    isSummarizing: boolean;
    /** True once the active chat has been successfully summarized and stored. */
    isSummarized: boolean;
    setTokenCount: (count: number) => void;
    setIsSummarizing: (v: boolean) => void;
    setIsSummarized: (v: boolean) => void;
    /** Reset all fields — call when navigating to a new/different chat. */
    reset: () => void;
}

export const useMemoryStore = create<MemoryState>()(
    devtools(
        (set) => ({
            tokenCount: 0,
            isSummarizing: false,
            isSummarized: false,
            setTokenCount: (count) => set({ tokenCount: count }),
            setIsSummarizing: (v) => set({ isSummarizing: v }),
            setIsSummarized: (v) => set({ isSummarized: v }),
            reset: () =>
                set({ tokenCount: 0, isSummarizing: false, isSummarized: false }),
        }),
        { name: "MemoryStore" }
    )
);
