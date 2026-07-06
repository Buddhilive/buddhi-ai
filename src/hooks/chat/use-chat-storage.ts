import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useChatStore } from "@/stores/chat-store";
import {
    createNewChat,
    generateChatTitle,
    loadChat,
    serializeMessagesForStorage,
    updateExistingChat,
} from "@/lib/chat-manager";
import { useMemoryStore } from "@/stores/memory-store";
import {
    countTokensForMessages,
    extractBuddhiMessages,
    SUMMARIZATION_THRESHOLD,
} from "@/lib/memory";
import type { UIMessage } from "ai";
import type { LlmInference } from "@mediapipe/tasks-genai";
import type { GemmaTemplateVersion } from "@/types/messages";

export function useChatStorage({
    chatId,
    instance,
    messages,
    setMessages,
    status,
    systemPrompt,
    templateVersion,
    transport,
    triggerSummarization,
    resetMemory,
}: {
    chatId: string | null;
    instance: LlmInference | null;
    messages: UIMessage[];
    setMessages: (messages: UIMessage[]) => void;
    status: string;
    systemPrompt: string;
    templateVersion: GemmaTemplateVersion;
    transport: any;
    triggerSummarization: (msgs: UIMessage[]) => Promise<void>;
    resetMemory: () => void;
}) {
    const [isLoadingChat, setIsLoadingChat] = useState(!!chatId);
    const currentChatIdRef = useRef<string | null>(chatId);
    const prevStatusRef = useRef<string>("ready");
    
    const setCurrentChatId = useChatStore((s) => s.setCurrentChatId);
    const refreshChats = useChatStore((s) => s.refreshChats);

    // Load existing chat
    useEffect(() => {
        setCurrentChatId(chatId);
        resetMemory();

        if (!chatId) return;

        loadChat(chatId)
            .then(async (chat) => {
                if (chat?.messages?.length) {
                    setMessages(chat.messages);

                    if (instance) {
                        try {
                            const buddhiMsgs = extractBuddhiMessages(
                                chat.messages,
                                systemPrompt,
                                templateVersion
                            );
                            const count = await countTokensForMessages(
                                instance,
                                buddhiMsgs,
                                templateVersion
                            );
                            useMemoryStore.getState().setTokenCount(count);

                            if (count > SUMMARIZATION_THRESHOLD) {
                                console.debug(
                                    `[ChatSession] Loaded chat "${chatId}" exceeds token threshold ` +
                                    `(${count} > ${SUMMARIZATION_THRESHOLD}). Triggering summarization.`
                                );
                                await triggerSummarization(chat.messages);
                            }
                        } catch (err) {
                            console.warn(
                                "[ChatSession] Token count check failed on chat load:",
                                err
                            );
                        }
                    }
                }
            })
            .catch(() => {
                console.error("[ChatSession] Failed to load chat:", chatId);
                toast.error("Could not load chat history.");
            })
            .finally(() => setIsLoadingChat(false));

        return () => setCurrentChatId(null);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Save chat on streaming -> ready transition
    useEffect(() => {
        const wasStreaming = prevStatusRef.current === "streaming";
        prevStatusRef.current = status;

        if (!wasStreaming || status !== "ready" || messages.length === 0) return;

        (async () => {
            try {
                const persistableMessages = await serializeMessagesForStorage(messages);

                if (currentChatIdRef.current) {
                    await updateExistingChat(currentChatIdRef.current, persistableMessages);
                } else {
                    const title = generateChatTitle(persistableMessages);
                    const newId = await createNewChat(persistableMessages, title);
                    currentChatIdRef.current = newId;
                    window.history.replaceState(null, "", `/chat/${newId}`);
                    setCurrentChatId(newId);
                    transport.chatId = newId;
                }
                await refreshChats();
            } catch (error) {
                console.error("[ChatSession] Failed to save chat:", error);
                toast.error("Chat could not be saved.");
            }

            const currentTokenCount = useMemoryStore.getState().tokenCount;
            const alreadySummarized = useMemoryStore.getState().isSummarized;

            if (currentTokenCount > SUMMARIZATION_THRESHOLD && !alreadySummarized) {
                console.debug(
                    `[ChatSession] Token count ${currentTokenCount} exceeds threshold ` +
                    `${SUMMARIZATION_THRESHOLD}. Starting summarization.`
                );
                await triggerSummarization(messages);
            }
        })();
    }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

    return { isLoadingChat, currentChatIdRef };
}
