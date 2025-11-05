import {
  Calendar,
  Command,
  Home,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

export const SIDEBAR_DATA = {
  teams: [
    {
      name: "Buddhi AI",
      logo: Command,
      plan: "AI in Browser",
      url: "#",
    },
    {
      name: "Buddhilive",
      logo: Command,
      plan: "Return to home",
      url: "https://buddhilive.com",
    },
  ],
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: Home,
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Ask AI",
      url: "/chat",
      icon: Sparkles,
      isActive: true,
    }
  ],
  navSecondary: [
    {
      title: "Calendar",
      url: "#",
      icon: Calendar,
    },
  ],
  favorites: [
    {
      name: "Project Management & Task Tracking",
      url: "#",
      emoji: "📊",
    },
  ],
  workspaces: [
    {
      name: "Personal Life Management",
      emoji: "🏠",
      pages: [
        {
          name: "Daily Journal & Reflection",
          url: "#",
          emoji: "📔",
        },
      ],
    },
  ],
}