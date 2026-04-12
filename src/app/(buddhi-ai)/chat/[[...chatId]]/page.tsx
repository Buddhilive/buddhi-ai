"use client";

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
    ModelSelector,
    ModelSelectorContent,
    ModelSelectorEmpty,
    ModelSelectorGroup,
    ModelSelectorInput,
    ModelSelectorItem,
    ModelSelectorList,
    ModelSelectorLogo,
    ModelSelectorLogoGroup,
    ModelSelectorName,
    ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
    PromptInput,
    PromptInputActionAddAttachments,
    PromptInputActionMenu,
    PromptInputActionMenuContent,
    PromptInputActionMenuTrigger,
    PromptInputBody,
    PromptInputButton,
    PromptInputFooter,
    PromptInputHeader,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
    usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { createStaticChatTransport } from "@/lib/buddhi-ai-core/chat-api";
import { useChat } from "@ai-sdk/react";
import type { FileUIPart } from "ai";
import { CheckIcon, GlobeIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Transport — created once at module level so it's stable across renders.
// Swap this out for a different ChatTransport when you're ready to use a
// real backend (e.g. new DefaultChatTransport({ api: '/api/chat' })).
// ---------------------------------------------------------------------------
const transport = createStaticChatTransport();

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const models = [
    {
        chef: "OpenAI",
        chefSlug: "openai",
        id: "gpt-4o",
        name: "GPT-4o",
        providers: ["openai", "azure"],
    },
    {
        chef: "OpenAI",
        chefSlug: "openai",
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        providers: ["openai", "azure"],
    },
    {
        chef: "Anthropic",
        chefSlug: "anthropic",
        id: "claude-opus-4-20250514",
        name: "Claude 4 Opus",
        providers: ["anthropic", "azure", "google", "amazon-bedrock"],
    },
    {
        chef: "Anthropic",
        chefSlug: "anthropic",
        id: "claude-sonnet-4-20250514",
        name: "Claude 4 Sonnet",
        providers: ["anthropic", "azure", "google", "amazon-bedrock"],
    },
    {
        chef: "Google",
        chefSlug: "google",
        id: "gemini-2.0-flash-exp",
        name: "Gemini 2.0 Flash",
        providers: ["google"],
    },
];

const suggestions = [
    "What are the latest trends in AI?",
    "How does machine learning work?",
    "Explain quantum computing",
    "Best practices for React development",
    "Tell me about TypeScript benefits",
    "How to optimize database queries?",
    "What is the difference between SQL and NoSQL?",
    "Explain cloud computing basics",
];

const chefs = ["OpenAI", "Anthropic", "Google"];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const AttachmentItem = ({
    attachment,
    onRemove,
}: {
    attachment: FileUIPart & { id: string };
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

    if (attachments.files.length === 0) {
        return null;
    }

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

const ModelItem = ({
    m,
    isSelected,
    onSelect,
}: {
    m: (typeof models)[0];
    isSelected: boolean;
    onSelect: (id: string) => void;
}) => {
    const handleSelect = useCallback(() => {
        onSelect(m.id);
    }, [onSelect, m.id]);

    return (
        <ModelSelectorItem onSelect={handleSelect} value={m.id}>
            <ModelSelectorLogo provider={m.chefSlug} />
            <ModelSelectorName>{m.name}</ModelSelectorName>
            <ModelSelectorLogoGroup>
                {m.providers.map((provider) => (
                    <ModelSelectorLogo key={provider} provider={provider} />
                ))}
            </ModelSelectorLogoGroup>
            {isSelected ? (
                <CheckIcon className="ml-auto size-4" />
            ) : (
                <div className="ml-auto size-4" />
            )}
        </ModelSelectorItem>
    );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ChatPage() {
    const [model, setModel] = useState<string>(models[0].id);
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
    const [text, setText] = useState<string>("");
    const [useWebSearch, setUseWebSearch] = useState<boolean>(false);

    // ── useChat ───────────────────────────────────────────────────────────────
    // `messages`    – UIMessage[] managed by the SDK; updates reactively as
    //                 chunks arrive from the transport stream.
    // `sendMessage` – appends a user message and triggers the transport.
    // `stop`        – aborts the in-flight stream (fires the AbortSignal).
    // `status`      – 'ready' | 'submitted' | 'streaming' | 'error'
    const { messages, sendMessage, stop, status } = useChat({ transport });

    const selectedModelData = useMemo(
        () => models.find((m) => m.id === model),
        [model]
    );

    // Disable submit while a response is in flight, or when input is empty.
    const isSubmitDisabled =
        !text.trim() || status === "streaming" || status === "submitted";

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSubmit = useCallback(
        (message: PromptInputMessage) => {
            if (!message.text && !message.files?.length) return;

            if (message.files?.length) {
                toast.success("Files attached", {
                    description: `${message.files.length} file(s) attached to message`,
                });
            }

            // sendMessage({ text, files }) appends the user turn and calls
            // transport.sendMessages() under the hood.
            sendMessage({
                text: message.text || "",
                files: message.files,
            });

            setText("");
        },
        [sendMessage]
    );

    const handleSuggestionClick = useCallback(
        (suggestion: string) => {
            sendMessage({ text: suggestion });
        },
        [sendMessage]
    );

    const handleTranscriptionChange = useCallback((transcript: string) => {
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }, []);

    const handleTextChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            setText(event.target.value);
        },
        []
    );

    const toggleWebSearch = useCallback(() => {
        setUseWebSearch((prev) => !prev);
    }, []);

    const handleModelSelect = useCallback((modelId: string) => {
        setModel(modelId);
        setModelSelectorOpen(false);
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="relative flex h-[calc(100vh-80px)] flex-col divide-y overflow-hidden">
            <Conversation>
                <ConversationContent>
                    {messages.map((message) => (
                        // MessageBranch manages multi-version messages (e.g. regenerations).
                        // With a single version per message the branch selector is hidden
                        // automatically by the component.
                        <MessageBranch defaultBranch={0} key={message.id}>
                            <MessageBranchContent>
                                <Message from={message.role}>
                                    <MessageContent>
                                        {/*
                                         * UIMessage.parts is an array of content blocks.
                                         * Each block has a `type` discriminant.
                                         * We render text blocks here; other block types
                                         * (tool-call, reasoning, file …) can be added
                                         * as the transport evolves.
                                         */}
                                        {message.parts.map((part, index) => {
                                            if (part.type === "text") {
                                                return (
                                                    <MessageResponse key={index}>
                                                        {part.text}
                                                    </MessageResponse>
                                                );
                                            }
                                            // Non-text parts (tool-call, file, etc.) are
                                            // intentionally not rendered yet.
                                            return null;
                                        })}
                                    </MessageContent>
                                </Message>
                            </MessageBranchContent>
                        </MessageBranch>
                    ))}
                </ConversationContent>
                <ConversationScrollButton />
            </Conversation>

            <div className="grid shrink-0 gap-4 pt-4">
                {/* Hide suggestions once the conversation has started */}
                {messages.length === 0 && (
                    <Suggestions className="px-4">
                        {suggestions.map((suggestion) => (
                            <SuggestionItem
                                key={suggestion}
                                onClick={handleSuggestionClick}
                                suggestion={suggestion}
                            />
                        ))}
                    </Suggestions>
                )}

                <div className="w-full px-4 pb-4">
                    <PromptInput globalDrop multiple onSubmit={handleSubmit}>
                        <PromptInputHeader>
                            <PromptInputAttachmentsDisplay />
                        </PromptInputHeader>
                        <PromptInputBody>
                            <PromptInputTextarea onChange={handleTextChange} value={text} />
                        </PromptInputBody>
                        <PromptInputFooter>
                            <PromptInputTools>
                                <PromptInputActionMenu>
                                    <PromptInputActionMenuTrigger />
                                    <PromptInputActionMenuContent>
                                        <PromptInputActionAddAttachments />
                                    </PromptInputActionMenuContent>
                                </PromptInputActionMenu>
                                <SpeechInput
                                    className="shrink-0"
                                    onTranscriptionChange={handleTranscriptionChange}
                                    size="icon-sm"
                                    variant="ghost"
                                />
                                <PromptInputButton
                                    onClick={toggleWebSearch}
                                    variant={useWebSearch ? "default" : "ghost"}
                                >
                                    <GlobeIcon size={16} />
                                    <span>Search</span>
                                </PromptInputButton>
                                <ModelSelector
                                    onOpenChange={setModelSelectorOpen}
                                    open={modelSelectorOpen}
                                >
                                    <ModelSelectorTrigger asChild>
                                        <PromptInputButton>
                                            {selectedModelData?.chefSlug && (
                                                <ModelSelectorLogo
                                                    provider={selectedModelData.chefSlug}
                                                />
                                            )}
                                            {selectedModelData?.name && (
                                                <ModelSelectorName>
                                                    {selectedModelData.name}
                                                </ModelSelectorName>
                                            )}
                                        </PromptInputButton>
                                    </ModelSelectorTrigger>
                                    <ModelSelectorContent>
                                        <ModelSelectorInput placeholder="Search models..." />
                                        <ModelSelectorList>
                                            <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                                            {chefs.map((chef) => (
                                                <ModelSelectorGroup heading={chef} key={chef}>
                                                    {models
                                                        .filter((m) => m.chef === chef)
                                                        .map((m) => (
                                                            <ModelItem
                                                                isSelected={model === m.id}
                                                                key={m.id}
                                                                m={m}
                                                                onSelect={handleModelSelect}
                                                            />
                                                        ))}
                                                </ModelSelectorGroup>
                                            ))}
                                        </ModelSelectorList>
                                    </ModelSelectorContent>
                                </ModelSelector>
                            </PromptInputTools>

                            {/*
                             * status – passed straight from useChat; PromptInputSubmit
                             *          uses it to show a spinner during 'submitted' and
                             *          a stop icon during 'streaming'.
                             * onStop  – calls useChat's stop(), which fires the AbortSignal
                             *           passed to transport.sendMessages(), triggering the
                             *           abort chunk in StaticChatTransport.
                             */}
                            <PromptInputSubmit
                                disabled={isSubmitDisabled}
                                onStop={stop}
                                status={status}
                            />
                        </PromptInputFooter>
                    </PromptInput>
                </div>
            </div>
        </div>
    );
}
