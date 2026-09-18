import React from "react";
import { WritingPanel } from "@/components/research/writing-panel";

export const metadata = {
  title: "Writing & Drafts - Buddhi AI Research",
  description: "Draft scholarly papers, synthesize notes, and generate citations.",
};

export default function WritingPage() {
  return (
    <div className="flex-1 p-6 md:p-8 max-w-5xl mx-auto h-[calc(100vh-4rem)]">
      <WritingPanel />
    </div>
  );
}
