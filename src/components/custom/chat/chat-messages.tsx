import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
    Message,
    MessageAction,
    MessageActions,
    MessageBranch,
    MessageBranchContent,
    MessageContent,
    MessageResponse,
    MessageToolbar,
} from "@/components/ai-elements/message";
import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon, PencilIcon, RefreshCcwIcon, TriangleAlert, XIcon } from "lucide-react";
import type { UIMessage } from "ai";
import type { FileUIPart } from "ai";
import {
    Attachment,
    AttachmentInfo,
    AttachmentPreview,
    Attachments,
    type AttachmentData,
} from "@/components/ai-elements/attachments";
import {
    Source,
    Sources,
    SourcesContent,
    SourcesTrigger,
} from "@/components/ai-elements/sources";
import type { RagSourceItem } from "@/lib/rag";

interface ChatMessagesProps {
    messages: UIMessage[];
    status: string;
    isSummarizing: boolean;
    editingMessageId: string | null;
    editText: string;
    setEditText: (text: string) => void;
    handleEditCancel: () => void;
    handleEditDone: (id: string) => void;
    handleEditStart: (id: string, text: string) => void;
    handleCopy: (id: string, text: string) => void;
    copiedMessageId: string | null;
    handleRegenerate: () => void;
    sources: RagSourceItem[];
    sendMessage: (msg: { text: string }) => void;
}

