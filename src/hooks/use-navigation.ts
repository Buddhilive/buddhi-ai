"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { type LucideIcon } from "lucide-react";
import { SIDEBAR_DATA } from "@/const/sidebar-data";

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

  const navigationState = useMemo(() => {
    // Determine current page and breadcrumb title based on pathname
    let currentPage = pathname;
    let breadcrumbTitle = "Dashboard"; // Default for app layout

    // Map pathnames to breadcrumb titles
    const pathTitleMap: Record<string, string> = {
      "/dashboard": "Dashboard", 
      "/chat": "Ask AI",
      "/summarizer": "Summarizer",
      "/writer": "Writer",
    };

    // Handle dynamic routes and specific cases
    if (pathname.startsWith("/summarizer")) {
      breadcrumbTitle = "Summarizer";
      currentPage = "/summarizer";
      
      // Check if there's a document ID for more specific breadcrumb
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 1 && segments[1]) {
        breadcrumbTitle = `Summarizer - ${segments[1]}`;
      }
    } else if (pathname.startsWith("/writer")) {
      breadcrumbTitle = "Writer";
      currentPage = "/writer";
      
      // Check if there's a document ID for more specific breadcrumb
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 1 && segments[1]) {
        breadcrumbTitle = `Writer - ${segments[1]}`;
      }
    } else if (pathTitleMap[pathname]) {
      breadcrumbTitle = pathTitleMap[pathname];
      currentPage = pathname;
    }

    // Create navigation items with active state
    const navItems = SIDEBAR_DATA.navMain.map(item => ({
      ...item,
      isActive: item.url === currentPage
    }));

    return {
      currentPage,
      breadcrumbTitle,
      navItems
    };
  }, [pathname]);

  return navigationState;
}