"use client";

import React from "react";
import { Brain, Sparkles, CheckCircle2 } from "lucide-react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import {
  Context,
  ContextContent,
  ContextContentHeader,
  ContextTrigger,
} from "@/components/ai-elements/context";
import type { ChatStatus } from "ai";
import { PromptInputAttachmentsDisplay } from "./chat-attachments";
import { useSettingsStore } from "@/stores/settings-store";
import { useMemoryStore } from "@/stores/memory-store";

interface ChatInputProps {
  text: string;
  handleTextChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (message: PromptInputMessage) => Promise<void>;
  isSubmitDisabled: boolean;
  stop: () => void;
  status: ChatStatus;
  isReasoningOn: boolean;
  toggleReasoning: () => void;
  handleTranscriptionChange: (transcript: string) => void;
  tokenCount: number;
}

export function ChatInput({
  text,
  handleTextChange,
  handleSubmit,
  isSubmitDisabled,
  stop,
  status,
  isReasoningOn,
  toggleReasoning,
  handleTranscriptionChange,
  tokenCount,
}: ChatInputProps) {
  const maxContextTokens = useSettingsStore((s) => s.maxContextTokens);
  const isSummarizing = useMemoryStore((s) => s.isSummarizing);
  const isSummarized = useMemoryStore((s) => s.isSummarized);
  const tokensSaved = useMemoryStore((s) => s.tokensSaved);
  const compactionStrategy = useMemoryStore((s) => s.compactionStrategy);

  return (
    <div className="grid shrink-0 gap-3 pt-4">
      <div className="w-full px-4 pb-4">
        <PromptInput globalDrop multiple onSubmit={handleSubmit}>
          <PromptInputHeader>
            <PromptInputAttachmentsDisplay />
          </PromptInputHeader>

          <PromptInputBody>
            <PromptInputTextarea
              onChange={handleTextChange}
              value={text}
              placeholder="Ask a research question, summarize a paper, or draft content..."
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <SpeechInput
                className="shrink-0"
                onTranscriptionChange={handleTranscriptionChange}
                size="icon-sm"
                variant="ghost"
              />
              <PromptInputButton
                onClick={toggleReasoning}
                variant={isReasoningOn ? "default" : "ghost"}
                className={isReasoningOn ? "bg-primary text-primary-foreground font-medium" : ""}
              >
                <Brain size={16} />
                <span>Reasoning</span>
              </PromptInputButton>
            </PromptInputTools>

            <div className="flex items-center gap-1">
              <Context
                usedTokens={tokenCount}
                maxTokens={maxContextTokens || 4096}
              >
                <ContextTrigger size="sm" />
                <ContextContent>
                  <ContextContentHeader />
                  {isSummarizing && (
                    <div className="px-3 py-2 bg-primary/10 text-primary text-xs flex items-center gap-2 border-t">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Compacting chat context...</span>
                    </div>
                  )}
                  {!isSummarizing && isSummarized && tokensSaved > 0 && (
                    <div className="px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between border-t">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Compacted {compactionStrategy === "rlm-recursive" ? "(RLM)" : "(LiteRT)"}</span>
                      </div>
                      <span className="font-mono font-medium">Saved ~{tokensSaved} tokens</span>
                    </div>
                  )}
                </ContextContent>
              </Context>

              <PromptInputSubmit
                disabled={isSubmitDisabled}
                onStop={stop}
                status={status}
              />
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
      <span className="text-xs text-muted-foreground text-center">Buddhi AI helps you read, write, and analyze academic research papers.</span>
    </div>
  );
}
