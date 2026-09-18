import {
  Brain,
  BrainCircuit,
  Command,
  BookOpen,
  Settings,
  Sparkles,
} from "lucide-react";

export const SIDEBAR_DATA = {
  teams: [
    {
      name: "Buddhi AI",
      logo: Brain,
      plan: "Academic Research Platform",
      url: "/library",
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
    },
    {
      title: "Library",
      url: "/library",
      icon: BookOpen,
    },
    {
      title: "Models",
      url: "/models",
      icon: BrainCircuit,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
  navSecondary: [
    {
      title: "Models",
      url: "/models",
      icon: BrainCircuit,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
  favorites: [],
  workspaces: [],
};