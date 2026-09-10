import {
    Brain,
    BrainCircuit,
    Command,
    Sparkles,
} from "lucide-react";

export const SIDEBAR_DATA = {
    teams: [
        {
            name: "Buddhi Vibe",
            logo: Brain,
            plan: "Next.js Vibe Coding",
            url: "/",
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
            title: "Models",
            url: "/models",
            icon: BrainCircuit,
        },
    ],
    navSecondary: [
        {
            title: "Models",
            url: "/models",
            icon: BrainCircuit,
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