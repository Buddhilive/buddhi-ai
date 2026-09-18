"use client";

import React, { useMemo } from "react";
import { FileText, BookOpen, Sparkles, Hash, FileDown } from "lucide-react";
import { usePaperStore } from "@/stores/paper-store";
import type { Paper, Chunk } from "@/types/research";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile, exportPaperAsMarkdown } from "@/lib/export-utils";

interface PdfReaderProps {
  paper: Paper;
  chunks: Chunk[];
  onSelectChunk?: (chunk: Chunk) => void;
}

export function PdfReader({ paper, chunks, onSelectChunk }: PdfReaderProps) {
  const { selectedChunkId, setSelectedChunkId } = usePaperStore();

  // Group chunks by page number
  const pagesMap = useMemo(() => {
    const map = new Map<number, Chunk[]>();
    for (const chunk of chunks) {
      const pageList = map.get(chunk.pageNumber) || [];
      pageList.push(chunk);
      map.set(chunk.pageNumber, pageList);
    }
    return map;
  }, [chunks]);

  const sortedPages = useMemo(() => {
    return Array.from(pagesMap.keys()).sort((a, b) => a - b);
  }, [pagesMap]);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-muted/10 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header metadata card */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {paper.pageCount} Pages
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {chunks.length} Chunks
                </Badge>
                <Badge
                  variant={paper.embeddingStatus === "completed" ? "default" : "outline"}
                  className="text-xs capitalize"
                >
                  {paper.embeddingStatus}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {paper.metadata.title || paper.fileName}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {paper.metadata.authors.join(", ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => {
                  const md = exportPaperAsMarkdown(paper);
                  downloadTextFile(
                    md,
                    `${(paper.metadata.title || "paper").replace(/[^\w]/g, "_")}.md`
                  );
                }}
              >
                <FileDown className="h-3.5 w-3.5" />
                Export MD
              </Button>
            </div>
          </div>
        </div>

        {/* Paper pages view */}
        <div className="space-y-6">
          {sortedPages.map((pageNum) => {
            const pageChunks = pagesMap.get(pageNum) || [];
            return (
              <div
                key={pageNum}
                className="bg-card border rounded-xl p-8 shadow-sm space-y-4 transition-all"
              >
                <div className="flex items-center justify-between border-b pb-2 text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    Page {pageNum}
                  </span>
                  <span>{pageChunks.length} segments</span>
                </div>

                <div className="space-y-3 font-serif text-sm leading-relaxed text-foreground/90">
                  {pageChunks.map((chunk) => {
                    const isSelected = selectedChunkId === chunk.id;
                    return (
                      <div
                        key={chunk.id}
                        onClick={() => {
                          setSelectedChunkId(chunk.id);
                          if (onSelectChunk) onSelectChunk(chunk);
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-all border ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/30"
                            : "border-transparent hover:bg-muted/50 hover:border-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-1 select-none">
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            Chunk {chunk.chunkIndex + 1}
                          </span>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-primary font-sans font-medium">
                              <Sparkles className="h-3 w-3" />
                              Active Selection
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-line">{chunk.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
