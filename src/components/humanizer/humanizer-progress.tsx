"use client";

import React from "react";
import { useHumanizerStore } from "@/stores/humanizer-store";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function HumanizerProgress() {
  const { stage, currentStageMessage, progressPercent, errorMessage, rlmContext } =
    useHumanizerStore();

  if (stage === "idle") return null;

  const isCompleted = stage === "completed";
  const isError = stage === "error";

  return (
    <div className="w-full bg-card border rounded-lg p-3 shadow-xs space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium">
          {isCompleted ? (
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
          ) : isError ? (
            <AlertCircle className="size-4 text-destructive shrink-0" />
          ) : (
            <Loader2 className="size-4 text-primary animate-spin shrink-0" />
          )}
          <span className="text-foreground">
            {isError ? "Humanization Failed" : isCompleted ? "Humanization Complete" : "Humanizing Text"}
          </span>
          {rlmContext && rlmContext.totalChunks > 1 && (
            <span className="text-muted-foreground text-[11px]">
              (RLM Section {rlmContext.currentChunkIndex + 1} of {rlmContext.totalChunks})
            </span>
          )}
        </div>
        <span className="text-muted-foreground font-mono text-[11px]">
          {Math.round(progressPercent)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isError ? "bg-destructive" : isCompleted ? "bg-emerald-500" : "bg-primary"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
        />
      </div>

      {/* Status / Error Message */}
      <p className="text-[11px] text-muted-foreground truncate">
        {errorMessage || currentStageMessage || "Processing transformation..."}
      </p>
    </div>
  );
}
