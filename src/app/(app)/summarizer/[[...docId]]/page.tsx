"use client";

import { Button } from "@/components/ui/button";
import { Copy, FileText, Languages, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { getSummarizer, isSummarizerAvailable } from "@/lib/summarizer";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SummarizerPage() {
  const [originalText, setOriginalText] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSummarize = async () => {
    setIsLoading(true);
    const isAvailable = await isSummarizerAvailable();
    if (!isAvailable) {
      console.error("Summarizer is not available");
      setIsLoading(false);
      return;
    }

    try {
      const summarizer = await getSummarizer({
        sharedContext: "",
        type: "key-points",
        format: "markdown",
        length: "medium",
        monitor(m) {
          m.addEventListener("downloadprogress", (e: any) => {
            console.log("Summarization progress:", `${e.loaded * 100}%`);
          });
        },
      });

      const summary = await summarizer.summarize(originalText);
      setSummaryText(summary);
      setIsLoading(false);
    } catch (error) {
      console.error("Error during summarization:", error);
      toast.error("An error occurred during summarization.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-58px)] bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">
            Document Summarizer
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {summaryText && (
            <div className="border-r-2 px-2 flex items-center justify-between gap-2">
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>

              <Button
                className="flex items-center gap-2"
                onClick={handleSummarize}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <Languages className="h-4 w-4" />
                    Translate
                  </>
                )}
              </Button>
            </div>
          )}
          <Button
            className="flex items-center gap-2"
            onClick={handleSummarize}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Summarizing...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Summarize
              </>
            )}
          </Button>
        </div>
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
              disabled={isLoading}
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
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
              value={summaryText}
              placeholder="Your AI-generated summary will appear here..."
              className="h-full resize-none border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
              readOnly
            />
            {/* Floating Copy Button */}
            {summaryText && (
              <Button
                size="sm"
                variant="ghost"
                title="Copy"
                onClick={() => {
                  navigator.clipboard.writeText(summaryText);
                  toast.info("Content copied to clipboard");
                }}
                className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90 border border-border"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
