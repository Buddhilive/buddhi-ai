import {
  Calendar,
  Command,
  Home,
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
  ],
  navMain: [
    {
      title: "Home",
      url: "#",
      icon: Home,
    },
    {
      title: "Ask AI",
      url: "#",
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