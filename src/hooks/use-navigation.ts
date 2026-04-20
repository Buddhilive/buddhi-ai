"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { type LucideIcon } from "lucide-react";
import { Languages } from "lucide-react";
import { SIDEBAR_DATA } from "@/const/sidebar-data";
import { useChatStore } from "@/stores/chat-store";
import { useIsTranslateGemmaDownloaded } from "@/hooks/use-translate-engine";

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

/**
 * Custom hook for managing dynamic navigation state based on the current pathname.
 * 
 * This hook provides:
 * - Dynamic breadcrumb titles that update based on the current page
 * - Navigation items with proper active states
 * - Support for dynamic routes (like /summarizer/[docId] and /writer/[docId])
 * 
 * @returns NavigationState object containing current page info, breadcrumb title, and nav items
 */
export function useNavigation(): NavigationState {
    const pathname = usePathname();
    const { currentChat } = useChatStore();
    const isTranslatorAvailable = useIsTranslateGemmaDownloaded();

    const navigationState = useMemo(() => {
        // Determine current page and breadcrumb title based on pathname
        const currentPage = pathname;
        let breadcrumbTitle = "Ask Buddhi AI"; // Default for app layout

        // Map pathnames to breadcrumb titles
        const pathTitleMap: Record<string, string> = {
            "/chat": "Ask Buddhi AI",
            "/documents": "Documents",
            "/models": "Models",
            "/translator": "Translator",
        };

        // Handle dynamic routes and specific cases
        if (pathname.startsWith("/chat/")) {
            breadcrumbTitle = "Chat";

            const segments = pathname.split('/').filter(Boolean);
            if (currentChat?.title) {
                breadcrumbTitle = currentChat.title;
            } else if (segments.length > 1 && segments[1]) {
                breadcrumbTitle = `Chat - ${segments[1]}`;
            }
        } else {
            breadcrumbTitle = pathTitleMap[pathname] || "Ask Buddhi AI";
        }

        // Create navigation items with active state
        const staticNavItems = SIDEBAR_DATA.navMain.map((item) => ({
            ...item,
            isActive: item.url === currentPage,
        }));

        // Conditionally inject the Translator nav item when the model is downloaded.
        const translatorItem = isTranslatorAvailable
            ? [{
                title: "Translator",
                url: "/translator",
                icon: Languages as LucideIcon,
                isActive: currentPage === "/translator",
              }]
            : [];

        const navItems = [...staticNavItems, ...translatorItem];

        return {
            currentPage,
            breadcrumbTitle,
            navItems,
        };
    }, [pathname, currentChat, isTranslatorAvailable]);

    return navigationState;
}