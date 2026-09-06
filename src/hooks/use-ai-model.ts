"use client";

import { useEffect, useRef } from "react";
import { Engine } from "@litert-lm/core";
import { useLiteRTModelStore } from "@/stores/litert-store";
import { useModelStore } from "@/stores/model-store";
import { MODELS } from "@/const/models";
import { getModelObjectURL } from "@/lib/model-manager";

/**
 * Watches the model store and initializes LiteRT-LM Engine when a language model
 * transitions to "completed". Sets liteRTModelInstance in useLiteRTModelStore.
 * Call this once from the app layout so the engine is available app-wide.
 */
export function useModelEngine() {
    const {
        liteRTModelInstance,
        setLiteRTModelInstance,
        setLiteRTModelModel,
        setLiteRTModelStatus,
    } = useLiteRTModelStore();
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
            setLiteRTModelStatus("idle");
            return;
        }

        // WebGPU validation
        if (typeof navigator !== "undefined" && (!("gpu" in navigator) || !navigator.gpu)) {
            console.error("[use-model-engine] WebGPU is not supported or enabled in this browser.");
            setLiteRTModelStatus("error");
            return;
        }

        setLiteRTModelStatus("loading");
        initializingRef.current = true;
        console.log("[use-model-engine] Initializing LiteRT-LM engine for model:", completedModel);

        (async () => {
            try {
                const objectUrl = await getModelObjectURL(completedModel.id);
                if (!objectUrl) {
                    initializingRef.current = false;
                    setLiteRTModelStatus("error");
                    return;
                }
                objectUrlRef.current = objectUrl;

                const engine = await Engine.create({
                    model: objectUrl,
                    mainExecutorSettings: {
                        maxNumTokens: 8192,
                    },
                });

                setLiteRTModelInstance(engine);
                setLiteRTModelModel(completedModel.id);
                setLiteRTModelStatus("ready");
            } catch (err) {
                console.error("[use-model-engine] Failed to initialize LiteRT-LM engine:", err);
                initializingRef.current = false;
                setLiteRTModelStatus("error");
            } finally {
                // Engine has ingested the model blob/stream — safe to revoke object URL
                if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                    objectUrlRef.current = null;
                }
            }
        })();
    }, [hydrated, liteRTModelInstance, models, setLiteRTModelInstance, setLiteRTModelModel, setLiteRTModelStatus]);
}