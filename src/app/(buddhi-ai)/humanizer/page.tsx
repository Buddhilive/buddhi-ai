import React from "react";
import { HumanizerStudio } from "@/components/humanizer/humanizer-studio";

export const metadata = {
  title: "Text Humanizer Studio - Buddhi AI",
  description: "Eliminate formulaic AI markers, vary syntactic cadence, and humanize Markdown drafts with local in-browser Gemma.",
};

export default function HumanizerPage() {
  return (
    <div className="flex-1 min-h-0 h-full w-full p-3 md:p-4 max-w-7xl mx-auto flex flex-col overflow-hidden box-border">
      <HumanizerStudio />
    </div>
  );
}
