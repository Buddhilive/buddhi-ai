"use client";

import { Button } from "@/components/ui/button";
import { Copy, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function SummarizerPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-58px)] bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Document Summarizer</h1>
        </div>
        <Button className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Summarize
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 min-h-0">
        {/* Left Section - Input Text */}
        <div className="flex-1 flex flex-col">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Original Text
          </h2>
          <div className="flex-1 relative">
            <Textarea
              placeholder="Paste or type your text here to summarize..."
              className="h-full resize-none border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        {/* Right Section - Summarized Content */}
        <div className="flex-1 flex flex-col">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            AI Summary
          </h2>
          <div className="flex-1 relative">
            <Textarea
              placeholder="Your AI-generated summary will appear here..."
              className="h-full resize-none border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
              readOnly
            />
            {/* Floating Copy Button */}
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90 border border-border"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
