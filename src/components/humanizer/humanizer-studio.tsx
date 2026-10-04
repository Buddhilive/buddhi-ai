"use client";

import React, { useRef } from "react";
import { HumanizerEditor } from "./humanizer-editor";
import { HumanizerPreview } from "./humanizer-preview";
import { HumanizerControls } from "./humanizer-controls";
import { HumanizerProgress } from "./humanizer-progress";
import { useHumanizerStore } from "@/stores/humanizer-store";
import { useLiteRTModelStore } from "@/stores/litert-store";
import { executeSinglePass } from "@/lib/humanizer/single-pass";
import { executeRLMHumanizer, RLM_TOKEN_THRESHOLD } from "@/lib/humanizer/rlm-humanizer";
import { calculateDocumentStats } from "@/lib/humanizer/markdown-ast";
import { analyzeDiff } from "@/lib/humanizer/diff-analyzer";
import { toast } from "sonner";

export function HumanizerStudio() {
  const {
    rawInput,
    config,
    stage,
    setStage,
    setOutputMarkdown,
    setError,
    setDiffResult,
    setRLMContext,
  } = useHumanizerStore();

  const liteRTInstance = useLiteRTModelStore((s) => s.liteRTModelInstance);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStage("idle", "Humanization cancelled.");
    toast.info("Humanization process stopped.");
  };

  const handleExecute = async () => {
    if (!rawInput.trim()) {
      toast.error("Please enter or paste text to humanize.");
      return;
    }

    if (!liteRTInstance) {
      toast.error("No LiteRT model is loaded. Please load a model from the Models tab.");
      return;
    }

    // Initialize abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const stats = calculateDocumentStats(rawInput);
    const useRLM = stats.estimatedTokens > RLM_TOKEN_THRESHOLD;

    try {
      let finalMarkdown = "";

      if (useRLM) {
        setStage("analyzing", "Partitioning document structure for RLM execution...", 5);

        const rlmResult = await executeRLMHumanizer({
          engine: liteRTInstance,
          markdown: rawInput,
          config,
          signal,
          onProgress: (ctx) => {
            setRLMContext(ctx);
            setStage(
              ctx.stage,
              ctx.stage === "analyzing"
                ? "Analyzing document sections..."
                : ctx.stage === "processing"
                ? `Rewriting section ${ctx.currentChunkIndex + 1} of ${ctx.totalChunks}...`
                : ctx.stage === "reassembling"
                ? "Reassembling complete humanized document..."
                : "Complete",
              ctx.progressPercent
            );
          },
        });

        finalMarkdown = rlmResult.outputMarkdown;
      } else {
        setStage("processing", "Synthesizing natural cadence and removing tropes...", 25);

        const singleResult = await executeSinglePass({
          engine: liteRTInstance,
          markdown: rawInput,
          config,
          signal,
          onDelta: (_delta, accumulated) => {
            setOutputMarkdown(accumulated);
          },
        });

        finalMarkdown = singleResult.outputMarkdown;
      }

      setOutputMarkdown(finalMarkdown);
      setStage("completed", "Humanization completed successfully!", 100);

      // Compute stylometric diff & diagnostics
      try {
        const diff = analyzeDiff(rawInput, finalMarkdown);
        setDiffResult(diff);
      } catch (diffErr) {
        console.warn("[HumanizerStudio] Diff computation failed:", diffErr);
      }

      toast.success("Text humanized successfully!");
    } catch (err: unknown) {
      if (signal.aborted) {
        setStage("idle", "Humanization cancelled.");
      } else {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        toast.error(`Humanization failed: ${message}`);
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 min-h-0">
      {/* Top Controls Bar */}
      <HumanizerControls onExecute={handleExecute} onCancel={handleCancel} />

      {/* Progress Stepper (Active during processing or after error/complete) */}
      {stage !== "idle" && <HumanizerProgress />}

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Left Pane: Editor */}
        <div className="h-full min-h-[300px] lg:min-h-0">
          <HumanizerEditor />
        </div>

        {/* Right Pane: Preview & Diff */}
        <div className="h-full min-h-[300px] lg:min-h-0">
          <HumanizerPreview />
        </div>
      </div>
    </div>
  );
}
