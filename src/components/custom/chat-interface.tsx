"use client";

/**
 * chat-interface.tsx
 *
 * Top-level chat UI with a model-readiness gate.
 *
 * COMPONENT TREE
 * --------------
 *  ChatInterface          ← default export; guards against missing model
 *    ├─ ModelLoadingState ← spinner while LlmInference initialises
 *    ├─ ModelUnavailableState ← CTA when no model is downloaded
 *    └─ ChatSession       ← full chat UI, only mounted when model is ready
 *
 * WHY THE SPLIT?
 * --------------
 * `useChat` and the `MediaPipeChatTransport` are only instantiated inside
 * `ChatSession`. Because `ChatSession` is not rendered until the
 * `LlmInference` instance exists, the transport is guaranteed to always
 * receive a valid instance — no null-checks needed at call sites.
 */

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
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MediaPipeChatTransport } from "@/lib/buddhi-ai-core/chat-api";
import {
    createNewChat,
    generateChatTitle,
    loadChat,
    updateExistingChat,
} from "@/lib/chat-manager";
import { useLiteRTModelStore } from "@/stores/litert-store";
import { useChatStore } from "@/stores/chat-store";
import { useChat } from "@ai-sdk/react";
import type { LlmInference } from "@mediapipe/tasks-genai";
import type { FileUIPart } from "ai";
import { BrainCircuitIcon, CheckIcon, GlobeIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Shimmer } from "../ai-elements/shimmer";

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

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
// Gate states
// ---------------------------------------------------------------------------

/**
 * Shown while `useModelEngine` is initialising the LlmInference instance
 * (i.e. `liteRTModelStatus` is `'idle'` or `'loading'`).
 */
function ModelLoadingState() {
    return (
        <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-4 text-center">
            <Spinner className="size-8" />
            <p className="text-muted-foreground text-sm">Loading AI model…</p>
        </div>
    );
}

/**
 * Shown when the store is hydrated but no completed language model was found,
 * OR when LlmInference initialisation failed.
 *
 * Gives the user a clear path to the Model Manager so they can download one.
 */
