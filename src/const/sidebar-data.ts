import {
  Brain,
  Calendar,
  Command,
  Sparkles,
} from "lucide-react";

export const SIDEBAR_DATA = {
  teams: [
    {
      name: "BuddhiAI",
      logo: Brain,
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
      title: "New Chat",
      url: "/chat",
      icon: Sparkles,
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