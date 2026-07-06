import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
    serializeMessagesForStorage,
    updateExistingChat,
} from "@/lib/chat-manager";
import type { UIMessage } from "ai";

export function useChatActions({
    messages,
    setMessages,
    sendMessage,
    transport,
    currentChatIdRef,
}: {
    messages: UIMessage[];
    setMessages: (messages: UIMessage[]) => void;
    sendMessage: (message: { text: string }) => void;
    transport: any; // MediaPipeChatTransport
    currentChatIdRef: React.MutableRefObject<string | null>;
}) {
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editText, setEditText] = useState<string>("");
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    const handleCopy = useCallback((messageId: string, textToCopy: string) => {
        if (!navigator.clipboard) {
            toast.error("Clipboard is not available in this browser.");
            return;
        }
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        }).catch((err) => {
            console.error("[handleCopy] Clipboard write failed:", err);
            toast.error("Could not copy text to clipboard.");
        });
    }, []);

    const handleRegenerate = useCallback(() => {
        if (messages.length === 0) {
            toast.error("No messages to regenerate from.");
            return;
        }

        let lastUserMsgIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === "user") {
                lastUserMsgIndex = i;
                break;
            }
        }

        if (lastUserMsgIndex === -1) {
            toast.error("No user message found to regenerate from.");
            return;
        }

        const lastUserMsg = messages[lastUserMsgIndex];
        const textPart = lastUserMsg.parts.find((p: any) => p.type === "text");
        const userText = textPart?.type === "text" ? textPart.text : "";

        const trimmedMessages = messages.slice(0, lastUserMsgIndex);
        setMessages(trimmedMessages);

        transport.ragContextPromise = Promise.resolve(null);
        sendMessage({ text: userText });
    }, [messages, setMessages, sendMessage, transport]);

    const handleEditStart = useCallback((messageId: string, currentText: string) => {
        setEditingMessageId(messageId);
        setEditText(currentText);
    }, []);

    const handleEditCancel = useCallback(() => {
        setEditingMessageId(null);
        setEditText("");
    }, []);

    const handleEditDone = useCallback(async (messageId: string) => {
        const trimmedEdit = editText.trim();
        if (!trimmedEdit) {
            toast.error("Message text cannot be empty.");
            return;
        }

        const editedIdx = messages.findIndex((m) => m.id === messageId);
        if (editedIdx === -1) {
            console.error("[handleEditDone] Could not find message with id:", messageId);
            toast.error("Could not locate the message to edit.");
            return;
        }

        const updatedMessages = messages
            .slice(0, editedIdx + 1)
            .map((m) =>
                m.id !== messageId
                    ? m
                    : {
                        ...m,
                        parts: m.parts.map((p: any) =>
                            p.type === "text" ? { ...p, text: trimmedEdit } : p
                        ),
                    }
            );

        setMessages(updatedMessages);
        setEditingMessageId(null);
        setEditText("");

        if (currentChatIdRef.current) {
            try {
                const persistable = await serializeMessagesForStorage(updatedMessages);
                await updateExistingChat(currentChatIdRef.current, persistable);
            } catch (err) {
                console.error("[handleEditDone] Failed to persist edited message:", err);
                toast.error("The edit could not be saved to history.");
            }
        }

        transport.ragContextPromise = Promise.resolve(null);
        sendMessage({ text: trimmedEdit });
    }, [editText, messages, setMessages, sendMessage, transport, currentChatIdRef]);

    return {
        editingMessageId,
        editText,
        copiedMessageId,
        setEditText,
        handleCopy,
        handleRegenerate,
        handleEditStart,
        handleEditCancel,
        handleEditDone,
    };
}
