import { useState, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useChat } from "@ai-sdk/react";
import type { Engine } from "@litert-lm/core";
import { MODELS } from "@/const/models";
import { DEFAULT_SYSTEM_PROMPT, PROMPT_BUILDER_SP } from "@/const/system-prompt";
import { LiteRTChatTransport } from "@/lib/buddhi-ai-core/chat-api";
import { useLiteRTModelStore } from "@/stores/litert-store";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import type { GemmaTemplateVersion } from "@/types/messages";

import { useChatMemory } from "@/hooks/chat/use-chat-memory";
import { useChatActions } from "@/hooks/chat/use-chat-actions";
import { useChatStorage } from "@/hooks/chat/use-chat-storage";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { Spinner } from "@/components/ui/spinner";

export const suggestions = [
    "What are the latest trends in AI?",
    "How does machine learning work?",
    "Explain quantum computing",
    "Best practices for React development",
    "Tell me about TypeScript benefits",
    "How to optimize database queries?",
    "What is the difference between SQL and NoSQL?",
    "Explain cloud computing basics",
];

export const models = [
    {
        chef: "Default",
        chefSlug: "default",
        id: "default",
        name: "Default",
        providers: ["buddhi-ai"],
        template: DEFAULT_SYSTEM_PROMPT
    },
    {
        chef: "Prompt Builder",
        chefSlug: "prompt-builder",
        id: "prompt-builder",
        name: "Prompt Builder",
        providers: ["buddhi-ai"],
        template: PROMPT_BUILDER_SP
    },
];

export function ChatSession({
    instance,
    chatId,
}: {
    instance: Engine;
    chatId: string | null;
}) {
    const [text, setText] = useState<string>("");
    const [isReasoningOn, setIsReasoningOn] = useState<boolean>(false);
    const [open, setOpen] = useState(false);
    const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<string>("default");

    const handleModelSelect = useCallback((id: string) => {
        setSelectedSystemPrompt(id);
        setOpen(false);
    }, []);

    const selectedSystemPromptData = models.find((model) => model.id === selectedSystemPrompt);
    const chefs = [...new Set(models.map((model) => model.chef))];
    const systemPrompt = selectedSystemPromptData?.template || DEFAULT_SYSTEM_PROMPT;
    const loadedModelId = useLiteRTModelStore((s) => s.liteRTModelModel);
    const activeModel = MODELS.find((m) => m.id === loadedModelId);
    const templateVersion: GemmaTemplateVersion = activeModel?.chatTemplateVersion ?? "gemma4";
    const supportsVision: boolean = activeModel?.supportsVision ?? false;

    const currentChatIdRef = useRef<string | null>(chatId);

    const getOptions = useCallback(() => ({
        isReasoningOn,
        systemPrompt,
        supportsVision,
        chatId: currentChatIdRef.current ?? chatId,
    }), [isReasoningOn, systemPrompt, supportsVision, chatId]);

    const transport = useMemo(
        () => new LiteRTChatTransport(instance, getOptions, templateVersion),
        [instance, getOptions, templateVersion]
    );

    const { messages, setMessages, sendMessage, stop, status } = useChat({
        transport,
    });

    const {
        tokenCount,
        isSummarizing,
        resetMemory,
        triggerSummarization,
    } = useChatMemory({ instance, systemPrompt, templateVersion, currentChatIdRef });
    
    const { isLoadingChat } = useChatStorage({
        chatId,
        instance,
        messages,
        setMessages,
        status,
        systemPrompt,
        templateVersion,
        triggerSummarization,
        resetMemory,
    });

    const {
        editingMessageId,
        editText,
        copiedMessageId,
        setEditText,
        handleCopy,
        handleRegenerate,
        handleEditStart,
        handleEditCancel,
        handleEditDone,
    } = useChatActions({
        messages,
        setMessages,
        sendMessage,
        currentChatIdRef,
    });

    const isSubmitDisabled = !text.trim() || status === "streaming" || status === "submitted" || isSummarizing;

    const handleSubmit = useCallback(
        async (message: PromptInputMessage) => {
            if (!message.text && !message.files?.length) return;

            if (message.files?.length) {
                const videoFiles = message.files.filter((f) => (f.mediaType ?? "").startsWith("video/"));
                const unsupportedMime = message.files.filter((f) => {
                    const m = f.mediaType ?? "";
                    return !m.startsWith("image/") && !m.startsWith("audio/") && !m.startsWith("video/");
                });
                const visionFiles = message.files.filter((f) => {
                    const m = f.mediaType ?? "";
                    return m.startsWith("image/") || m.startsWith("audio/");
                });

                if (videoFiles.length > 0) {
                    toast.warning("Video files are not supported", {
                        description: "The on-device AI model cannot process video. Only images and audio are sent to the model.",
                    });
                } else if (unsupportedMime.length > 0) {
                    toast.warning("Some attachments may not be processed", {
                        description: `Files of type "${unsupportedMime.map((f) => f.mediaType ?? "unknown").join(", ")}" cannot be understood by the model.`,
                    });
                } else if (!supportsVision && visionFiles.length > 0) {
                    toast.info("Image analysis not available", {
                        description: "The currently loaded model does not support images or audio. Your message will be answered as text only.",
                    });
                }
            }

            sendMessage({ text: message.text || "", files: message.files });
            setText("");
        },
        [sendMessage, supportsVision]
    );

    const handleTranscriptionChange = useCallback((transcript: string) => {
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }, []);

    const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(event.target.value);
    }, []);

    const toggleReasoning = useCallback(() => {
        setIsReasoningOn((prev) => !prev);
    }, []);

    if (isLoadingChat) {
        return (
            <div className="flex h-[calc(100vh-80px)] items-center justify-center">
                <Spinner className="size-8" />
            </div>
        );
    }

    return (
        <div className="relative flex h-[calc(100vh-80px)] flex-col divide-y overflow-hidden">
            <ChatMessages
                messages={messages}
                status={status}
                isSummarizing={isSummarizing}
                editingMessageId={editingMessageId}
                editText={editText}
                setEditText={setEditText}
                handleEditCancel={handleEditCancel}
                handleEditDone={handleEditDone}
                handleEditStart={handleEditStart}
                handleCopy={handleCopy}
                copiedMessageId={copiedMessageId}
                handleRegenerate={handleRegenerate}
                sendMessage={sendMessage}
            />
            <ChatInput
                text={text}
                handleTextChange={handleTextChange}
                handleSubmit={handleSubmit}
                isSubmitDisabled={isSubmitDisabled}
                stop={stop}
                status={status}
                isReasoningOn={isReasoningOn}
                toggleReasoning={toggleReasoning}
                handleTranscriptionChange={handleTranscriptionChange}
                tokenCount={tokenCount}
                selectedSystemPromptData={selectedSystemPromptData}
                setOpen={setOpen}
                open={open}
                chefs={chefs}
                models={models}
                handleModelSelect={handleModelSelect}
                selectedSystemPrompt={selectedSystemPrompt}
            />
        </div>
    );
}
