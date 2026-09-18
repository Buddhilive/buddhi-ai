"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { type LucideIcon } from "lucide-react";
import { SIDEBAR_DATA } from "@/const/sidebar-data";
import { useChatStore } from "@/stores/chat-store";

export interface NavigationState {
  currentPage: string;
  breadcrumbTitle: string;
  navItems: Array<{
    title: string;
    url: string;
    icon: LucideIcon;
    isActive: boolean;
  }>;
}

export function useNavigation(): NavigationState {
  const pathname = usePathname();
  const { currentChat } = useChatStore();

  const navigationState = useMemo(() => {
    const currentPage = pathname;
    let breadcrumbTitle = "Ask Buddhi AI";

    const pathTitleMap: Record<string, string> = {
      "/": "Ask Buddhi AI",
      "/chat": "Ask Buddhi AI",
      "/library": "Paper Library",
      "/models": "Models",
      "/settings": "Settings",
    };

    if (pathname.startsWith("/chat/")) {
      breadcrumbTitle = "Chat";
      const segments = pathname.split("/").filter(Boolean);
      if (currentChat?.title) {
        breadcrumbTitle = currentChat.title;
      } else if (segments.length > 1 && segments[1]) {
        breadcrumbTitle = `Chat - ${segments[1]}`;
      }
    } else {
      breadcrumbTitle = pathTitleMap[pathname] || "Buddhi AI";
    }

    const navItems = SIDEBAR_DATA.navMain.map((item) => ({
      ...item,
      isActive:
        item.url === currentPage ||
        (item.url !== "/" && currentPage.startsWith(item.url)),
    }));

    return {
      currentPage,
      breadcrumbTitle,
      navItems,
    };
  }, [pathname, currentChat]);

  return navigationState;
}