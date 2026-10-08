import {
  Brain,
  BrainCircuit,
  Command,
  BookOpen,
  Settings,
  Sparkles,
  Wand2,
  Layers,
  type LucideIcon,
} from "lucide-react";

export interface SidebarSubItem {
  title: string;
  url: string;
}

export interface SidebarProjectItem {
  name: string;
  url: string;
  icon: LucideIcon;
  items?: SidebarSubItem[];
}

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
  ],
  projects: [
    {
      name: "My Library",
      url: "/library",
      icon: BookOpen,
      items: [
        {
          title: "Documents",
          url: "/library",
        },
        {
          title: "Add Document",
          url: "/add-doc",
        },
      ],
    },
    {
      name: "Models",
      url: "/models",
      icon: BrainCircuit,
    },
    {
      name: "Humanizer",
      url: "/humanizer",
      icon: Wand2,
    },
    {
      name: "Shilpa Studio",
      url: "/shilpa",
      icon: Layers,
    },
    {
      name: "Settings",
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