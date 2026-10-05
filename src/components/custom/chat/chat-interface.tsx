"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useLiteRTModelStore } from "@/stores/litert-store";
import { ModelLoadingState, ModelUnavailableState } from "./chat-model-states";
import { ChatSession } from "./chat-session";
import { ChatModeSelection, type SelectedModePayload } from "./chat-mode-selection";
import { getPaperById } from "@/lib/paper-storage";
import { toast } from "sonner";
import type { ChatMode } from "@/types/chat";

/**
 * Top-level chat component.
 * If model is loading/unavailable, guards rendering.
 * If visiting /chat with no active session or selected mode, renders ChatModeSelection.
 * If a mode is selected or an existing chatId is loaded, renders ChatSession.
 */
export function ChatInterface() {
    const instance = useLiteRTModelStore((s) => s.liteRTModelInstance);
    const modelStatus = useLiteRTModelStore((s) => s.liteRTModelStatus);

    const params = useParams<{ chatId?: string[] }>();
    const chatId = params.chatId?.[0] ?? null;

    const searchParams = useSearchParams();
    const queryMode = searchParams.get("mode") as ChatMode | null;
    const queryPaperId = searchParams.get("paperId");

    const [modeState, setModeState] = useState<SelectedModePayload | null>(null);

    // Deep-link handling: if URL contains ?mode=paper&paperId=..., load paper and activate
    useEffect(() => {
        if (!chatId && queryMode === "paper" && queryPaperId) {
            let isCancelled = false;
            getPaperById(queryPaperId).then((paper) => {
                if (isCancelled) return;
                if (paper) {
                    setModeState({
                        mode: "paper",
                        paperId: paper.id,
                        paperTitle: paper.metadata.title || paper.fileName,
                    });
                } else {
                    toast.error("Selected paper was not found in library");
                }
            });
            return () => {
                isCancelled = true;
            };
        } else if (!chatId && queryMode === "library") {
            setModeState({ mode: "library" });
        }
    }, [chatId, queryMode, queryPaperId]);

    if (!modelStatus || modelStatus === "idle" || modelStatus === "loading") {
        return <ModelLoadingState />;
    }

    if (modelStatus === "error") {
        return <ModelUnavailableState isError />;
    }

    if (!instance) {
        return <ModelUnavailableState isError={false} />;
    }

    // When starting a new chat (no chatId) and no mode selected, show mode cards
    if (!chatId && !modeState) {
        return <ChatModeSelection onSelectMode={(selected) => setModeState(selected)} />;
    }

    return (
        <ChatSession
            instance={instance}
            chatId={chatId}
            initialChatMode={modeState?.mode}
            initialPaperId={modeState?.paperId}
            initialPaperTitle={modeState?.paperTitle}
            initialPaperIds={modeState?.paperIds}
            initialPaperTitles={modeState?.paperTitles}
            key={chatId ?? modeState?.paperId ?? modeState?.paperIds?.join(",") ?? modeState?.mode ?? "new"}
        />
    );
}
