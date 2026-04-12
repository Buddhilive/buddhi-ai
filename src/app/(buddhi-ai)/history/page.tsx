"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2Icon, MessageSquareIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Shimmer } from "@/components/ai-elements/shimmer";

import { chatsApi, type ChatInfo } from "@/lib/chat-manager";

const PAGE_SIZE = 20;

export default function HistoryPage() {
    const router = useRouter();

    const [chats, setChats] = React.useState<ChatInfo[]>([]);
    const [total, setTotal] = React.useState(0);
    const [offset, setOffset] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);

    const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const pendingChat = chats.find((c) => c.id === pendingDeleteId) ?? null;

    // Initial load
    React.useEffect(() => {
        setIsLoading(true);
        chatsApi
            .list(PAGE_SIZE, 0)
            .then(({ chats: data, total: t }) => {
                setChats(data);
                setTotal(t);
                setOffset(data.length);
            })
            .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : "Please try again.";
                console.error("[HistoryPage] load error:", err);
                toast.error("Failed to load chat history", { description: message });
            })
            .finally(() => setIsLoading(false));
    }, []);

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        try {
            const { chats: more } = await chatsApi.list(PAGE_SIZE, offset);
            setChats((prev) => [...prev, ...more]);
            setOffset((prev) => prev + more.length);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Please try again.";
            console.error("[HistoryPage] load more error:", err);
            toast.error("Failed to load more chats", { description: message });
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (pendingDeleteId === null) return;
        setIsDeleting(true);
        try {
            await chatsApi.delete(pendingDeleteId);
            setChats((prev) => prev.filter((c) => c.id !== pendingDeleteId));
            setTotal((prev) => Math.max(0, prev - 1));
            toast.success("Chat deleted");
            // If the deleted chat is currently open, navigate away
            if (window.location.pathname === `/chat/${pendingDeleteId}`) {
                router.push("/chat");
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Please try again.";
            console.error("[HistoryPage] delete error:", err);
            toast.error("Failed to delete chat", { description: message });
        } finally {
            setIsDeleting(false);
            setPendingDeleteId(null);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Chat History</h1>
                    {!isLoading && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {total} conversation{total !== 1 ? "s" : ""}
                        </p>
                    )}
                </div>
                <Button asChild size="sm">
                    <Link href="/chat">
                        <PlusIcon className="size-4" />
                        New Chat
                    </Link>
                </Button>
            </div>

            {/* Chat list */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Shimmer className="text-sm" duration={1.5}>
                        Loading chat history…
                    </Shimmer>
                </div>
            ) : chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                    <MessageSquareIcon className="size-10 opacity-30" />
                    <p className="text-sm">No conversations yet.</p>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/chat">Start a new chat</Link>
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col divide-y rounded-xl border overflow-hidden">
                    {chats.map((chat) => (
                        <ChatHistoryRow
                            key={chat.id}
                            chat={chat}
                            onDeleteRequest={() => setPendingDeleteId(chat.id)}
                        />
                    ))}
                </div>
            )}

            {/* Load more */}
            {!isLoading && chats.length < total && (
                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                    >
                        {isLoadingMore ? "Loading…" : "Load more"}
                    </Button>
                </div>
            )}

            {/* Delete confirmation */}
            <Dialog
                open={pendingDeleteId !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingDeleteId(null);
                }}
            >
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>Delete chat?</DialogTitle>
                        <DialogDescription>
                            {pendingChat
                                ? `"${pendingChat.title}" will be permanently deleted.`
                                : "This chat will be permanently deleted."}
                            {" "}This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPendingDeleteId(null)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting…" : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Single row in the history list
// ─────────────────────────────────────────────────────────

function ChatHistoryRow({
    chat,
    onDeleteRequest,
}: {
    chat: ChatInfo;
    onDeleteRequest: () => void;
}) {
    const timeAgo = React.useMemo(() => {
        try {
            const date = new Date(chat.updated_at);
            const diff = Date.now() - date.getTime();
            const mins = Math.floor(diff / 60_000);
            if (mins < 1) return "just now";
            if (mins < 60) return `${mins}m ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            const days = Math.floor(hrs / 24);
            if (days < 30) return `${days}d ago`;
            return date.toLocaleDateString();
        } catch {
            return "";
        }
    }, [chat.updated_at]);

    return (
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group">
            <Link
                href={`/chat/${chat.id}`}
                className="flex-1 min-w-0 flex items-center gap-3"
            >
                <MessageSquareIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{chat.title}</p>
                    <p className="text-xs text-muted-foreground">
                        {chat.message_count} message{chat.message_count !== 1 ? "s" : ""} · {timeAgo}
                    </p>
                </div>
            </Link>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    onDeleteRequest();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                aria-label={`Delete "${chat.title}"`}
            >
                <Trash2Icon className="size-3.5" />
            </button>
        </div>
    );
}