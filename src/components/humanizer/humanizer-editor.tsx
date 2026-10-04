"use client";

import React, { useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ClipboardPaste,
  Trash2,
  Sparkles,
  Layers,
  Code,
} from "lucide-react";
import { useHumanizerStore } from "@/stores/humanizer-store";
import { calculateDocumentStats } from "@/lib/humanizer/markdown-ast";
import { toast } from "sonner";

const SAMPLE_AI_MARKDOWN = `# The Comprehensive Paradigm of Machine Cognition

In conclusion, it is important to note that artificial intelligence serves as a testament to human ingenuity. Furthermore, navigating the complex landscape of neural networks delves into uncharted computational frontiers.

Moreover, machine learning algorithms play a pivotal role in today's fast-paced world, harnessing the power of deep learning to drive innovation:

\`\`\`python
def evaluate_loss(predictions, targets):
    # Loss computation remains mathematically rigorous
    return sum((p - t) ** 2 for p, t in zip(predictions, targets))
\`\`\`

First and foremost, at the end of the day, researchers must remember that balanced architectures foster robust generalizability across diverse empirical domains.`;

export function HumanizerEditor() {
  const { rawInput, setRawInput, clearInput, stage } = useHumanizerStore();
  const isBusy = stage === "analyzing" || stage === "processing" || stage === "reassembling";

  const stats = useMemo(() => calculateDocumentStats(rawInput), [rawInput]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawInput(text);
        toast.success("Pasted text from clipboard");
      }
    } catch {
      toast.error("Clipboard permission denied or unavailable");
    }
  };

  const handleLoadSample = () => {
    setRawInput(SAMPLE_AI_MARKDOWN);
    toast.info("Loaded sample AI draft with code fence");
  };

  return (
    <div className="flex flex-col h-full bg-card border rounded-xl overflow-hidden shadow-sm">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b gap-2 text-xs">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <FileText className="size-3.5 text-primary" />
          <span>Original Draft</span>
          {stats.wordCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              {stats.wordCount.toLocaleString()} words
            </Badge>
          )}
          {stats.codeBlockCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal gap-1 hidden sm:inline-flex">
              <Code className="size-2.5" />
              {stats.codeBlockCount} code {stats.codeBlockCount === 1 ? "block" : "blocks"}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 gap-1"
            onClick={handleLoadSample}
            disabled={isBusy}
            title="Load sample text with AI markers"
          >
            <Sparkles className="size-3 text-muted-foreground" />
            <span className="hidden sm:inline">Sample</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 gap-1"
            onClick={handlePaste}
            disabled={isBusy}
            title="Paste from clipboard"
          >
            <ClipboardPaste className="size-3 text-muted-foreground" />
            <span className="hidden sm:inline">Paste</span>
          </Button>

          {rawInput.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-destructive hover:text-destructive"
              onClick={clearInput}
              disabled={isBusy}
              title="Clear input"
            >
              <Trash2 className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 p-3 min-h-0 relative">
        <Textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="Paste AI-generated prose or Markdown document here... (Markdown headers, code fences, and tables will be preserved verbatim)"
          disabled={isBusy}
          className="w-full h-full resize-none font-mono text-xs sm:text-sm leading-relaxed border-0 shadow-none focus-visible:ring-0 p-1 bg-transparent"
        />
      </div>

      {/* Editor Footer / Stats */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-t text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{stats.charCount.toLocaleString()} chars</span>
          <span>~{stats.estimatedTokens.toLocaleString()} tokens</span>
        </div>
        {stats.estimatedTokens > 3000 && (
          <div className="flex items-center gap-1 text-primary font-medium">
            <Layers className="size-3" />
            <span>RLM Partitioning Active (&gt;3k tokens)</span>
          </div>
        )}
      </div>
    </div>
  );
}
