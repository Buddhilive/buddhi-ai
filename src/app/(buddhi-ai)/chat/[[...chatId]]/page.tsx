"use client";

import type { UIMessage } from "@ai-sdk/react";

import {
    Attachment,
    AttachmentPreview,
    AttachmentRemove,
    Attachments,
} from "@/components/ai-elements/attachments";
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
    Message,
    MessageBranch,
    MessageBranchContent,
    MessageContent,
    MessageResponse,
} from "@/components/ai-elements/message";
import {
    PromptInput,
    PromptInputActionAddAttachments,
    PromptInputActionMenu,
    PromptInputActionMenuContent,
    PromptInputActionMenuTrigger,
    PromptInputBody,
    PromptInputFooter,
    PromptInputHeader,
    PromptInputMessage,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
    usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useCallback, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { TransformersUIMessage } from "@browser-ai/transformers-js";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { TransformersChatTransport } from "@/lib/chat-transport";

const suggestions = [
    "hello",
];

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function makeTitle(text: string): string {
    const trimmed = text.trim();
    return trimmed.length > 24 ? trimmed.slice(0, 24) + "..." : trimmed;
}


function extractTextContent(message: UIMessage): string {
    const fromParts = message.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text as string)
        .join("");
    // Fall back to the top-level `content` field for messages whose parts
    // don't include a "text" entry (e.g. some user-message structures in the SDK)
    return fromParts || (message as any).content || "";
}

// ─────────────────────────────────────────────────────────
// Attachment helpers (unchanged from original)
// ─────────────────────────────────────────────────────────

const AttachmentItem = ({
    attachment,
    onRemove,
}: {
    attachment: any;
    onRemove: (id: string) => void;
}) => {
    const handleRemove = useCallback(() => {
        onRemove(attachment.id);
    }, [onRemove, attachment.id]);

    return (
        <Attachment data={attachment} onRemove={handleRemove}>
            <AttachmentPreview />
            <AttachmentRemove />
        </Attachment>
    );
};

const PromptInputAttachmentsDisplay = () => {
    const attachments = usePromptInputAttachments();

    const handleRemove = useCallback(
        (id: string) => {
            attachments.remove(id);
        },
        [attachments]
    );

    if (attachments.files.length === 0) return null;

    return (
        <Attachments variant="inline">
            {attachments.files.map((attachment) => (
                <AttachmentItem
                    attachment={attachment}
                    key={attachment.id}
                    onRemove={handleRemove}
                />
            ))}
        </Attachments>
    );
};

const SuggestionItem = ({
    suggestion,
    onClick,
}: {
    suggestion: string;
    onClick: (suggestion: string) => void;
}) => {
    const handleClick = useCallback(() => {
        onClick(suggestion);
    }, [onClick, suggestion]);

    return <Suggestion onClick={handleClick} suggestion={suggestion} />;
};

