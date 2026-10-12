"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { type LucideIcon } from "lucide-react";
import { SIDEBAR_DATA } from "@/const/sidebar-data";
import { useChatStore } from "@/stores/chat-store";

export interface NavigationSubItem {
  title: string;
  url: string;
  isActive: boolean;
}

export interface NavigationProjectItem {
  name: string;
  url: string;
  icon: LucideIcon;
  isActive: boolean;
  items?: NavigationSubItem[];
}

export interface NavigationState {
  currentPage: string;
  breadcrumbTitle: string;
  navItems: Array<{
    title: string;
    url: string;
    icon: LucideIcon;
    isActive: boolean;
  }>;
  projectItems: NavigationProjectItem[];
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
      "/add-doc": "Add Document",
      "/models": "Models",
      "/settings": "Settings",
      "/humanizer": "Text Humanizer Studio",
    };

    if (pathname.startsWith("/chat/")) {
      breadcrumbTitle = "Chat";
      const segments = pathname.split("/").filter(Boolean);
      if (currentChat?.title) {
        breadcrumbTitle = currentChat.title;
      } else if (segments.length > 1 && segments[1]) {
        breadcrumbTitle = `Chat - ${segments[1]}`;
      }
    } else if (pathname.startsWith("/reader/")) {
      breadcrumbTitle = "Paper Reader";
    } else {
      breadcrumbTitle = pathTitleMap[pathname] || "Buddhi AI";
    }

    const navItems = SIDEBAR_DATA.navMain.map((item) => ({
      ...item,
      isActive:
        item.url === currentPage ||
        (item.url !== "/" && currentPage.startsWith(item.url)),
    }));

    const projectItems: NavigationProjectItem[] = SIDEBAR_DATA.projects.map((project) => {
      const { items, ...rest } = project;
      if (items && items.length > 0) {
        const subItems: NavigationSubItem[] = items.map((sub) => ({
          title: sub.title,
          url: sub.url,
          isActive:
            currentPage === sub.url ||
            (sub.url === "/library" && currentPage.startsWith("/reader/")),
        }));
        const isAnySubActive = subItems.some((sub) => sub.isActive);
        return {
          ...rest,
          isActive: isAnySubActive,
          items: subItems,
        };
      }

      return {
        ...rest,
        isActive:
          project.url === currentPage ||
          (project.url !== "/" && currentPage.startsWith(project.url)),
      };
    });

    return {
      currentPage,
      breadcrumbTitle,
      navItems,
      projectItems,
    };
  }, [pathname, currentChat]);

  return navigationState;
}