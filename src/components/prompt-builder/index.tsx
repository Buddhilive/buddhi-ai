"use client";

import { useModelWorker } from "@/hooks/use-model-worker";
import { useInference } from "@/hooks/use-inference";
import { ModelStatusBanner } from "./model-status-banner";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { useEffect } from "react";

export function PromptBuilder() {
  const { status, overallProgress } = useModelWorker();
  const { generate, stopGeneration, messages, isGenerating, error } = useInference();

  // If component unmounts, stop any ongoing generation
  useEffect(() => {
    return () => {
      stopGeneration();
    };
  }, [stopGeneration]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full max-w-5xl mx-auto">
      {status !== "complete" ? (
        <ModelStatusBanner status={status} overallProgress={overallProgress} />
      ) : (
        <>
          <div className="flex-1 min-h-0 relative">
            <ChatMessages messages={messages} isGenerating={isGenerating} />
          </div>
          
          <div className="p-4 bg-background/80 backdrop-blur-sm sticky bottom-0 border-t mt-auto">
            {error && (
              <div className="text-sm text-destructive mb-2 text-center">
                {error}
              </div>
            )}
            <ChatInput onSend={generate} disabled={isGenerating} />
            <div className="text-center mt-2 text-[10px] text-muted-foreground">
              Powered by local Gemma 4 E2B model via Transformers.js
            </div>
          </div>
        </>
      )}
    </div>
  );
}
