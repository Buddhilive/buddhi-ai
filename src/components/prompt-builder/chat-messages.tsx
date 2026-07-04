import React from "react";
import { ChatMessage } from "@/lib/inference-worker";
import { cn } from "@/lib/utils";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isGenerating: boolean;
}

export function ChatMessages({ messages, isGenerating }: ChatMessagesProps) {
  // We exclude the system prompt in the hook, so we only render user/assistant
  
  return (
    <div className="flex-1 w-full max-w-4xl mx-auto h-full min-h-0 overflow-hidden relative">
      <MessageScrollerProvider>
        <MessageScroller className="h-full">
          <MessageScrollerViewport className="px-4 py-6">
            <MessageScrollerContent>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-20">
                  <h3 className="text-xl font-medium mb-2 text-foreground">Welcome to Prompt Builder</h3>
                  <p>Type a simple request below, and the AI will expand it into a detailed, professional prompt.</p>
                </div>
              )}
              
              {messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const isLast = idx === messages.length - 1;
                // If it's the last message, it's AI, it's empty, and generating -> show loading
                const isLoading = !isUser && isLast && msg.content === "" && isGenerating;

                return (
                  <MessageScrollerItem 
                    key={idx} 
                    scrollAnchor={isLast} // Anchor to the last message
                    className={cn(
                      "flex w-full",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "px-4 py-3 rounded-2xl max-w-[85%] whitespace-pre-wrap break-words",
                        isUser 
                          ? "bg-primary text-primary-foreground rounded-br-sm" 
                          : "bg-muted text-foreground rounded-bl-sm"
                      )}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2 h-6">
                          <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                          </span>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </MessageScrollerItem>
                );
              })}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton direction="end" />
        </MessageScroller>
      </MessageScrollerProvider>
    </div>
  );
}
