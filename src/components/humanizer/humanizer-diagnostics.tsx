"use client";

import React from "react";
import { useHumanizerStore } from "@/stores/humanizer-store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ShieldCheck, Scissors } from "lucide-react";

export function HumanizerDiagnostics() {
  const { diffResult } = useHumanizerStore();

  if (!diffResult) return null;

  const { metrics, clichesPrunedCount, prunedCliches } = diffResult;
  const isTargetMet = metrics.varianceChangePercent >= 35;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Burstiness Metric Card */}
      <Card className="border bg-card/60 shadow-xs">
        <CardContent className="p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Activity className="size-3.5 text-primary" />
              Burstiness (&sigma;)
            </span>
            <Badge
              variant={isTargetMet ? "default" : "secondary"}
              className="text-[10px] px-1.5 py-0 h-4 font-semibold"
            >
              +{metrics.varianceChangePercent}%
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-foreground">
              {metrics.afterVariance}
            </span>
            <span className="text-xs text-muted-foreground">
              from {metrics.beforeVariance}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {isTargetMet
              ? "Syntactic cadence successfully disrupted with high clause variation."
              : "Moderate cadence variation introduced across sentence structures."}
          </p>
        </CardContent>
      </Card>

      {/* Clichés Pruned Card */}
      <Card className="border bg-card/60 shadow-xs">
        <CardContent className="p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Scissors className="size-3.5 text-rose-500" />
              Tropes Pruned
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {clichesPrunedCount} eliminated
            </Badge>
          </div>
          <div className="text-lg font-bold tracking-tight text-foreground">
            {clichesPrunedCount}
          </div>
          {prunedCliches.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {prunedCliches.slice(0, 3).map((cliche, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-[9px] px-1 py-0 h-3.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                >
                  &quot;{cliche}&quot;
                </Badge>
              ))}
              {prunedCliches.length > 3 && (
                <span className="text-[9px] text-muted-foreground">
                  +{prunedCliches.length - 3} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground leading-tight">
              No canonical formulaic tropes detected in original draft.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Epistemic Modesty / Balance */}
      <Card className="border bg-card/60 shadow-xs">
        <CardContent className="p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              Epistemic Balance
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              Active
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-foreground">
              {metrics.sentenceCountAfter}
            </span>
            <span className="text-xs text-muted-foreground">
              sentences (avg {metrics.avgSentenceLengthAfter} wps)
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Balanced short assertions (3-8w) with compound-complex analysis clauses.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