export function ChatMessages({
    messages,
    status,
    isSummarizing,
    editingMessageId,
    editText,
    setEditText,
    handleEditCancel,
    handleEditDone,
    handleEditStart,
    handleCopy,
    copiedMessageId,
    handleRegenerate,
    sources,
    sendMessage,
}: ChatMessagesProps) {
    return (
        <Conversation>
            <ConversationContent>
                {messages.map((message, msgIndex) => {
                    const isLastMessage = msgIndex === messages.length - 1;
                    const isStreaming = status === "streaming" || status === "submitted";

                    const messageText = message.parts
                        .filter((p: any) => p.type === "text")
                        .map((p: any) => (p as { type: "text"; text: string }).text)
                        .join("\n");

                    const isEditing = editingMessageId === message.id;

                    return (
                        <MessageBranch defaultBranch={0} key={message.id}>
                            <MessageBranchContent>
                                {isEditing ? (
                                    <div className="ml-auto flex w-full max-w-[95%] flex-col gap-1">
                                        <textarea
                                            aria-label="Edit message"
                                            autoFocus
                                            className="w-full resize-none rounded-lg bg-secondary px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            onChange={(e) => setEditText(e.target.value)}
                                            rows={Math.max(2, editText.split("\n").length)}
                                            value={editText}
                                        />
                                        <div className="flex justify-end gap-1">
                                            <MessageActions>
                                                <MessageAction
                                                    label="Cancel edit"
                                                    onClick={handleEditCancel}
                                                    tooltip="Cancel"
                                                >
                                                    <XIcon size={12} />
                                                </MessageAction>
                                                <MessageAction
                                                    disabled={!editText.trim()}
                                                    label="Send edited message"
                                                    onClick={() => handleEditDone(message.id)}
                                                    tooltip="Done"
                                                    variant="default"
                                                >
                                                    <CheckIcon size={12} />
                                                </MessageAction>
                                            </MessageActions>
                                        </div>
                                    </div>
                                ) : (
                                    <Message from={message.role}>
                                        <MessageContent>
                                            {message.parts.map((part: any, partIndex: number) => {
                                                if (part.type === "reasoning") {
                                                    const isThisMessageStreaming =
                                                        status === "streaming" &&
                                                        message.id === messages[messages.length - 1]?.id;
                                                    return (
                                                        <Reasoning key={partIndex} isStreaming={isThisMessageStreaming}>
                                                            <ReasoningTrigger />
                                                            <ReasoningContent>{part.text}</ReasoningContent>
                                                        </Reasoning>
                                                    );
                                                }
                                                if (part.type === "text") {
                                                    return (
                                                        <MessageResponse key={partIndex}>
                                                            {part.text}
                                                        </MessageResponse>
                                                    );
                                                }
                                                if (part.type === "file") {
                                                    const filePart = part as FileUIPart;
                                                    const attachmentData: AttachmentData = {
                                                        ...filePart,
                                                        id: `${message.id}-${partIndex}`,
                                                    };
                                                    return (
                                                        <Attachments key={partIndex} variant="inline">
                                                            <Attachment data={attachmentData}>
                                                                <AttachmentPreview />
                                                                <AttachmentInfo />
                                                            </Attachment>
                                                        </Attachments>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </MessageContent>

                                        {message.role === "assistant" &&
                                            isLastMessage &&
                                            sources.length > 0 && (
                                                <Sources>
                                                    <SourcesTrigger count={sources.length} />
                                                    <SourcesContent>
                                                        {sources.map((source) => (
                                                            <Source
                                                                key={source.documentId}
                                                                title={source.fileName}
                                                            />
                                                        ))}
                                                    </SourcesContent>
                                                </Sources>
                                            )}
                                    </Message>
                                )}
                            </MessageBranchContent>

                            {isLastMessage && !isStreaming && !isEditing && (
                                <MessageToolbar>
                                    <MessageActions>
                                        {message.role === "assistant" && (
                                            <>
                                                <MessageAction
                                                    label="Copy response"
                                                    onClick={() =>
                                                        handleCopy(message.id, messageText)
                                                    }
                                                    tooltip="Copy"
                                                >
                                                    {copiedMessageId === message.id ? (
                                                        <CheckIcon size={12} />
                                                    ) : (
                                                        <CopyIcon size={12} />
                                                    )}
                                                </MessageAction>
                                                <MessageAction
                                                    label="Regenerate response"
                                                    onClick={handleRegenerate}
                                                    tooltip="Regenerate"
                                                >
                                                    <RefreshCcwIcon size={12} />
                                                </MessageAction>
                                            </>
                                        )}

                                        {message.role === "user" && (
                                            <>
                                                <MessageAction
                                                    label="Regenerate response"
                                                    onClick={handleRegenerate}
                                                    tooltip="Regenerate"
                                                >
                                                    <RefreshCcwIcon size={12} />
                                                </MessageAction>
                                                <MessageAction
                                                    label="Edit message"
                                                    onClick={() =>
                                                        handleEditStart(message.id, messageText)
                                                    }
                                                    tooltip="Edit"
                                                >
                                                    <PencilIcon size={12} />
                                                </MessageAction>
                                            </>
                                        )}
                                    </MessageActions>
                                </MessageToolbar>
                            )}
                        </MessageBranch>
                    );
                })}
                {(status === "submitted" || status === "streaming") && (
                    <Message from="assistant">
                        <MessageContent>
                            <Shimmer className="text-sm" duration={1.5}>
                                {status === "submitted" ? "Thinking..." : "Typing..."}
                            </Shimmer>
                        </MessageContent>
                    </Message>
                )}

                {isSummarizing && status === "ready" && (
                    <Message from="assistant">
                        <MessageContent>
                            <Shimmer className="text-sm" duration={2}>
                                Summarizing conversation memory...
                            </Shimmer>
                        </MessageContent>
                    </Message>
                )}

                {status === "error" && (
                    <div className="px-4 py-2">
                        <Alert variant="destructive" className="flex items-start gap-3">
                            <TriangleAlert className="mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <AlertTitle>Response failed</AlertTitle>
                                <AlertDescription>
                                    The AI model could not generate a response. This may be a
                                    temporary issue — please try again.
                                </AlertDescription>
                            </div>
                            <Button
                                className="shrink-0 self-center"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    const lastUserMsg = [...messages]
                                        .reverse()
                                        .find((m) => m.role === "user");
                                    if (lastUserMsg) {
                                        const textPart = lastUserMsg.parts.find(
                                            (p: any) => p.type === "text"
                                        );
                                        sendMessage({
                                            text:
                                                textPart && textPart.type === "text"
                                                    ? textPart.text
                                                    : "",
                                        });
                                    }
                                }}
                            >
                                Retry
                            </Button>
                        </Alert>
                    </div>
                )}
            </ConversationContent>
            <ConversationScrollButton />
        </Conversation>
    );
}
