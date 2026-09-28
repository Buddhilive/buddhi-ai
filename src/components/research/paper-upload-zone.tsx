"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Loader2, Files, Sparkles } from "lucide-react";
import { useIngestionPipeline } from "@/hooks/use-ingestion-pipeline";
import { useIngestionStore } from "@/stores/ingestion-store";
import type { Paper } from "@/types/research";

interface PaperUploadZoneProps {
  onPaperUploaded?: (paper: Paper) => void;
}

export function PaperUploadZone({ onPaperUploaded: _onPaperUploaded }: PaperUploadZoneProps = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { enqueueFiles } = useIngestionPipeline();
  const isProcessing = useIngestionStore((state) => state.isProcessing);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      enqueueFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      enqueueFiles(e.target.files);
      // Reset input value so same files can be re-uploaded if needed
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative overflow-hidden border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-primary bg-primary/10 scale-[1.01] shadow-lg ring-4 ring-primary/10"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
        } ${isProcessing ? "border-primary/40 bg-primary/5" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="p-3.5 rounded-full bg-primary/10 text-primary relative">
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <UploadCloud className="h-8 w-8" />
            )}
            <Sparkles className="h-3.5 w-3.5 text-primary absolute -top-0.5 -right-0.5 animate-pulse" />
          </div>

          <div>
            <h3 className="font-semibold text-base tracking-tight">
              {isProcessing ? "Processing Academic Papers..." : "Upload Academic Papers"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Drag & drop up to 5 PDF papers here, or click to browse. Text extraction,
              hierarchical chunking, and vector embedding will run client-side.
            </p>
          </div>

          <div className="text-xs text-muted-foreground/80 flex items-center justify-center gap-3 flex-wrap pt-1">
            <span className="flex items-center gap-1">
              <Files className="h-3.5 w-3.5" /> Max 5 files per batch
            </span>
            <span>•</span>
            <span>Up to 25MB per document</span>
            <span>•</span>
            <span className="text-primary font-medium">Local-first WASM & PGlite</span>
          </div>
        </div>
      </div>
    </div>
  );
}
