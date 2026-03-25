"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
/* import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user"; */
/* import { NavChatHistory } from "@/components/nav-chat-history" */
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { GalleryVerticalEndIcon, BotIcon, BookOpenIcon, Settings2Icon, FrameIcon, PieChartIcon, MapIcon, DatabaseIcon, MessageSquarePlusIcon } from "lucide-react"
/* import { useChatStore } from "@/store/chatStore" */

// This is sample data.
const data = {
  user: {
    name: "",
    email: "",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Buddhi AI",
      logo: (
        <GalleryVerticalEndIcon
        />
      ),
      plan: "Studio",
    },
  ],
  navMain: [
    {
      title: "New Chat",
      url: "/chat",
      icon: (
        <MessageSquarePlusIcon
        />
      ),
    },
    {
      title: "Models",
      url: "/models",
      icon: (
        <BotIcon
        />
      ),
    },
    {
      title: "Knowledge Base",
      url: "/documents",
      icon: (
        <DatabaseIcon
        />
      ),
    },
    /* {
      title: "Settings",
      url: "#",
      icon: (
        <Settings2Icon
        />
      ),
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    }, */
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: (
        <FrameIcon
        />
      ),
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  /* const { fetchChats } = useChatStore() */

  // Load recent chats on mount
  /* React.useEffect(() => {
    fetchChats()
  }, [fetchChats]) */

  const navItems = data.navMain.map((item) => ({
    ...item,
    // "New Chat" (/chat) is only active on the exact path, not on /chat/123
    isActive:
      item.url === "/chat"
        ? pathname === "/chat"
        : pathname === item.url || pathname.startsWith(item.url + "/"),
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        {/* <NavChatHistory /> */}
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        {/* <NavUser user={data.user} /> */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
