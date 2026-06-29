import { useMemoryStore } from "@/stores/memory-store";
import { runSummarization } from "@/lib/memory";
import type { LlmInference } from "@mediapipe/tasks-genai";
import type { GemmaTemplateVersion } from "@/types/messages";
import { toast } from "sonner";
import type { UIMessage } from "ai";

export function useChatMemory({
    instance,
    systemPrompt,
    templateVersion,
    currentChatIdRef,
    transport,
}: {
    instance: LlmInference | null;
    systemPrompt: string;
    templateVersion: GemmaTemplateVersion;
    currentChatIdRef: React.MutableRefObject<string | null>;
    transport: any; // MediaPipeChatTransport
}) {
    const tokenCount = useMemoryStore((s) => s.tokenCount);
    const isSummarizing = useMemoryStore((s) => s.isSummarizing);
    const isSummarized = useMemoryStore((s) => s.isSummarized);
    const setIsSummarizing = useMemoryStore((s) => s.setIsSummarizing);
    const setIsSummarized = useMemoryStore((s) => s.setIsSummarized);
    const resetMemory = useMemoryStore((s) => s.reset);

    async function triggerSummarization(uiMessages: UIMessage[]) {
        if (!instance) return;
        const chatId = currentChatIdRef.current;
        if (!chatId) {
            console.debug("[ChatSession] Skipping summarization — no chatId yet.");
            return;
        }
        if (useMemoryStore.getState().isSummarizing) {
            console.debug("[ChatSession] Summarization already in progress, skipping.");
            return;
        }

        setIsSummarizing(true);
        try {
            await runSummarization(
                instance,
                uiMessages,
                systemPrompt,
                chatId,
                templateVersion
            );
            setIsSummarized(true);
            // Update the transport's chatId in case it was set during load.
            transport.chatId = chatId;
        } catch (err) {
            console.error("[ChatSession] Summarization failed:", err);
            toast.error(
                "Memory summarization failed — full history will be used. " +
                "Check console for details."
            );
        } finally {
            setIsSummarizing(false);
        }
    }

    return {
        tokenCount,
        isSummarizing,
        isSummarized,
        setIsSummarizing,
        setIsSummarized,
        resetMemory,
        triggerSummarization,
    };
}