function ModelUnavailableState({ isError }: { isError: boolean }) {
    return (
        <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-6 px-6 text-center">
            <div className="flex flex-col items-center gap-3">
                <BrainCircuitIcon className="text-muted-foreground size-12" />
                <h2 className="text-lg font-semibold">
                    {isError ? "Model failed to load" : "No AI model available"}
                </h2>
                <p className="text-muted-foreground max-w-sm text-sm">
                    {isError
                        ? "The language model could not be initialised. Try reloading the page. If the problem persists, re-download the model."
                        : "Download a language model to start chatting. All inference runs locally — your data never leaves your device."}
                </p>
            </div>
            <Button asChild>
                <Link href="/models">
                    <BrainCircuitIcon className="mr-2 size-4" />
                    {isError ? "Manage Models" : "Download a Model"}
                </Link>
            </Button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-components (shared between ChatInterface and ChatSession)
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

// ---------------------------------------------------------------------------
// ChatSession — the actual chat UI
// ---------------------------------------------------------------------------

/**
 * Mounts only when a valid `LlmInference` instance is available.
 * Creates the transport once (via useMemo) and owns the useChat state.
 * Re-mounts when `chatId` changes (enforced by `key` in ChatInterface).
 */
function ChatSession({
    instance,
    chatId,
}: {
    instance: LlmInference;
    chatId: string | null;
}) {
    const [text, setText] = useState<string>("");
    const [useWebSearch, setUseWebSearch] = useState<boolean>(false);

    // true while we're fetching an existing chat from IndexedDB.
    // Starts true when a chatId is present so the spinner shows immediately
    // (before the async load resolves) and prevents a flash of empty messages.
    const [isLoadingChat, setIsLoadingChat] = useState(!!chatId);

    // Tracks the active chat ID across renders without triggering re-renders.
    const currentChatIdRef = useRef<string | null>(chatId);

    // Tracks the previous streaming status to detect the streaming→ready transition.
    const prevStatusRef = useRef<string>("ready");

    const setCurrentChatId = useChatStore((s) => s.setCurrentChatId);
    const refreshChats = useChatStore((s) => s.refreshChats);

    // The transport is stable: `instance` is set once in useLiteRTModelStore
    // and never replaced, so this memo only runs on initial mount.
    const transport = useMemo(
        () => new MediaPipeChatTransport(instance),
        [instance]
    );

    // ── useChat ───────────────────────────────────────────────────────────────
    // `messages`    – UIMessage[] managed by the SDK; updates reactively as
    //                 token chunks arrive from the transport stream.
    // `sendMessage` – appends a user message and calls transport.sendMessages.
    // `stop`        – fires the AbortSignal passed to transport.sendMessages.
    // `status`      – 'ready' | 'submitted' | 'streaming' | 'error'
    // `setMessages` – imperatively set the message list (used for chat restore).
    const { messages, setMessages, sendMessage, stop, status } = useChat({
        transport,
    });

    // ── Load existing chat ─────────────────────────────────────────────────────
    // Runs once on mount. `chatId` is stable for this component instance
    // because the parent applies key={chatId ?? "new"}, forcing a full
    // remount whenever the route changes.
    //
    // We call setMessages() rather than passing initialMessages to useChat
    // because useChat only reads initialMessages on first render — it ignores
    // changes to the option on re-renders. setMessages() works at any time.
    useEffect(() => {
        setCurrentChatId(chatId);

        if (!chatId) return;

        loadChat(chatId)
            .then((chat) => {
                if (chat?.messages?.length) {
                    setMessages(chat.messages);
                }
            })
            .catch(() => {
                console.error("[ChatSession] Failed to load chat:", chatId);
                toast.error("Could not load chat history.");
            })
            .finally(() => setIsLoadingChat(false));

        return () => setCurrentChatId(null);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Disable submit while a response is in flight, or when the input is empty.
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

            // sendMessage appends the user turn and triggers transport.sendMessages.
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

    // ── Persist chat on streaming→ready transition ─────────────────────────────
    // Detects when a streaming response finishes and saves the full conversation
    // to IndexedDB. For new chats, also updates the URL without a re-render.
    useEffect(() => {
        const wasStreaming = prevStatusRef.current === "streaming";
        prevStatusRef.current = status;

        if (!wasStreaming || status !== "ready" || messages.length === 0) return;

        (async () => {
            try {
                if (currentChatIdRef.current) {
                    await updateExistingChat(currentChatIdRef.current, messages);
                } else {
                    const title = generateChatTitle(messages);
                    const newId = await createNewChat(messages, title);
                    currentChatIdRef.current = newId;
                    // Update the browser URL silently — no Next.js navigation,
                    // no component re-render, no flicker.
                    window.history.replaceState(null, "", `/chat/${newId}`);
                    setCurrentChatId(newId);
                }
                await refreshChats();
            } catch (error) {
                console.error("[ChatSession] Failed to save chat:", error);
                toast.error("Chat could not be saved.");
            }
        })();
    }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Loading guard ─────────────────────────────────────────────────────────
    // Show a spinner while we fetch an existing chat from IndexedDB.
    // Prevents a flash of empty messages before the restored conversation appears.
    if (isLoadingChat) {
        return (
            <div className="flex h-[calc(100vh-80px)] items-center justify-center">
                <Spinner className="size-8" />
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="relative flex h-[calc(100vh-80px)] flex-col divide-y overflow-hidden">
            <Conversation>
                <ConversationContent>
                    {messages.map((message) => (
                        // MessageBranch handles multi-version messages (e.g. regenerations).
                        // With a single version the branch selector is hidden automatically.
                        <MessageBranch defaultBranch={0} key={message.id}>
                            <MessageBranchContent>
                                <Message from={message.role}>
                                    <MessageContent>
                                        {/*
                                         * UIMessage.parts is a discriminated union. We render
                                         * text blocks here; other part types (tool-call, file,
                                         * reasoning) can be added as the transport evolves.
                                         */}
                                        {message.parts.map((part, index) => {
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
                                </Message>
                            </MessageBranchContent>
                        </MessageBranch>
                    ))}
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

            <div className="grid shrink-0 gap-3 pt-4">
                {/* Suggestions disappear once the conversation has started */}
                {/* {messages.length === 0 && (
                    <Suggestions className="px-4">
                        {suggestions.map((suggestion) => (
                            <SuggestionItem
                                key={suggestion}
                                onClick={handleSuggestionClick}
                                suggestion={suggestion}
                            />
                        ))}
                    </Suggestions>
                )} */}

                <div className="w-full px-4 pb-4">
                    <PromptInput globalDrop multiple onSubmit={handleSubmit}>
                        <PromptInputHeader>
                            <PromptInputAttachmentsDisplay />
                        </PromptInputHeader>
                        <PromptInputBody>
                            <PromptInputTextarea
                                onChange={handleTextChange}
                                value={text}
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
                                <SpeechInput
                                    className="shrink-0"
                                    onTranscriptionChange={handleTranscriptionChange}
                                    size="icon-sm"
                                    variant="ghost"
                                />
                                {/* <PromptInputButton
                                    onClick={toggleWebSearch}
                                    variant={useWebSearch ? "default" : "ghost"}
                                >
                                    <GlobeIcon size={16} />
                                    <span>Search</span>
                                </PromptInputButton> */}
                            </PromptInputTools>

                            {/*
                             * status – passed straight from useChat; PromptInputSubmit
                             *          shows a spinner during 'submitted' and a stop icon
                             *          during 'streaming'.
                             * onStop  – calls useChat's stop(), which fires the AbortSignal
                             *           passed to MediaPipeChatTransport.sendMessages().
                             */}
                            <PromptInputSubmit
                                disabled={isSubmitDisabled}
                                onStop={stop}
                                status={status}
                            />
                        </PromptInputFooter>
                    </PromptInput>
                </div>
                <span className="text-xs text-muted-foreground text-center">BuddiAI can make mistakes, so double-check the output.</span>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// ChatInterface — model gate (exported)
// ---------------------------------------------------------------------------

/**
 * The top-level chat component. Calls `useModelEngine` to trigger LlmInference
 * initialisation, then guards rendering based on `liteRTModelStatus`:
 *
 *  idle / loading  → spinner
 *  error           → "model failed to load" + manage button
 *  ready (no inst) → "no model available" + download button  (should not happen)
 *  ready           → <ChatSession instance={…} />
 */
export function ChatInterface() {
    const instance = useLiteRTModelStore((s) => s.liteRTModelInstance);
    const modelStatus = useLiteRTModelStore((s) => s.liteRTModelStatus);

    // Read the optional [[...chatId]] route segment.
    const params = useParams<{ chatId?: string[] }>();
    const chatId = params.chatId?.[0] ?? null;

    // Still initialising (store not yet hydrated, or loading from WASM)
    if (!modelStatus || modelStatus === "idle" || modelStatus === "loading") {
        return <ModelLoadingState />;
    }

    // Initialisation failed — no completed model found, or WASM threw
    if (modelStatus === "error") {
        return <ModelUnavailableState isError />;
    }

    // Edge case: status is 'ready' but instance is missing (should not happen)
    if (!instance) {
        return <ModelUnavailableState isError={false} />;
    }

    // key={chatId ?? "new"} forces a full remount when navigating between chats,
    // ensuring each ChatSession starts with a clean state and loads its own data.
    return <ChatSession instance={instance} chatId={chatId} key={chatId ?? "new"} />;
}
