"use client";

import { Engine } from "@litert-lm/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { LiteRTChatTransport } from "@/lib/buddhi-ai-core/chat-api";
import { useLiteRTModelStore } from "@/stores/litert-store";
import { MODELS } from "@/const/models";
import type { GemmaTemplateVersion } from "@/types/messages";
import { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { DEFAULT_SYSTEM_PROMPT } from "@/const/system-prompt";
import { toast } from "sonner";
import { useChatMemory } from "@/hooks/chat/use-chat-memory";
import { useChatActions } from "@/hooks/chat/use-chat-actions";
import { useSkillStore } from "@/stores/skill-store";
import { composeSkillSystemPrompt } from "@/lib/skills/skill-injector";
import { useChatStorage } from "@/hooks/chat/use-chat-storage";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { Spinner } from "@/components/ui/spinner";

export function ChatSession({
  instance,
  chatId,
}: {
  instance: Engine;
  chatId: string | null;
}) {
  const [text, setText] = useState<string>("");
  const [isReasoningOn, setIsReasoningOn] = useState<boolean>(true);

  // Progressive Disclosure Skill Store
  const { corePrompt, domainPrompt, processUserPrompt, loadIndex } = useSkillStore();

  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

  const systemPrompt = useMemo(() => {
    return composeSkillSystemPrompt({
      basePrompt: DEFAULT_SYSTEM_PROMPT,
      coreSkillPrompt: corePrompt,
      domainSkillPrompt: domainPrompt,
    });
  }, [corePrompt, domainPrompt]);

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

  const isSubmitDisabled =
    !text.trim() ||
    status === "streaming" ||
    status === "submitted" ||
    isSummarizing;

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      if (!message.text && !message.files?.length) return;

      if (message.text) {
        await processUserPrompt(message.text);
      }

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
    [sendMessage, supportsVision, processUserPrompt]
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
      <div className="flex flex-col gap-3 h-[calc(100vh-80px)] items-center justify-center">
        <Spinner className="size-8" />
        <span className="text-xs text-muted-foreground animate-pulse">
          {isSummarizing ? "Compacting conversation context..." : "Loading chat session..."}
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden divide-y">
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
      />
    </div>
  );
}

