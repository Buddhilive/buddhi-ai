/**
 * translate-gemma-store.ts
 *
 * Zustand store for TranslateGemma engine state.
 * UI components subscribe to this store for reactive status updates.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type TranslateGemmaStatus = "idle" | "loading" | "ready" | "error";

interface TranslateGemmaStoreState {
    /** Engine lifecycle status. */
    status: TranslateGemmaStatus;
    /** Human-readable error message, set when status is "error". */
    error?: string;
    /** True while a translation request is being processed. */
    isTranslating: boolean;
    /** The latest translation output (accumulated from streaming chunks). */
    currentTranslation: string;

    // Actions
    setStatus(status: TranslateGemmaStatus, error?: string): void;
    setIsTranslating(value: boolean): void;
    setCurrentTranslation(text: string): void;
    appendTranslation(chunk: string): void;
    clearTranslation(): void;
}

export const useTranslateGemmaStore = create<TranslateGemmaStoreState>()(
    devtools(
        (set) => ({
            status: "idle",
            error: undefined,
            isTranslating: false,
            currentTranslation: "",

            setStatus: (status, error) =>
                set({ status, error }, false, "setStatus"),

            setIsTranslating: (value) =>
                set({ isTranslating: value }, false, "setIsTranslating"),

            setCurrentTranslation: (text) =>
                set({ currentTranslation: text }, false, "setCurrentTranslation"),

            appendTranslation: (chunk) =>
                set(
                    (s) => ({ currentTranslation: s.currentTranslation + chunk }),
                    false,
                    "appendTranslation"
                ),

            clearTranslation: () =>
                set({ currentTranslation: "" }, false, "clearTranslation"),
        }),
        { name: "TranslateGemmaStore" }
    )
);
