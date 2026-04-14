"use client"

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2Icon, HistoryIcon, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuAction,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { chatsApi } from "@/lib/chat-manager";
import { useChatStore } from "@/stores/chat-store";
import type { ChatInfo } from "@/types/chat";

export function NavChatHistory() {
    const router = useRouter()
    const {
        chats,
        total,
        currentChatId,
        isLoading,
        setChats,
        setTotal,
        setIsLoading,
        refreshChats,
    } = useChatStore()

    // Which chat id is pending deletion confirmation
    const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const pendingChat = chats.find((c) => c.id === pendingDeleteId) ?? null

    // Load chats on mount
    React.useEffect(() => {
        setIsLoading(true)
        chatsApi
            .list(10, 0)
            .then(({ chats: data, total: t }) => {
                setChats(data)
                setTotal(t)
            })
            .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : "Please try again."
                console.error("[NavChatHistory] load error:", err)
                toast.error("Failed to load chat history", { description: message })
            })
            .finally(() => setIsLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleDeleteConfirm = async () => {
        if (pendingDeleteId === null) return
        const deletedId = pendingDeleteId
        setIsDeleting(true)
        setPendingDeleteId(null)
        try {
            await chatsApi.delete(deletedId)
            toast.success("Chat deleted")
            // Re-fetch the first page so the next most-recent chat fills the slot.
            // Using refreshChats() instead of just filtering locally ensures the list
            // always shows up to 10 items and the total count stays accurate.
            await refreshChats()
            // If we just deleted the currently-open chat, go back to new chat
            if (currentChatId === deletedId) {
                router.push("/chat")
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Please try again."
            console.error("[NavChatHistory] delete error:", err)
            toast.error("Failed to delete chat", { description: message })
            // Restore accurate state in case of partial failure
            await refreshChats()
        } finally {
            setIsDeleting(false)
        }
    }

    if (isLoading) return null
    if (chats.length === 0) return null

    return (
        <>
            <SidebarGroup>
                <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
                <SidebarMenu>
                    {chats.map((chat) => (
                        <ChatHistoryItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === currentChatId}
                            onDeleteRequest={() => setPendingDeleteId(chat.id)}
                        />
                    ))}

                    {total > 10 && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <Link href="/history" className="text-muted-foreground text-xs">
                                    <HistoryIcon className="size-3.5" />
                                    <span>View more…</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarGroup>

            {/* Delete confirmation dialog */}
            <Dialog
                open={pendingDeleteId !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingDeleteId(null)
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
        </>
    )
}

// ─────────────────────────────────────────────────────────
// Single chat history item
// ─────────────────────────────────────────────────────────

function ChatHistoryItem({
    chat,
    isActive,
    onDeleteRequest,
}: {
    chat: ChatInfo
    isActive: boolean
    onDeleteRequest: () => void
}) {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={chat.title}
            >
                <Link href={`/chat/${chat.id}`}>
                    <MessageCircle />
                    <span className="truncate">{chat.title}</span>
                </Link>
            </SidebarMenuButton>
            <SidebarMenuAction
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDeleteRequest()
                }}
                aria-label={`Delete "${chat.title}"`}
                showOnHover
            >
                <Trash2Icon className="size-3.5 text-muted-foreground hover:text-destructive transition-colors" />
            </SidebarMenuAction>
        </SidebarMenuItem>
    )
}