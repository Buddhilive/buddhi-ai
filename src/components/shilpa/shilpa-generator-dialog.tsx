"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Play } from "lucide-react";
import type { ShilpaSection } from "@/types/shilpa";
import { generateChapterLesson } from "@/lib/shilpa/beat-generator";
import { getCachedBookPdf } from "@/lib/shilpa/storage";
import { useShilpaStore } from "@/stores/shilpa-store";

interface ShilpaGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  bookTitle: string;
  chapter: ShilpaSection;
  onSuccess?: () => void;
}

export function ShilpaGeneratorDialog({
  open,
  onOpenChange,
  bookId,
  bookTitle,
  chapter,
  onSuccess,
}: ShilpaGeneratorDialogProps) {
  const { updateSection, setActiveTab } = useShilpaStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartGeneration = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setIsDone(false);
      setProgressPercent(10);
      setStatusMessage("Loading chapter source materials...");

      const pdfBuffer = await getCachedBookPdf(bookId);

      const result = await generateChapterLesson({
        bookId,
        bookTitle,
        section: chapter,
        pdfBuffer,
        onProgress: (p) => {
          setProgressPercent(p.progressPercent);
          setStatusMessage(p.message);
        },
      });

      await updateSection(bookId, chapter.folder, {
        status: "ready",
        storyboard: result.storyboard,
        scriptContent: result.scriptContent,
      });

      setIsDone(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("[shilpa-generator] Generation failed:", err);
      setError(err?.message || "Failed to generate lesson. Please retry.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenPlayer = () => {
    onOpenChange(false);
    setActiveTab("player");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              AI Lesson Generator
            </span>
          </div>
          <DialogTitle className="text-lg font-bold">
            Generate Chapter {chapter.chapterNumber}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Convert &quot;{chapter.title}&quot; (pages {chapter.startPage}–{chapter.endPage}) into an animated lesson with synchronized narration and quiz checks.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          {/* Progress / Status */}
          {(isGenerating || isDone) && (
            <div className="flex flex-col gap-2 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">{statusMessage}</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {progressPercent}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-2 bg-zinc-800" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {isDone && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Lesson generated and saved to your local browser library!</span>
            </div>
          )}

          {!isGenerating && !isDone && (
            <div className="flex flex-col gap-2 text-xs text-zinc-400 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/60">
              <span className="font-semibold text-zinc-200">What happens next:</span>
              <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                <li>Extracts text from PDF pages {chapter.startPage} to {chapter.endPage}</li>
                <li>Plans visual models (SVG tweens, diagram changes)</li>
                <li>Drafts narration with timing triggers</li>
                <li>Generates interactive comprehension checks</li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </Button>

          {isDone ? (
            <Button
              size="sm"
              onClick={handleOpenPlayer}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Play Lesson Now
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleStartGeneration}
              disabled={isGenerating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Lesson
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
