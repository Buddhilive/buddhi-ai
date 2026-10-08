"use client";

import React from "react";
import { Sparkles, CheckCircle2, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ShilpaSection } from "@/types/shilpa";

interface ShilpaChapterMapProps {
  sections: ShilpaSection[];
  activeChapterFolder?: string;
  onSelectChapter: (chapter: ShilpaSection) => void;
  onGenerateChapter: (chapter: ShilpaSection) => void;
}

export function ShilpaChapterMap({
  sections,
  activeChapterFolder,
  onSelectChapter,
  onGenerateChapter,
}: ShilpaChapterMapProps) {
  // Group chapters by Unit
  const groupedSections = React.useMemo(() => {
    const groups: { unit: string; items: ShilpaSection[] }[] = [];
    let currentUnit = "";

    sections.forEach((sec) => {
      const unitName = sec.unit || "General Chapters";
      if (unitName !== currentUnit) {
        currentUnit = unitName;
        groups.push({ unit: unitName, items: [sec] });
      } else {
        groups[groups.length - 1].items.push(sec);
      }
    });

    return groups;
  }, [sections]);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-16rem)] pr-2">
      {groupedSections.map((group, groupIdx) => (
        <div key={groupIdx} className="flex flex-col gap-2">
          {group.unit && (
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1 pt-2">
              {group.unit}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {group.items.map((sec) => {
              const isActive = sec.folder === activeChapterFolder;
              const isReady = sec.status === "ready";

              return (
                <div
                  key={sec.folder}
                  onClick={() => onSelectChapter(sec)}
                  className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200 shadow-sm"
                      : "bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800/80 text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive
                          ? "bg-emerald-500 text-black font-extrabold"
                          : "bg-zinc-800 text-zinc-400 group-hover:text-zinc-200"
                      }`}
                    >
                      {sec.chapterNumber}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate text-zinc-100 group-hover:text-white">
                        {sec.title}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Pages {sec.startPage}–{sec.endPage}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ~{sec.estimatedMinutes} min
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isReady ? (
                      <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 gap-1 text-[11px] py-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Ready
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGenerateChapter(sec);
                        }}
                        className="h-7 text-xs px-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
                      >
                        <Sparkles className="h-3 w-3 text-emerald-400" />
                        Generate
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
