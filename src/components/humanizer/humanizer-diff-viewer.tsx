"use client";

import React from "react";
import { useHumanizerStore } from "@/stores/humanizer-store";

export function HumanizerDiffViewer() {
  const { diffResult } = useHumanizerStore();

  if (!diffResult || diffResult.tokens.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic p-4 text-center">
        No diff information available.
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b">
        <span className="font-medium text-foreground">Interactive Word Diff</span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-500/20 border border-rose-500/30" />
            <span>Eliminated</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
            <span>Humanized Phrasing</span>
          </span>
        </div>
      </div>

      <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-mono select-text">
        {diffResult.tokens.map((token, idx) => {
          if (token.type === "removed") {
            return (
              <span
                key={idx}
                className="bg-rose-500/15 text-rose-800 dark:text-rose-300 line-through decoration-rose-500/50 px-0.5 rounded-xs mx-0.5 font-medium"
              >
                {token.value}
              </span>
            );
          }
          if (token.type === "added") {
            return (
              <span
                key={idx}
                className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-0.5 rounded-xs mx-0.5 font-medium"
              >
                {token.value}
              </span>
            );
          }
          return <span key={idx}>{token.value}</span>;
        })}
      </div>
    </div>
  );
}
