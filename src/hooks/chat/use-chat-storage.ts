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
import { useSettingsStore } from "@/stores/settings-store";
import {
    applyMemoryContext,
    countTokensForMessages,
    extractBuddhiMessages,
    getCompactionThreshold,
    getMemoryContext,
} from "@/lib/memory";
import type { UIMessage } from "ai";
import type { Engine } from "@litert-lm/core";
import type { GemmaTemplateVersion } from "@/types/messages";

export function useChatStorage({
    chatId,
    instance,
    messages,
    setMessages,
    status,
    systemPrompt,
    templateVersion,
    triggerSummarization,
    resetMemory,
}: {
    chatId: string | null;
    instance: Engine | null;
    messages: UIMessage[];
    setMessages: (messages: UIMessage[]) => void;
    status: string;
    systemPrompt: string;
    templateVersion: GemmaTemplateVersion;
    triggerSummarization: (msgs: UIMessage[]) => Promise<void>;
    resetMemory: () => void;
}) {
    const [isLoadingChat, setIsLoadingChat] = useState(!!chatId);
    const currentChatIdRef = useRef<string | null>(chatId);
    const prevStatusRef = useRef<string>("ready");
    
    const setCurrentChatId = useChatStore((s) => s.setCurrentChatId);
    const refreshChats = useChatStore((s) => s.refreshChats);

    // Load existing chat & perform initial compaction before releasing loading state
    useEffect(() => {
        setCurrentChatId(chatId);
        resetMemory();

        if (!chatId) return;

        let isCancelled = false;

        (async () => {
            setIsLoadingChat(true);
            try {
                const chat = await loadChat(chatId);
                if (isCancelled) return;

                if (chat?.messages?.length) {
                    setMessages(chat.messages);

                    // Restore any existing memory context from sessionStorage
                    const existingCtx = getMemoryContext(chatId);
                    if (existingCtx) {
                        useMemoryStore.getState().setCompactionSavings(
                            existingCtx.tokensSaved || 0,
                            existingCtx.strategy || "litert-standard"
                        );
                        useMemoryStore.getState().setIsSummarized(true);
                    }

                    if (instance) {
                        try {
                            const buddhiMsgs = extractBuddhiMessages(
                                chat.messages,
                                systemPrompt,
                                templateVersion
                            );
                            const effectiveMsgs = applyMemoryContext(buddhiMsgs, chatId);
                            let count = await countTokensForMessages(
                                instance,
                                effectiveMsgs
                            );
                            useMemoryStore.getState().setTokenCount(count);

                            const maxLimit = useSettingsStore.getState().maxContextTokens;
                            const threshold = getCompactionThreshold(maxLimit);

                            // If chat history reaches threshold and has not yet been compacted,
                            // run compaction BEFORE declaring the chat ready for continuation
                            if (count >= threshold && !existingCtx) {
                                console.debug(
                                    `[ChatSession] Loaded chat "${chatId}" has heavy history ` +
                                    `(${count} >= ${threshold} [80% of ${maxLimit}]). Running initial compaction...`
                                );
                                await triggerSummarization(chat.messages);

                                if (!isCancelled) {
                                    // Recount tokens with newly compacted buffer
                                    const postCompactionMsgs = applyMemoryContext(buddhiMsgs, chatId);
                                    count = await countTokensForMessages(instance, postCompactionMsgs);
                                    useMemoryStore.getState().setTokenCount(count);
                                }
                            }
                        } catch (err) {
                            console.warn(
                                "[ChatSession] Token count check failed on chat load:",
                                err
                            );
                        }
                    }
                }
            } catch (err) {
                if (!isCancelled) {
                    console.error("[ChatSession] Failed to load chat:", chatId, err);
                    toast.error("Could not load chat history.");
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingChat(false);
                }
            }
        })();

        return () => {
            isCancelled = true;
            setCurrentChatId(null);
        };
    }, [chatId, instance, systemPrompt, templateVersion]); // eslint-disable-line react-hooks/exhaustive-deps

    // Save chat on streaming -> ready transition and recount tokens
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
                }
                await refreshChats();
            } catch (error) {
                console.error("[ChatSession] Failed to save chat:", error);
                toast.error("Chat could not be saved.");
            }

            // Recalculate prompt tokens for the completed conversation
            if (instance) {
                try {
                    const buddhiMsgs = extractBuddhiMessages(messages, systemPrompt, templateVersion);
                    const activeChatId = currentChatIdRef.current || "";
                    const effectiveMsgs = applyMemoryContext(buddhiMsgs, activeChatId);
                    const count = await countTokensForMessages(instance, effectiveMsgs);
                    useMemoryStore.getState().setTokenCount(count);

                    const maxLimit = useSettingsStore.getState().maxContextTokens;
                    const threshold = getCompactionThreshold(maxLimit);
                    const alreadySummarized = useMemoryStore.getState().isSummarized;

                    if (count >= threshold && !alreadySummarized) {
                        console.debug(
                            `[ChatSession] Post-generation token count ${count} reaches compaction threshold ` +
                            `${threshold} (80% of ${maxLimit}). Starting automatic compaction.`
                        );
                        await triggerSummarization(messages);
                    }
                } catch (err) {
                    console.warn("[ChatSession] Token recalculation failed after stream:", err);
                }
            }
        })();
    }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

    return { isLoadingChat, currentChatIdRef };
}
