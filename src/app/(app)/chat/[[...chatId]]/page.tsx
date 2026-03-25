"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
} from "@/components/ai-elements/message";
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
  /* PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue, */
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Fragment, useEffect, useState } from "react";
import {
  MessageActions,
  MessageAction,
  MessageResponse,
} from "@/components/ai-elements/message";
import { BrainCircuitIcon, CopyIcon, FilePlus2, RefreshCcwIcon } from "lucide-react";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
/* import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning"; */
import { Loader } from "@/components/ai-elements/loader";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BuddhiAISavedChat,
  initChatManager,
  saveOrUpdateChatMessages,
} from "@/lib/chat-manager";
import { closeDatabase, getAllFromStore, getItemByKey } from "@/lib/indexeddb";
import { toast } from "sonner";
import { SYSTEM_PROMPT } from "@/const/system-prompt";
import { useChatStore } from "@/stores/chatStore";
import { useWebLLMStore } from "@/stores/mediaPipeStore";
import {
  BuddhiAIChatTemplate,
  BuddhiAIMessage,
  generateChatTemplate,
} from "@/lib/chat-template-generator";
import { FileUIPart } from "ai";
import { MetadataMode } from "llamaindex";
import {
  chunkText,
  createVectorIndex,
  retrieveSegments,
  hasDocuments,
} from "@/lib/llamaindex-provider";
import DocumentManager from "@/components/custom/document-manager";

/* const models = [
  {
    name: "Llama 3.2 1B Instruct",
    value: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
  },
  {
    name: "Qwen 3 0.6B",
    value: "Qwen3-0.6B-q4f32_1-MLC",
  },
]; */