export default function ChatPage() {
    const {
        messages,
        sendMessage,
        status,
        stop,
        addToolApprovalResponse,
    } = useChat<TransformersUIMessage>({
        transport: new TransformersChatTransport(),
        experimental_throttle: 75,
        // Automatically resumes after tool approval responses are submitted
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    });

    const [inputValue, setInputValue] = useState("");


    const handleSuggestionClick = useCallback(
        (suggestion: string) => {
            sendMessage({ text: suggestion });
        },
        [sendMessage]
    );

    const handleTranscriptionChange = useCallback((transcript: string) => {
        setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }, []);

    const handleTextChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            setInputValue(event.target.value);
        },
        []
    );

    const handleSubmit = (message: PromptInputMessage) => {
        if (message.text.trim() && status === "ready") {
            sendMessage({ text: message.text, files: message.files });
            setInputValue("");
        }
    };

    const isStreaming = status === "streaming" || status === "submitted";
    const isSubmitDisabled = isStreaming || !inputValue.trim();

    return (
        <div className="flex h-[calc(100vh-80px)] flex-col divide-y overflow-hidden">
            <Conversation>
                <ConversationContent>
                    {messages.map((message, messageIndex) => {
                        const sourceParts =
                            message.role === "assistant"
                                ? message.parts.filter((part: any) => part.type === "source-url")
                                : [];
                        const uniqueSources = sourceParts.filter(
                            (part: any, index: number, self: any[]) =>
                                self.findIndex((p: any) => p.url === part.url) === index
                        );
                        const reasoningParts =
                            message.role === "assistant"
                                ? message.parts.filter((part: any) => part.type === "reasoning")
                                : [];
                        const reasoningText = reasoningParts.map((part: any) => part.text).join("\n\n");
                        const hasReasoning = reasoningParts.length > 0;
                        const isLastMessage = messageIndex === messages.length - 1;
                        const lastPart = message.parts.at(-1) as any;
                        const isReasoningStreaming =
                            isLastMessage && isStreaming && lastPart?.type === "reasoning";

                        return (
                            <MessageBranch defaultBranch={0} key={message.id}>
                                <MessageBranchContent>
                                    <Message
                                        from={message.role === "user" ? "user" : "assistant"}
                                        key={message.id}
                                    >
                                        <div>
                                            {uniqueSources.length > 0 && (
                                                <Sources>
                                                    <SourcesTrigger count={uniqueSources.length} />
                                                    <SourcesContent>
                                                        {uniqueSources.map((part: any, i: number) => (
                                                            <Source
                                                                key={`${message.id}-source-${i}`}
                                                                href={part.url}
                                                                title={part.title || part.url}
                                                            />
                                                        ))}
                                                    </SourcesContent>
                                                </Sources>
                                            )}
                                            {hasReasoning && (
                                                <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
                                                    <ReasoningTrigger />
                                                    <ReasoningContent>{reasoningText}</ReasoningContent>
                                                </Reasoning>
                                            )}
                                            <MessageContent>
                                                {message.parts.map((part: any, index: number) => {
                                                    if (part.type === "text") {
                                                        return (
                                                            <MessageResponse key={index}>
                                                                {part.text}
                                                            </MessageResponse>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </MessageContent>
                                        </div>
                                    </Message>
                                </MessageBranchContent>
                            </MessageBranch>
                        );
                    })}
                    {(status === "submitted" || status === "streaming") && (
                        <Message from="assistant">
                            <MessageContent>
                                <Shimmer className="text-sm" duration={1.5}>
                                    {status === "submitted" ? "Generating response..." : "Thinking..."}
                                </Shimmer>
                            </MessageContent>
                        </Message>
                    )}
                </ConversationContent>
                <ConversationScrollButton />
            </Conversation>
            <div className="grid shrink-0 gap-4 pt-4">
                <Suggestions className="px-4">
                    {suggestions.map((suggestion) => (
                        <SuggestionItem
                            key={suggestion}
                            onClick={handleSuggestionClick}
                            suggestion={suggestion}
                        />
                    ))}
                </Suggestions>
                <div className="w-full px-4 pb-4">
                    <PromptInput globalDrop multiple onSubmit={handleSubmit}>
                        <PromptInputHeader>
                            <PromptInputAttachmentsDisplay />
                        </PromptInputHeader>
                        <PromptInputBody>
                            <PromptInputTextarea onChange={handleTextChange} value={inputValue} />
                        </PromptInputBody>
                        <PromptInputFooter>
                            <PromptInputTools>
                                {/* <PromptInputActionMenu>
                                    <PromptInputActionMenuTrigger />
                                    <PromptInputActionMenuContent>
                                        <PromptInputActionAddAttachments />
                                    </PromptInputActionMenuContent>
                                </PromptInputActionMenu> */}
                                <SpeechInput
                                    className="shrink-0 cursor-pointer"
                                    onTranscriptionChange={handleTranscriptionChange}
                                    size="icon-sm"
                                    variant="ghost"
                                />
                            </PromptInputTools>
                            <PromptInputSubmit
                                disabled={isSubmitDisabled}
                                status={isStreaming ? "streaming" : "ready"}
                            />
                        </PromptInputFooter>
                    </PromptInput>
                </div>
            </div>
        </div>
    );
}
