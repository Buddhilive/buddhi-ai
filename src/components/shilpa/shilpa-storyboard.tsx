"use client";

import React from "react";
import { HelpCircle, Film, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ShilpaStoryboard } from "@/types/shilpa";

interface ShilpaStoryboardProps {
  storyboard?: ShilpaStoryboard;
}

export function ShilpaStoryboardView({ storyboard }: ShilpaStoryboardProps) {
  if (!storyboard) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-400 gap-2">
        <Film className="h-8 w-8 text-zinc-600" />
        <p className="text-sm">No storyboard available for this chapter yet.</p>
        <p className="text-xs text-zinc-500">
          Generate this lesson with AI to inspect its pedagogical structure.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-16rem)] pr-2">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400 font-medium">
            Chapter {storyboard.chapterNumber} Storyboard
          </span>
          <h3 className="text-base font-bold text-zinc-100">{storyboard.title}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {storyboard.visualMetaphors?.map((metaphor, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-[11px] bg-emerald-500/10 border-emerald-500/20 text-emerald-400 gap-1"
            >
              <Tag className="h-3 w-3" />
              {metaphor}
            </Badge>
          ))}
        </div>
      </div>

      {/* Beats List */}
      <div className="flex flex-col gap-3">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
          Beats & Visual Timeline ({storyboard.beats.length})
        </div>

        {storyboard.beats.map((beat, idx) => {
          const isQuiz = beat.type === "quiz";

          return (
            <div
              key={beat.id}
              className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${
                isQuiz
                  ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
                  : "bg-zinc-900/40 border-zinc-800 text-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    Step {idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-zinc-100">
                    {beat.title}
                  </span>
                </div>

                <Badge
                  variant="outline"
                  className={
                    isQuiz
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400 text-[10px]"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px]"
                  }
                >
                  {isQuiz ? "Interactive Check" : "Animated Lesson"}
                </Badge>
              </div>

              {/* Narration */}
              <div className="text-xs text-zinc-300 bg-black/30 p-2.5 rounded-lg border border-zinc-800/60 leading-relaxed font-mono">
                <span className="text-zinc-500 mr-2 select-none">Narration:</span>
                {beat.narrationText}
              </div>

              {/* Visual Actions */}
              {beat.visualActions && beat.visualActions.length > 0 && (
                <div className="flex flex-col gap-1 text-xs text-zinc-400 pl-1">
                  <span className="text-[11px] font-medium text-zinc-500">
                    Visual actions:
                  </span>
                  {beat.visualActions.map((action, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-1.5 text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quiz Spec if present */}
              {beat.quizSpec && (
                <div className="mt-1 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs flex flex-col gap-1.5">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5" />
                    {beat.quizSpec.prompt}
                  </span>
                  {beat.quizSpec.options && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {beat.quizSpec.options.map((opt, oIdx) => (
                        <span
                          key={oIdx}
                          className={`px-2 py-0.5 rounded text-[11px] border ${
                            oIdx === beat.quizSpec?.answer
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold"
                              : "bg-zinc-800/80 border-zinc-700 text-zinc-400"
                          }`}
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
