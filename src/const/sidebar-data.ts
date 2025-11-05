import {
  Brain,
  Calendar,
  Command,
  Home,
  LayoutDashboard,
  PenTool,
  Sparkles,
  TextWrap,
} from "lucide-react";

export const SIDEBAR_DATA = {
  teams: [
    {
      name: "Buddhi AI",
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
      title: "Home",
      url: "/",
      icon: Home,
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Ask AI",
      url: "/chat",
      icon: Sparkles,
    },
    {
      title: "Summarizer",
      url: "/summarizer",
      icon: TextWrap,
    },
    {
      title: "Writer",
      url: "/writer",
      icon: PenTool,
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