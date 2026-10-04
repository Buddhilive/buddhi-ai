"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  Eye,
  FileCode2,
  GitCompare,
  Wand2,
  Sparkles,
} from "lucide-react";
import { useHumanizerStore } from "@/stores/humanizer-store";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { cjk } from "@streamdown/cjk";
import { calculateDocumentStats } from "@/lib/humanizer/markdown-ast";
import { HumanizerDiffViewer } from "./humanizer-diff-viewer";
import { HumanizerDiagnostics } from "./humanizer-diagnostics";
import { toast } from "sonner";

export function HumanizerPreview() {
  const {
    outputMarkdown,
    previewMode,
    setPreviewMode,
    activeTab,
    setActiveTab,
    diffResult,
  } = useHumanizerStore();

  const [copied, setCopied] = useState(false);
  const stats = calculateDocumentStats(outputMarkdown);

  const handleCopy = () => {
    if (!outputMarkdown) return;
    navigator.clipboard.writeText(outputMarkdown);
    setCopied(true);
    toast.success("Copied humanized Markdown to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-card border rounded-xl overflow-hidden shadow-sm">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b gap-2 text-xs">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Wand2 className="size-3.5 text-primary" />
          <span>Humanized Output</span>
          {outputMarkdown.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              {stats.wordCount.toLocaleString()} words
            </Badge>
          )}
        </div>

        {/* View toggles & actions */}
        <div className="flex items-center gap-1.5">
          {outputMarkdown.length > 0 && (
            <>
              {/* Tab toggles: Preview vs Diff */}
              <div className="flex items-center p-0.5 rounded-lg bg-muted border">
                <Button
                  variant={activeTab !== "diff" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 text-[11px] px-2 gap-1 rounded-md"
                  onClick={() => setActiveTab("preview")}
                >
                  <Eye className="size-3" />
                  <span>Preview</span>
                </Button>
                <Button
                  variant={activeTab === "diff" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 text-[11px] px-2 gap-1 rounded-md"
                  onClick={() => setActiveTab("diff")}
                >
                  <GitCompare className="size-3" />
                  <span>Diff</span>
                  {diffResult && diffResult.clichesPrunedCount > 0 && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-primary/10 border-primary/20 text-primary">
                      {diffResult.clichesPrunedCount}
                    </Badge>
                  )}
                </Button>
              </div>

              {/* Sub-toggle: Rendered vs Raw Markdown */}
              {activeTab !== "diff" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 gap-1"
                  onClick={() => setPreviewMode(previewMode === "rendered" ? "raw" : "rendered")}
                  title={previewMode === "rendered" ? "Switch to raw markdown" : "Switch to rendered HTML"}
                >
                  {previewMode === "rendered" ? (
                    <>
                      <FileCode2 className="size-3" />
                      <span className="hidden sm:inline">Raw</span>
                    </>
                  ) : (
                    <>
                      <Eye className="size-3" />
                      <span className="hidden sm:inline">Rendered</span>
                    </>
                  )}
                </Button>
              )}

              {/* Copy Markdown */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5 gap-1.5 font-medium"
                onClick={handleCopy}
              >
                {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Preview Content Area */}
      <div className="flex-1 p-4 min-h-0 overflow-y-auto">
        {outputMarkdown.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
            <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
              <Sparkles className="size-6" />
            </div>
            <h4 className="font-semibold text-sm text-foreground mb-1">Humanizer Output Studio</h4>
            <p className="text-xs max-w-sm leading-relaxed mb-4">
              Paste your AI draft on the left and trigger humanization. Your result with preserved code fences and syntactic burstiness will appear here.
            </p>
          </div>
        ) : activeTab === "diff" ? (
          <div className="space-y-4">
            <HumanizerDiagnostics />
            <HumanizerDiffViewer />
          </div>
        ) : previewMode === "raw" ? (
          <pre className="font-mono text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed text-foreground p-2">
            {outputMarkdown}
          </pre>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
            <Streamdown
              plugins={{
                code,
                math,
                mermaid,
                cjk,
              }}
            >
              {outputMarkdown}
            </Streamdown>
          </div>
        )}
      </div>
    </div>
  );
}
