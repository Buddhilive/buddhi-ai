"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Fragment, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  MessageActions,
  MessageAction,
  MessageResponse,
} from "@/components/ai-elements/message";
import { CopyIcon, GlobeIcon, RefreshCcwIcon } from "lucide-react";
/* import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning"; */
import { Loader } from "@/components/ai-elements/loader";
import {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from "@mlc-ai/web-llm";
import { useWebLLM } from "@/hooks/use-webllm";

const models = [
  {
    name: "Gemini 2.5 Flash Lite",
    value: "gemini-2.5-flash-lite",
  },
  {
    name: "Gemini 2.5 Pro",
    value: "gemini-2.5-pro",
  },
];

export default function BuddhiAIChat() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  /* const { messages, sendMessage, status, regenerate } = useChat(); */
  const [messages, setMessages] = useState<Array<ChatCompletionMessageParam>>(
    []
  );
  const [chunks, setChunks] = useState<AsyncIterable<ChatCompletionChunk>>();
  const { webLLMState } = useWebLLM();

  useEffect(() => {
    const processChunks = async () => {
      if (!chunks) return;
      for await (const chunk of chunks) {
        console.log("Chunk received:", chunk);
        if (chunk.choices && chunk.choices.length > 0) {
          const delta = chunk.choices[0].delta;
          if (delta.content) {
            setMessages((prevMessages) => {
              const lastMessage = prevMessages[prevMessages.length - 1];
              if (lastMessage && lastMessage.role === "assistant") {
                const updatedMessage: ChatCompletionMessageParam = {
                  ...lastMessage,
                  content: (lastMessage.content || "") + delta.content,
                };
                return [...prevMessages.slice(0, -1), updatedMessage];
              } else {
                const newMessage: ChatCompletionMessageParam = {
                  role: "assistant" as const,
                  content: delta.content,
                };
                return [...prevMessages, newMessage];
              }
            });
          }
        }
      }
    };

    processChunks();
  }, [chunks]);

  const sendMessage = async (prompt: string) => {
    if (!webLLMState.engine) {
      console.error("WebLLM engine is not initialized.");
      return;
    }
    const systemPrompt: ChatCompletionMessageParam = {
      role: "system",
      content: `You are a helpful assistant`,
    };
    const userPrompt: ChatCompletionMessageParam = {
      role: "user",
      content: prompt,
    };

    const promptMessages = [systemPrompt, ...messages, userPrompt];

    setMessages((prevMessages) => [
      ...prevMessages,
      userPrompt,
    ]);

    const parts = await webLLMState.engine.chat.completions.create({
      messages: promptMessages,
      stream: true,
    });
    console.log("Parts received from WebLLM:", parts);
    setChunks(parts);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = (message: any) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(message.text);
    setInput("");
  };

  return (
    <div className="mx-auto max-w-4xl px-6 pb-6 relative size-full h-[calc(100vh-4rem)] no-scrollbar">
      <div className="flex flex-col h-full">
        <Conversation className="h-[calc(100vh-4rem)]">
          <ConversationContent>
            {messages.map((message, index) => (
              <div key={index}>
                {/* {message.role === "assistant" &&
                  message.parts.filter((part) => part.type === "source-url")
                    .length > 0 && (
                    <Sources>
                      <SourcesTrigger
                        count={
                          message.parts.filter(
                            (part) => part.type === "source-url"
                          ).length
                        }
                      />
                      {message.parts
                        .filter((part) => part.type === "source-url")
                        .map((part, i) => (
                          <SourcesContent key={`${message.id}-${i}`}>
                            <Source
                              key={`${message.id}-${i}`}
                              href={part.url}
                              title={part.url}
                            />
                          </SourcesContent>
                        ))}
                    </Sources>
                  )} */}
                <Fragment key={`${index}`}>
                  <Message from={message.role}>
                    <MessageContent>
                      <MessageResponse>
                        {message.content as string}
                      </MessageResponse>
                    </MessageContent>
                  </Message>
                  {message.role === "assistant" &&
                    index === messages.length - 1 && (
                      <MessageActions className="mt-2">
                        {/* <MessageAction
                                  onClick={() => regenerate()}
                                  label="Retry"
                                >
                                  <RefreshCcwIcon className="size-3" />
                                </MessageAction> */}
                        <MessageAction
                          onClick={() =>
                            navigator.clipboard.writeText(
                              message.content as string
                            )
                          }
                          label="Copy"
                        >
                          <CopyIcon className="size-3" />
                        </MessageAction>
                      </MessageActions>
                    )}
                </Fragment>
              </div>
            ))}
            {status === "submitted" && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput
          onSubmit={handleSubmit}
          className="mt-4"
          globalDrop
          multiple
        >
          <PromptInputHeader>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputButton
                variant={webSearch ? "default" : "ghost"}
                onClick={() => setWebSearch(!webSearch)}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
              <PromptInputSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {models.map((model) => (
                    <PromptInputSelectItem
                      key={model.value}
                      value={model.value}
                    >
                      {model.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
