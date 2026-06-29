"use client";

import { useParams } from "next/navigation";
import { useLiteRTModelStore } from "@/stores/litert-store";
import { ModelLoadingState, ModelUnavailableState } from "./chat-model-states";
import { ChatSession } from "./chat-session";

/**
 * The top-level chat component. Calls `useModelEngine` to trigger LlmInference
 * initialisation, then guards rendering based on `liteRTModelStatus`:
 *
 *  idle / loading  → spinner
 *  error           → "model failed to load" + manage button
 *  ready (no inst) → "no model available" + download button  (should not happen)
 *  ready           → <ChatSession instance={…} />
 */
export function ChatInterface() {
    const instance = useLiteRTModelStore((s) => s.liteRTModelInstance);
    const modelStatus = useLiteRTModelStore((s) => s.liteRTModelStatus);

    const params = useParams<{ chatId?: string[] }>();
    const chatId = params.chatId?.[0] ?? null;

    if (!modelStatus || modelStatus === "idle" || modelStatus === "loading") {
        return <ModelLoadingState />;
    }

    if (modelStatus === "error") {
        return <ModelUnavailableState isError />;
    }

    if (!instance) {
        return <ModelUnavailableState isError={false} />;
    }

    return <ChatSession instance={instance} chatId={chatId} key={chatId ?? "new"} />;
}
