"use client";

import React, { useRef, useMemo, useState } from "react";
import { Play, RotateCw, Maximize2, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ShilpaSection } from "@/types/shilpa";

interface ShilpaPlayerProps {
  bookId: string;
  chapter: ShilpaSection;
  isSample?: boolean;
  scriptContent?: string;
  onGenerateClick?: () => void;
  className?: string;
}

export function ShilpaPlayer({
  bookId: _bookId,
  chapter,
  isSample = false,
  scriptContent,
  onGenerateClick,
  className = "",
}: ShilpaPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    }
  };

  // Construct iframe srcDoc
  const srcDoc = useMemo(() => {
    // If it's the pre-bundled sample demo book
    if (isSample && !scriptContent) {
      return null; // Load /shilpa/sample/ch01.html directly via src
    }

    if (!scriptContent) {
      return null;
    }

    // Embed custom generated script
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${chapter.title}</title>
  <link rel="stylesheet" href="/shilpa/lib/engine.css">
</head>
<body>
  <script src="/shilpa/lib/engine.js"></script>
  <script>
    'use strict';
    ${scriptContent}
    if (typeof boot === 'function') {
      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => boot());
      } else {
        boot();
      }
    }
  </script>
</body>
</html>`;
  }, [isSample, scriptContent, chapter.title]);

  const hasExecutableContent = Boolean(isSample || scriptContent);

  return (
    <div className={`flex flex-col h-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden shadow-2xl ${className}`}>
      {/* Player Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 text-xs text-zinc-300">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {chapter.folder.toUpperCase()}
          </span>
          <span className="font-medium truncate text-zinc-100">{chapter.title}</span>
          {chapter.unit && (
            <span className="text-zinc-500 hidden sm:inline truncate">
              • {chapter.unit}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReload}
            className="h-7 px-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            title="Restart Lesson"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFullscreen}
            className="h-7 px-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            title="Full Screen (F)"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Canvas / Stage Area */}
      <div className="relative flex-1 bg-black flex items-center justify-center min-h-[400px]">
        {hasExecutableContent ? (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={isSample && !scriptContent ? "/shilpa/sample/ch01.html" : undefined}
            srcDoc={srcDoc || undefined}
            className="w-full h-full border-0 absolute inset-0"
            allow="autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups"
            title={`Lesson Stage: ${chapter.title}`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-md gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <Play className="h-7 w-7 fill-emerald-400 translate-x-0.5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">
                Lesson Not Generated Yet
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Chapter {chapter.chapterNumber} ({chapter.startPage}–{chapter.endPage}) has not been converted into an animated lesson.
              </p>
            </div>
            {onGenerateClick && (
              <Button
                onClick={onGenerateClick}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 gap-2 shadow-lg shadow-emerald-950"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate Interactive Lesson
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Shortcuts Guide Footer */}
      <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">Space</kbd> Play/Pause</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">←</kbd><kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300 ml-0.5">→</kbd> Step</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">C</kbd> Captions</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">F</kbd> Fullscreen</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">?</kbd> Shortcuts</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Volume2 className="h-3 w-3" />
          <span>Synchronized Speech & Timings</span>
        </div>
      </div>
    </div>
  );
}
