"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { RlmMetadata } from "@/types/research";

interface ExtendedContextBadgeProps {
  metadata?: RlmMetadata;
  className?: string;
}

export function ExtendedContextBadge({
  metadata,
  className = "",
}: ExtendedContextBadgeProps) {
  if (!metadata || !metadata.isRlm) {
    return null;
  }

  const tokenStr =
    metadata.costEstimateTokens > 0
      ? `~${(metadata.costEstimateTokens / 1000).toFixed(1)}k tokens`
      : "";

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}
      title={`Synthesized by in-browser WASM RLM engine across ${metadata.totalChunksAnalyzed} chunks in ${metadata.iterations} turns (${metadata.terminatedBy})`}
    >
      <Badge
        variant="secondary"
        className="gap-1 bg-primary/10 text-primary border-primary/20 text-[11px] font-medium py-0 px-2 h-5"
      >
        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
        <span>Extended Context (RLM)</span>
      </Badge>
      <span className="text-[11px] opacity-75">
        {metadata.iterations} {metadata.iterations === 1 ? "turn" : "turns"}
        {tokenStr ? ` • ${tokenStr}` : ""}
      </span>
    </div>
  );
}
