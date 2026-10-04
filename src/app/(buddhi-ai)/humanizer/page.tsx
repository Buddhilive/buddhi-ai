import React from "react";
import { HumanizerStudio } from "@/components/humanizer/humanizer-studio";

export const metadata = {
  title: "Text Humanizer Studio - Buddhi AI",
  description: "Eliminate formulaic AI markers, vary syntactic cadence, and humanize Markdown drafts with local in-browser Gemma.",
};

export default function HumanizerPage() {
  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full h-[calc(100vh-4rem)] flex flex-col min-h-0">
      <HumanizerStudio />
    </div>
  );
}
