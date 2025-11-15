"use client";

import {
  ArrowUpRight,
  MessageCircle,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useChatStore } from "@/stores/chatStore";
import Link from "next/link";
import { deleteItemFromStore } from "@/lib/indexeddb";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function NavFavorites({
  favorites,
}: {
  favorites: {
    name: string;
    url: string;
    emoji: string;
  }[];
}) {
  const { isMobile } = useSidebar();
  const { chatHistory, chatDB, setChatHistory } = useChatStore();
  const router = useRouter();

  const handleDelete = async (id: string) => {
    try {
      if (chatDB) await deleteItemFromStore(chatDB, "chats", id);
      setChatHistory(chatHistory.filter((chat) => chat.id !== id));
      toast.success("Chat deleted successfully");
      if (window.location.pathname === `/chat/${id}`) router.replace("/chat");
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast.error("Failed to delete chat");
    }
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden h-[calc(100vh-8rem)] overflow-auto">
      {chatHistory.length > 0 && <SidebarGroupLabel>Chat History</SidebarGroupLabel>}
      <SidebarMenu>
        {chatHistory.reverse().map((item) => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton asChild>
              <Link
                href={`/chat/${item.id}`}
                className="flex items-center gap-2"
              >
                <MessageCircle />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem>
                  <Link
                    href={`/chat/${item.id}`}
                    className="flex items-center gap-2"
                  >
                    <ArrowUpRight className="text-muted-foreground" />
                    <span>Open</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDelete(item.id)}>
                  <Trash2 className="text-muted-foreground" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        {/* <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70">
            <MoreHorizontal />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem> */}
      </SidebarMenu>
    </SidebarGroup>
  );
}
