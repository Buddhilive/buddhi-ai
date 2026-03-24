"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2Icon, HistoryIcon } from "lucide-react"
import { toast } from "sonner"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { chatsApi, type ChatInfo } from "@/lib/api/chats"
import { useChatStore } from "@/store/chatStore"

export function NavChatHistory() {
  const router = useRouter()
  const { chats, total, currentChatId, isLoading, removeChat } = useChatStore()

  // Which chat id is pending deletion confirmation
  const [pendingDeleteId, setPendingDeleteId] = React.useState<number | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const pendingChat = chats.find((c) => c.id === pendingDeleteId) ?? null

  const handleDeleteConfirm = async () => {
    if (pendingDeleteId === null) return
    setIsDeleting(true)
    try {
      await chatsApi.delete(pendingDeleteId)
      removeChat(pendingDeleteId)
      toast.success("Chat deleted")
      // If we just deleted the current chat, navigate to new chat
      if (currentChatId === pendingDeleteId) {
        router.push("/chat")
      }
    } catch (err: any) {
      console.error("[NavChatHistory] delete error:", err)
      toast.error("Failed to delete chat", {
        description: err?.message ?? "Please try again.",
      })
    } finally {
      setIsDeleting(false)
      setPendingDeleteId(null)
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
