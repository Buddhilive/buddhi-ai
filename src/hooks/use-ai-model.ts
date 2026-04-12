"use client";

import { useEffect, useRef } from "react";
import { FilesetResolver, LlmInference } from "@mediapipe/tasks-genai";
import { useLiteRTModelStore } from "@/stores/litert-store";
import { useModelStore } from "@/stores/model-store";
import { MODELS } from "@/const/models";
import { getModelObjectURL } from "@/lib/model-manager";

/**
 * Watches the model store and initializes LlmInference when a language model
 * transitions to "completed". Sets liteRTModelInstance in useLiteRTModelStore.
 * Call this once from the app layout so the engine is available app-wide.
 */
export function useModelEngine() {
    const { liteRTModelInstance, setLiteRTModelInstance, setLiteRTModelStatus } = useLiteRTModelStore();
    const models = useModelStore((s) => s.models);
    const hydrated = useModelStore((s) => s.hydrated);
    const initializingRef = useRef(false);
    const objectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        if (!hydrated) return;
        if (liteRTModelInstance) return;
        if (initializingRef.current) return;

        const completedModel = MODELS.find(
            (m) => m.type === "language" && models[m.id]?.status === "completed"
        );
        if (!completedModel) {
            setLiteRTModelStatus("error");
            return
        };

        setLiteRTModelStatus("loading");
        initializingRef.current = true;
        console.log("[use-model-engine] Initializing engine for model:", completedModel);

        (async () => {
            try {
                const objectUrl = await getModelObjectURL(completedModel.id);
                if (!objectUrl) {
                    initializingRef.current = false;
                    return;
                }
                objectUrlRef.current = objectUrl;

                const genai = await FilesetResolver.forGenAiTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest/wasm"
                );
                const llmInference = await LlmInference.createFromOptions(genai, {
                    baseOptions: { modelAssetPath: objectUrl },
                    maxTokens: 31000,
                    maxNumImages: 10,
                });
                setLiteRTModelInstance(llmInference);
                setLiteRTModelStatus("ready");
            } catch (err) {
                console.error("[use-model-engine] Failed to initialize engine:", err);
                initializingRef.current = false;
                setLiteRTModelStatus("error");
            } finally {
                // MediaPipe has copied the model into WASM memory — safe to revoke
                if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                    objectUrlRef.current = null;
                }
            }
        })();
    }, [hydrated, liteRTModelInstance, models, setLiteRTModelInstance, setLiteRTModelStatus]);
}