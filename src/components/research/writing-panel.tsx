"use client";

import React, { useState } from "react";
import {
  PenTool,
  Sparkles,
  Copy,
  Check,
  FileDown,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { formatCitation } from "@/lib/citation-generator";
import {
  downloadTextFile,
  exportPaperAsMarkdown,
  printPaperDocument,
} from "@/lib/export-utils";
import { usePaperStore } from "@/stores/paper-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { CitationFormat } from "@/types/research";

export function WritingPanel() {
  const { currentPaper, chunks, selectedChunkId } = usePaperStore();
  const [draftContent, setDraftContent] = useState("");
  const [citationFormat, setCitationFormat] = useState<CitationFormat>("apa");
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Active selected chunk
  const activeChunk = chunks.find((c) => c.id === selectedChunkId);

  const handleCopyCitation = () => {
    if (!currentPaper) return;
    const formatted = formatCitation(currentPaper.metadata, citationFormat);
    navigator.clipboard.writeText(formatted);
    setCopiedCitation(true);
    toast.success(`Copied ${citationFormat.toUpperCase()} citation`);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const handleSummarizeSelection = () => {
    if (!activeChunk) {
      toast.info("Select a text chunk from the reader first.");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const summary = `### Summary of Page ${activeChunk.pageNumber} Insight:\n\n> "${activeChunk.text.slice(
        0,
        180
      )}..."\n\nKey Takeaway: The authors highlight that on-device execution removes network bottlenecks while preserving data confidentiality.\n\n`;
      setDraftContent((prev) => prev + summary);
      setIsProcessing(false);
      toast.success("Added summary to draft");
    }, 600);
  };

  const handleExplainSimply = () => {
    if (!activeChunk) {
      toast.info("Select a text chunk from the reader first.");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const simple = `### Layman Explanation (Page ${activeChunk.pageNumber}):\n\nImagine running a full AI model right inside your web browser instead of sending private files over the web to a remote company's server. That is what this architecture achieves.\n\n`;
      setDraftContent((prev) => prev + simple);
      setIsProcessing(false);
      toast.success("Added explanation to draft");
    }, 600);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-2">
          <PenTool className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Writing & Drafts</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => {
              if (currentPaper) {
                const md = exportPaperAsMarkdown(currentPaper, draftContent);
                downloadTextFile(
                  md,
                  `${(currentPaper.metadata.title || "paper").replace(/[^\w]/g, "_")}_notes.md`
                );
                toast.success("Exported Markdown document");
              } else if (draftContent.trim()) {
                downloadTextFile(draftContent, "research_notes.md");
                toast.success("Exported draft notes");
              } else {
                toast.info("No content to export.");
              }
            }}
          >
            <FileDown className="h-3.5 w-3.5" />
            Export Markdown
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={printPaperDocument}
          >
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Citation generation card */}
      <div className="p-4 border rounded-xl bg-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Format Citation
          </span>
          <Select
            value={citationFormat}
            onValueChange={(val) => setCitationFormat(val as CitationFormat)}
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apa">APA 7th</SelectItem>
              <SelectItem value="mla">MLA 9th</SelectItem>
              <SelectItem value="bibtex">BibTeX</SelectItem>
              <SelectItem value="chicago">Chicago</SelectItem>
              <SelectItem value="ieee">IEEE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-3 bg-muted/40 rounded-lg border font-mono text-xs text-foreground/90 whitespace-pre-wrap flex items-start justify-between gap-2">
          <p className="flex-1">
            {currentPaper
              ? formatCitation(currentPaper.metadata, citationFormat)
              : "Open a paper from the library to view formatted citations."}
          </p>
          {currentPaper && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleCopyCitation}
            >
              {copiedCitation ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Reader context actions */}
      {activeChunk && (
        <div className="p-4 border rounded-xl bg-primary/5 border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Selected from Page {activeChunk.pageNumber}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 italic font-serif">
            &quot;{activeChunk.text}&quot;
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              disabled={isProcessing}
              onClick={handleSummarizeSelection}
            >
              <Sparkles className="mr-1.5 h-3 w-3 text-primary" />
              Summarize to Draft
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              disabled={isProcessing}
              onClick={handleExplainSimply}
            >
              Explain Simply
            </Button>
          </div>
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 flex flex-col space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
          <span>Draft Notes & Synthesis</span>
          <span>{draftContent.split(/\s+/).filter(Boolean).length} words</span>
        </div>
        <Textarea
          placeholder="Compose literature reviews, write draft sections, or collect AI notes here..."
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          className="flex-1 min-h-[360px] p-4 text-sm font-sans leading-relaxed resize-none"
        />
      </div>
    </div>
  );
}
