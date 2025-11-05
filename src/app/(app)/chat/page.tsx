"use client";
import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chatStore";
import { chatApi } from "@/lib/api";
import { Message } from "@/types/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const {
    messages,
    isLoading,
    error,
    inputValue,
    setInputValue,
    addMessage,
    setIsLoading,
    setError,
  } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === "") return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: "user",
      timestamp: new Date(),
    };

    addMessage(userMessage);
    getAIResponse(inputValue);
    setInputValue("");
    setIsLoading(true);
    setError(null); // Clear any previous errors
  };

  const getAIResponse = async (userMessage: string) => {
    try {
      const apiMessages = [
        ...messages
          .filter((msg) => msg.content !== null) // Filter out messages with null content
          .map((msg) => ({
            role: msg.role as LanguageModelMessageRole,
            content: msg.content,
          })),
      ];

      // Call the API
      const response = await chatApi.getCompletion({
        initialMessages: apiMessages,
        prompt: userMessage,
      });

      // Extract the assistant's response
      if (response.message) {
        const assistantMessageContent = response.message;

        if (assistantMessageContent) {
          const aiMessage: Message = {
            id: `ai-${Date.now()}`,
            content: assistantMessageContent,
            role: "assistant",
            timestamp: new Date(),
          };

          addMessage(aiMessage);
        } else {
          throw new Error("Received empty response from AI model");
        }
      } else {
        throw new Error("No choices returned from AI model");
      }
    } catch (err) {
      console.error("Error getting AI response:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while getting response";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRetry = () => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === "user");
    if (lastUserMessage) {
      getAIResponse(lastUserMessage.content);
      setIsLoading(true);
      setError(null);
    } else {
      setError("No previous user message to retry.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] overflow-hidden">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex-grow">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-secondary text-secondary-foreground rounded-bl-none"
              }`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              <div
                className={`text-xs mt-1 ${
                  message.role === "user"
                    ? "text-primary-foreground/70"
                    : "text-secondary-foreground/70"
                }`}
              >
                {message.timestamp &&
                  message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary text-secondary-foreground rounded-xl rounded-bl-none px-4 py-2 max-w-[80%]">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-secondary-foreground/70 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-secondary-foreground/70 animate-bounce delay-75"></div>
                <div className="w-2 h-2 rounded-full bg-secondary-foreground/70 animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-start">
            <div className="bg-destructive text-destructive-foreground rounded-xl px-4 py-2 max-w-[80%]">
              <div className="text-sm">Error: {error}</div>
              <Button
                variant={"outline"}
                size={"sm"}
                onClick={handleRetry}
                className="mt-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          </div>
        )}
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area - Fixed to bottom */}
      <div className="border-t border-border p-4 bg-background">
        <div className="flex space-x-2 justify-center items-center">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 border border-input rounded-xl bg-background px-4 py-2 text-sm min-h-[60px] max-h-32 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || inputValue.trim() === ""}
            className="bg-primary text-primary-foreground rounded-xl h-[46px] w-[46px] flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Buddhi AI can make mistakes, so double-check it.
        </div>
      </div>
    </div>
  );
}