export default function BuddhiAIChat() {
  const [input, setInput] = useState("");
  /* const [model, setModel] = useState<string>(models[0].value); */
  const [sourceFiles, setSourceFiles] = useState([]);
  const { webLLMInstance } = useWebLLMStore();
  const [messages, setMessages] = useState<Array<BuddhiAIMessage>>([]);
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");
  const params = useParams();
  const [chatDB, setChatDB] = useState<IDBDatabase | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const {
    setChatHistory,
    setChatDB: setChatDBInStore,
    setCurrentChat,
    currentChat,
  } = useChatStore();
  const router = useRouter();

  /* On load */
  useEffect(() => {
    initChat();
    /* // console.log("Chat page loaded with params:", params, params.chatId); */
    return () => {
      closeDatabase(chatDB!);
    };
  }, []);

  const initChat = async () => {
    try {
      const idb = await initChatManager();
      if (idb) {
        setChatDB(idb);
        setChatDBInStore(idb);
        const chatHistory = await getAllFromStore<BuddhiAISavedChat>(
          idb,
          "chats"
        );
        setChatHistory(chatHistory);
      }
      if (params.chatId) setChatId(params.chatId[0]);

      if (idb && params.chatId) {
        const oldChatMessages = await getItemByKey<BuddhiAISavedChat>(
          idb,
          "chats",
          params.chatId[0]
        );
        /* // console.log("Loaded old chat messages:", oldChatMessages); */
        setCurrentChat(oldChatMessages);
        setMessages(oldChatMessages.messages);
      } else {
        setMessages([]);
      }
      setInput("");
      setStatus("ready");
    } catch (error) {
      console.error("Error initializing chat:", error);
      toast.error("Error initializing chat.");
      router.push("/chat");
    }
  };

  const handleChatCreated = async (newChatId: string) => {
    try {
      // Set the new chatId
      setChatId(newChatId);

      // Create and save the new chat session
      const title = `Document Chat ${newChatId}`;
      if (chatDB) {
        await saveOrUpdateChatMessages(chatDB, newChatId, [], title, true);
      }

      // Navigate to the new chat URL
      router.push(`/chat/${newChatId}`);

      toast.success("Chat session created!");
    } catch (error) {
      console.error("Error creating chat session:", error);
      toast.error("Error creating chat session.");
    }
  };

  const saveChatMessages = async () => {
    try {
      if (!chatId && messages.length > 0) {
        const newChatId = Date.now().toString();
        setChatId(newChatId);
        let msg = messages.findLast((msg) => msg.role === "user")?.content;
        if (typeof msg === "object" && Array.isArray(msg)) {
          msg = msg
            .map((contentItem) => {
              if (contentItem.type === "text" && contentItem.text) {
                return contentItem.text;
              } else {
                return "";
              }
            })
            .join("\n");
        }
        const titleSummary = msg
          ? msg.toString().substring(0, 20) +
            (msg.toString().length > 20 ? "..." : "")
          : null;

        const title = titleSummary || `Chat ${newChatId}`;
        saveOrUpdateChatMessages(chatDB!, newChatId, messages, title, true);
        router.push(`/chat/${newChatId}`);
      }
      if (chatDB && chatId) {
        saveOrUpdateChatMessages(
          chatDB,
          chatId,
          messages,
          currentChat?.title ?? `Chat ${chatId}`
        );
      }
    } catch (error) {
      console.error("Error saving chat messages:", error);
      toast.error("Error saving chat messages.");
    }
  };

  /* Save messages */
  useEffect(() => {
    if (status === "ready") {
      saveChatMessages();
    }
  }, [messages, status]);

  const sendMessage = async (
    prompt: string,
    files?: BuddhiAIChatTemplate[]
  ) => {
    setStatus("submitted");
    if (!webLLMInstance) {
      console.error("WebLLM engine is not initialized.");
      setStatus("error");
      toast.error("WebLLM engine is not initialized.");
      return;
    }
    const systemPrompt: BuddhiAIMessage = SYSTEM_PROMPT;

    // RAG: Check if documents exist for this chat
    let ragContext = "";
    const sources: BuddhiAIChatTemplate[] = [];
    let useRAG = false;

    if (chatId) {
      try {
        const docsExist = await hasDocuments(chatId);
        if (docsExist) {
          // console.log("Documents found, performing RAG retrieval...");
          const retrievedSegments = await retrieveSegments(chatId, prompt, 3);

          if (retrievedSegments.length > 0) {
            // Check confidence scores
            const maxScore = Math.max(
              ...retrievedSegments.map((seg) => seg.node.score || 0)
            );

            if (maxScore < 0.3) {
              // Very low confidence - respond with "don't know"
              ragContext =
                "\n\nIMPORTANT: The retrieved information has very low relevance (confidence < 0.3). You should respond: 'I don't know based on the provided documents.'";
            } else if (maxScore < 0.5) {
              // Low confidence - add warning
              ragContext = "\n\nContext from documents:\n";
              retrievedSegments.forEach((seg, idx) => {
                ragContext += `\n[Document: ${
                  seg.fileName
                }]\n${seg.node.node.getContent(MetadataMode.NONE)}\n`;
                sources.push({
                  type: "text",
                  source: seg.fileName,
                  documentId: seg.documentId,
                  chunkId: seg.node.node.id_,
                  score: seg.node.score,
                });
              });
              ragContext +=
                "\n\nIMPORTANT: The retrieved information has low confidence (0.3-0.5). Mention in your response: 'I have low confidence in this answer based on the available documents.'";
            } else {
              // Good confidence - normal RAG
              ragContext = "\n\nContext from documents:\n";
              retrievedSegments.forEach((seg, idx) => {
                ragContext += `\n[Document: ${
                  seg.fileName
                }]\n${seg.node.node.getContent(MetadataMode.NONE)}\n`;
                sources.push({
                  type: "text",
                  source: seg.fileName,
                  documentId: seg.documentId,
                  chunkId: seg.node.node.id_,
                  score: seg.node.score,
                });
              });
              ragContext +=
                "\n\nInstructions: Answer the user's question based on the context above from the documents. Be specific and cite information from the context.";
            }

            useRAG = true;
          }
        }
      } catch (error) {
        console.error("Error during RAG retrieval:", error);
        // Continue with normal chat if RAG fails
      }
    }

    // Create user message for display (without RAG context)
    const userPrompt: BuddhiAIMessage = {
      role: "user",
      content: [
        ...(files && files.length > 0 ? files : []),
        { type: "text", text: prompt },
      ],
    };

    // Create augmented prompt for LLM (with RAG context if available)
    const augmentedUserPrompt: BuddhiAIMessage = {
      role: "user",
      content: [
        ...(files && files.length > 0 ? files : []),
        { type: "text", text: prompt + ragContext },
      ],
    };

    // // console.log("User prompt:", userPrompt, files);

    // Use augmented prompt for LLM, but display original prompt in chat
    const promptMessages = [systemPrompt, ...messages, augmentedUserPrompt];

    setMessages((prevMessages) => [...prevMessages, userPrompt]);

    const parts = await generateChatTemplate(promptMessages);

    try {
      const tokenCount = (await webLLMInstance.sizeInTokens(parts)) || 0;
      if (tokenCount > 31000) {
        console.error("Prompt exceeds the model's maximum token limit.");
        setStatus("error");
        setMessages((prevMessages) => prevMessages.slice(0, -1));
        toast.error("Context exceeds the model's maximum token limit.");
        return;
      }

      let assistantResponse = "";

      await webLLMInstance.generateResponse(parts, (partialResult, done) => {
        // // console.log("Partial result:", partialResult, "Done:", done);
        if (!done) {
          setStatus("streaming");
          assistantResponse += partialResult;
          setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              const updatedMessage: BuddhiAIMessage = {
                ...lastMessage,
                content: (lastMessage.content || "") + partialResult,
              };
              return [...prevMessages.slice(0, -1), updatedMessage];
            } else {
              const newMessage: BuddhiAIMessage = {
                role: "assistant" as const,
                content: partialResult,
              };
              return [...prevMessages, newMessage];
            }
          });
        } else {
          // Add sources to the assistant message if RAG was used
          if (useRAG && sources.length > 0) {
            setMessages((prevMessages) => {
              const lastMessage = prevMessages[prevMessages.length - 1];
              if (lastMessage && lastMessage.role === "assistant") {
                const updatedMessage: BuddhiAIMessage = {
                  ...lastMessage,
                  content: [
                    ...sources,
                    {
                      type: "text",
                      text:
                        typeof lastMessage.content === "string"
                          ? lastMessage.content
                          : "",
                    },
                  ],
                };
                return [...prevMessages.slice(0, -1), updatedMessage];
              }
              return prevMessages;
            });
          }
          setStatus("ready");
        }
      });
    } catch (error) {
      console.error("Error during message generation:", error);
      setStatus("error");
      toast.error("Error during message generation.");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = (message: any) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    let attachements: BuddhiAIChatTemplate[] = [];

    if (!(hasText || hasAttachments)) {
      return;
    }

    if (hasAttachments) {
      attachements = message.files.map((file: FileUIPart) => {
        let content: BuddhiAIChatTemplate = { type: "text", text: "" };
        if (file.mediaType.startsWith("image/")) {
          content = {
            type: "image",
            url: file.url,
            fileName: file.filename,
            mediaType: file.mediaType,
          };
        } else if (file.mediaType.startsWith("audio/")) {
          content = {
            type: "audio",
            url: file.url,
            fileName: file.filename,
            mediaType: file.mediaType,
          };
        }
        return content;
      });
      // // console.log("Attachments processed:", attachements);
    }

    sendMessage(message.text, attachements);
    setInput("");
  };

  const regenerate = () => {
    try {
      const lastUserMessage = [...messages]
        .reverse()
        .find((msg) => msg.role === "user");
      const lastAssistantMessage = [...messages]
        .reverse()
        .find((msg) => msg.role === "assistant");
      if (lastUserMessage) {
        const resetMessages = messages.filter(
          (msg) => msg !== lastUserMessage && msg !== lastAssistantMessage
        );
        setMessages(resetMessages);
        if (typeof lastUserMessage.content === "string") {
          sendMessage(lastUserMessage.content);
        } else {
          const filteredContents = lastUserMessage.content.filter(
            (contentItem) => contentItem.type === "text"
          ) as BuddhiAIChatTemplate[];
          const combinedText = filteredContents
            .map((item) => item.text)
            .join("\n");
          const files = lastUserMessage.content.filter(
            (contentItem) => contentItem.type !== "text"
          ) as BuddhiAIChatTemplate[];
          sendMessage(combinedText, files);
        }
      }
    } catch (error) {
      console.error("Error during regeneration:", error);
      toast.error("Error during regeneration.");
    }
  };

  const handleSourceFiles = async () => {};

  // No model loaded — prompt user to install one from the Models page
  if (!webLLMInstance) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4 text-center px-6">
        <BrainCircuitIcon className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No AI model installed</h2>
        <p className="text-muted-foreground max-w-sm">
          You need to install a language model before you can start chatting.
          Visit the Models page to download one.
        </p>
        <Link
          href="/models"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to Models
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 pb-6 relative size-full h-[calc(100vh-4rem)] no-scrollbar">
      <div className="flex flex-col h-full">
        <Conversation className="h-[calc(100vh-4rem)] no-scrollbar">
          <ConversationContent>
            {messages.map((message, index) => (
              <div key={index}>
                {message.role === "assistant" &&
                  Array.isArray(message.content) &&
                  message.content.filter(
                    (part) => part.type === "text" && part.source
                  ).length > 0 && (
                    <Sources>
                      <SourcesTrigger
                        count={
                          message.content.filter(
                            (part) => part.type === "text" && part.source
                          ).length
                        }
                      />
                      <SourcesContent>
                        {message.content
                          .filter((part) => part.type === "text" && part.source)
                          .map((part, i) => (
                            <Source
                              key={`${index}-${i}`}
                              title={part.source || "Unknown"}
                            />
                          ))}
                      </SourcesContent>
                    </Sources>
                  )}
                <Fragment key={`${index}`}>
                  <Message from={message.role}>
                    <MessageContent>
                      {typeof message.content === "string" ? (
                        <MessageResponse>
                          {message.content as string}
                        </MessageResponse>
                      ) : (
                        (message.content as BuddhiAIChatTemplate[]).map(
                          (contentItem, contentIndex) => {
                            if (contentItem.type === "image") {
                              const imageData: FileUIPart = {
                                type: "file",
                                url: contentItem.url || "",
                                mediaType: contentItem.mediaType || "image/png",
                                filename: contentItem.fileName || "image.png",
                              };
                              return (
                                <MessageAttachments
                                  className="mb-2"
                                  key={"attachment-" + contentIndex}
                                >
                                  <MessageAttachment
                                    data={imageData}
                                    key={"img-" + contentIndex}
                                  />
                                </MessageAttachments>
                              );
                            } else if (contentItem.type === "text") {
                              return (
                                <MessageResponse key={contentIndex}>
                                  {contentItem.text}
                                </MessageResponse>
                              );
                            }
                            return null;
                          }
                        )
                      )}
                    </MessageContent>
                  </Message>
                  {message.role === "assistant" &&
                    index === messages.length - 1 && (
                      <MessageActions className="mt-2">
                        <MessageAction
                          onClick={() => regenerate()}
                          label="Retry"
                        >
                          <RefreshCcwIcon className="size-3" />
                        </MessageAction>
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
          accept="image/*"
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
              <DocumentManager
                chatId={chatId || undefined}
                onChatCreated={handleChatCreated}
              />
              {/*<PromptInputSelect
                onValueChange={(value) => {
                  setModel(value);
                  setWebLLMModel(value);
                }}
                value={webLLMModel || model}
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
              </PromptInputSelect>*/}
            </PromptInputTools>
            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
