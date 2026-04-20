"use client";

/**
 * use-translate-engine.ts
 *
 * React hook that watches the model store, detects when TranslateGemma has
 * been downloaded, and initialises the translation engine automatically.
 *
 * Call this from the Translator page (NOT the root layout) so the engine only
 * loads when the user navigates to the translator. This keeps it out of memory
 * when not in use.
 *
 * Pattern mirrors use-ai-model.ts (the conversational chat engine).
 */

import { useEffect, useRef } from "react";
import { useModelStore } from "@/stores/model-store";
import { useTranslateGemmaStore } from "@/stores/translate-gemma-store";
import { getModelObjectURL } from "@/lib/model-manager";
import {
    initTranslateGemma,
    onTranslateGemmaStatus,
    getTranslateGemmaStatus,
} from "@/lib/translate-gemma";
import { MODELS } from "@/const/models";

const TRANSLATE_GEMMA_MODEL_ID = "litert-community/TranslateGemma-4B-IT";

/**
 * Hook that auto-initialises TranslateGemma when the model is available.
 * Subscribe to `useTranslateGemmaStore` for reactive status + errors.
 */
export function useTranslateEngine() {
    const { setStatus } = useTranslateGemmaStore();
    const models = useModelStore((s) => s.models);
    const hydrated = useModelStore((s) => s.hydrated);
    const initializingRef = useRef(false);
    const objectUrlRef = useRef<string | null>(null);

    // Wire the library's pub/sub into the Zustand store once.
    useEffect(() => {
        const unsubscribe = onTranslateGemmaStatus((status, error) => {
            setStatus(
                status as "idle" | "loading" | "ready" | "error",
                error
            );
        });
        return unsubscribe;
    }, [setStatus]);

    useEffect(() => {
        if (!hydrated) return;

        // Already initialised or initialising.
        const currentStatus = getTranslateGemmaStatus();
        if (currentStatus === "ready" || currentStatus === "loading") return;
        if (initializingRef.current) return;

        const modelConfig = MODELS.find((m) => m.id === TRANSLATE_GEMMA_MODEL_ID);
        if (!modelConfig) {
            console.error(
                "[use-translate-engine] TranslateGemma model config not found in MODELS."
            );
            return;
        }

        const modelState = models[TRANSLATE_GEMMA_MODEL_ID];
        if (modelState?.status !== "completed") {
            // Model not yet downloaded — nothing to do.
            if (currentStatus !== "idle") {
                setStatus("idle");
            }
            return;
        }

        // Model is downloaded — initialise the engine.
        initializingRef.current = true;
        setStatus("loading");

        console.info(
            "[use-translate-engine] TranslateGemma downloaded, initialising engine…"
        );

        (async () => {
            try {
                const objectUrl = await getModelObjectURL(TRANSLATE_GEMMA_MODEL_ID);
                if (!objectUrl) {
                    setStatus(
                        "error",
                        "TranslateGemma model file not found in browser cache. " +
                            "Try re-downloading the model from the Models page."
                    );
                    initializingRef.current = false;
                    return;
                }

                objectUrlRef.current = objectUrl;
                await initTranslateGemma(objectUrl);
                // Status is updated by the library's status listener above.
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error("[use-translate-engine] Init failed:", err);
                setStatus("error", msg);
                initializingRef.current = false;
            } finally {
                // MediaPipe copies the model into WASM memory — safe to revoke blob URL.
                if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                    objectUrlRef.current = null;
                }
            }
        })();
    }, [hydrated, models, setStatus]);
}

/**
 * Returns true if the TranslateGemma model has been downloaded and is
 * available in the browser cache.
 *
 * Use this outside the translator page (e.g., in the sidebar nav) to check
 * visibility without mounting the engine.
 */
export function useIsTranslateGemmaDownloaded(): boolean {
    const models = useModelStore((s) => s.models);
    const hydrated = useModelStore((s) => s.hydrated);

    if (!hydrated) return false;
    return models[TRANSLATE_GEMMA_MODEL_ID]?.status === "completed";
}
