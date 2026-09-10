"use client";

import React from "react";
import { Brain } from "lucide-react";
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
import { PromptInputAttachmentsDisplay } from "./chat-attachments";
import { MAX_CONTEXT_TOKENS } from "@/lib/memory";

interface ChatInputProps {
  text: string;
  handleTextChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (message: PromptInputMessage) => Promise<void>;
  isSubmitDisabled: boolean;
  stop: () => void;
  status: any;
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
              placeholder="Describe the Next.js app you want to build (e.g. 'Build a modern personal portfolio with contact form and dark mode')..."
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
              {tokenCount > 0 && (
                <Context
                  usedTokens={tokenCount}
                  maxTokens={MAX_CONTEXT_TOKENS}
                >
                  <ContextTrigger size="sm" />
                  <ContextContent>
                    <ContextContentHeader />
                  </ContextContent>
                </Context>
              )}

              <PromptInputSubmit
                disabled={isSubmitDisabled}
                onStop={stop}
                status={status}
              />
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
      <span className="text-xs text-muted-foreground text-center">Buddhi Vibe develops and runs Next.js apps client-side.</span>
    </div>
  );
}
