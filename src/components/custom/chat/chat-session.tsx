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
import { Library, FileText, GitFork, ChevronDown, BookOpen, Wand2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GAP_ANALYSIS_SYSTEM_PROMPT } from "@/const/system-prompt";
import type { ChatMode } from "@/types/chat";
import { useSettingsStore } from "@/stores/settings-store";

export function ChatSession({
  instance,
  chatId,
  initialChatMode,
  initialPaperId,
  initialPaperTitle,
  initialPaperIds,
  initialPaperTitles,
}: {
  instance: Engine;
  chatId: string | null;
  initialChatMode?: ChatMode;
  initialPaperId?: string | null;
  initialPaperTitle?: string | null;
  initialPaperIds?: string[] | null;
  initialPaperTitles?: string[] | null;
}) {
  const [chatMode, setChatMode] = useState<ChatMode>(initialChatMode ?? "library");
  const [paperId, setPaperId] = useState<string | null>(initialPaperId ?? null);
  const [paperTitle, setPaperTitle] = useState<string | null>(initialPaperTitle ?? null);
  const [paperIds, setPaperIds] = useState<string[] | null>(initialPaperIds ?? null);
  const [paperTitles, setPaperTitles] = useState<string[] | null>(initialPaperTitles ?? null);
  const [text, setText] = useState<string>("");
  const [isReasoningOn, setIsReasoningOn] = useState<boolean>(true);
  const [isHumanizerBypassed, setIsHumanizerBypassed] = useState<boolean>(false);
  const humanizer = useSettingsStore((s) => s.humanizer);

  // Progressive Disclosure Skill Store
  const { corePrompt, domainPrompt, processUserPrompt, loadIndex } = useSkillStore();

  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

  const basePrompt = useMemo(() => {
    if (chatMode === "gap-analysis") {
      return GAP_ANALYSIS_SYSTEM_PROMPT;
    }
    return DEFAULT_SYSTEM_PROMPT;
  }, [chatMode]);

  const systemPrompt = useMemo(() => {
    return composeSkillSystemPrompt({
      basePrompt,
      coreSkillPrompt: corePrompt,
      domainSkillPrompt: domainPrompt,
    });
  }, [basePrompt, corePrompt, domainPrompt]);

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
    paperIds,
    isHumanizerBypassed,
  }), [isReasoningOn, systemPrompt, supportsVision, chatId, paperId, paperIds, isHumanizerBypassed]);

  const toggleHumanizerBypass = useCallback(() => {
    setIsHumanizerBypassed((prev) => !prev);
  }, []);

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
    paperIds,
    paperTitles,
    onChatLoaded: (loaded) => {
      if (loaded.chatMode) setChatMode(loaded.chatMode);
      if (loaded.paperId) setPaperId(loaded.paperId);
      if (loaded.paperTitle) setPaperTitle(loaded.paperTitle);
      if (loaded.paperIds) setPaperIds(loaded.paperIds);
      if (loaded.paperTitles) setPaperTitles(loaded.paperTitles);
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
          {chatMode === "gap-analysis" ? (
            <>
              <Badge variant="outline" className="gap-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40 shrink-0">
                <GitFork className="size-3" /> Gap Analysis Mode
              </Badge>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-muted font-medium text-foreground transition-colors cursor-pointer text-xs">
                    <span>{paperIds?.length ?? 0} {paperIds?.length === 1 ? "Paper" : "Papers"} Selected</span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 p-3 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <BookOpen className="size-3.5 text-emerald-600" />
                      Grounded Papers ({paperIds?.length ?? 0})
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {paperTitles && paperTitles.length > 0 ? (
                      paperTitles.map((title, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-1.5 rounded-md bg-muted/30 text-xs">
                          <span className="font-mono text-[10px] text-muted-foreground mt-0.5 shrink-0 size-4 rounded bg-muted flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="truncate flex-1 font-medium" title={title}>
                            {title}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No paper titles loaded.</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </>
          ) : chatMode === "paper" ? (
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

        {humanizer.enabled && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleHumanizerBypass}
              title={!isHumanizerBypassed ? "LLM Humanizer active for this chat (click to bypass)" : "LLM Humanizer bypassed for this chat (click to enable)"}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors border cursor-pointer ${
                !isHumanizerBypassed
                  ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/40 hover:bg-purple-500/20"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted line-through"
              }`}
            >
              <Wand2 className="size-3" />
              <span>Humanizer {!isHumanizerBypassed ? `(${humanizer.preset})` : "Bypassed"}</span>
            </button>
          </div>
        )}
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
        chatMode={chatMode}
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
        isHumanizerBypassed={isHumanizerBypassed}
        toggleHumanizerBypass={toggleHumanizerBypass}
      />
    </div>
  );
}

