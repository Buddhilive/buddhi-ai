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
import { Badge } from "@/components/ui/badge";
import { Library, FileText } from "lucide-react";
import type { ChatMode } from "@/types/chat";

export function ChatSession({
  instance,
  chatId,
  initialChatMode,
  initialPaperId,
  initialPaperTitle,
}: {
  instance: Engine;
  chatId: string | null;
  initialChatMode?: ChatMode;
  initialPaperId?: string | null;
  initialPaperTitle?: string | null;
}) {
  const [chatMode, setChatMode] = useState<ChatMode>(initialChatMode ?? "library");
  const [paperId, setPaperId] = useState<string | null>(initialPaperId ?? null);
  const [paperTitle, setPaperTitle] = useState<string | null>(initialPaperTitle ?? null);
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
    paperId,
  }), [isReasoningOn, systemPrompt, supportsVision, chatId, paperId]);

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
    chatMode,
    paperId,
    paperTitle,
    onChatLoaded: (loaded) => {
      if (loaded.chatMode) setChatMode(loaded.chatMode);
      if (loaded.paperId) setPaperId(loaded.paperId);
      if (loaded.paperTitle) setPaperTitle(loaded.paperTitle);
    },
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
      <div className="h-9 px-4 flex items-center justify-between border-b bg-muted/20 text-xs shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          {chatMode === "paper" ? (
            <>
              <Badge variant="outline" className="gap-1 text-[11px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/40 shrink-0">
                <FileText className="size-3" /> Paper Mode
              </Badge>
              <span className="font-medium text-foreground truncate max-w-md" title={paperTitle ?? undefined}>
                {paperTitle || "Selected Paper"}
              </span>
            </>
          ) : (
            <>
              <Badge variant="outline" className="gap-1 text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300/40 shrink-0">
                <Library className="size-3" /> Library Mode
              </Badge>
              <span className="text-muted-foreground truncate">
                Grounded across all research documents
              </span>
            </>
          )}
        </div>
      </div>

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

