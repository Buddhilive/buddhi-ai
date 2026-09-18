"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { nanoid } from "nanoid";
import { parsePdfDocument } from "@/lib/pdf-parser";
import { savePaper, saveChunks, getPaperByHash } from "@/lib/paper-storage";
import { useEmbedding } from "@/hooks/use-embedding";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { Paper } from "@/types/research";

interface PaperUploadZoneProps {
  onPaperUploaded?: (paper: Paper) => void;
}

export function PaperUploadZone({ onPaperUploaded }: PaperUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { embedPaperChunks, isEmbedding, progress } = useEmbedding();

  const computeSha256 = async (buffer: ArrayBuffer): Promise<string> => {
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF document.");
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStage("Reading document bytes...");
      const arrayBuffer = await file.arrayBuffer();

      setProcessingStage("Verifying document hash...");
      const hash = await computeSha256(arrayBuffer);

      // Check duplicate
      const existing = await getPaperByHash(hash);
      if (existing) {
        toast.info(`"${existing.metadata.title || existing.fileName}" is already in your library.`);
        setIsProcessing(false);
        if (onPaperUploaded) onPaperUploaded(existing);
        return;
      }

      setProcessingStage("Extracting text and chunking pages...");
      const paperId = nanoid();
      const parsed = await parsePdfDocument(arrayBuffer, paperId, file.name.replace(/\.pdf$/i, ""));

      if (parsed.pages.every((p) => p.text.trim().length === 0)) {
        toast.error("No extractable text found in this PDF. It may be scanned or image-based.");
        setIsProcessing(false);
        return;
      }

      const newPaper: Paper = {
        id: paperId,
        hash,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: Date.now(),
        pageCount: parsed.pages.length,
        metadata: {
          title: parsed.title,
          authors: ["Unknown Author"],
        },
        embeddingStatus: "idle",
        totalChunks: parsed.chunks.length,
        embeddedChunks: 0,
        rawText: parsed.fullText,
      };

      await savePaper(newPaper);
      await saveChunks(parsed.chunks);

      toast.success(`Ingested "${newPaper.metadata.title}" (${parsed.chunks.length} chunks)`);
      setIsProcessing(false);

      if (onPaperUploaded) {
        onPaperUploaded(newPaper);
      }

      // Automatically kick off embedding in background
      embedPaperChunks(newPaper, parsed.chunks);
    } catch (err) {
      console.error("[PaperUploadZone] Upload failed:", err);
      toast.error("Failed to parse and store PDF document.");
      setIsProcessing(false);
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
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <UploadCloud className="h-8 w-8" />
            )}
          </div>

          <div>
            <h3 className="font-semibold text-base">
              {isProcessing ? "Processing Paper..." : "Upload Academic Paper"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isProcessing
                ? processingStage
                : "Drag & drop PDF files here, or click to browse"}
            </p>
          </div>

          {!isProcessing && (
            <div className="text-xs text-muted-foreground/75 flex items-center gap-2">
              <span>PDF documents up to 50MB</span>
              <span>•</span>
              <span>Private & Client-Side Only</span>
            </div>
          )}
        </div>
      </div>

      {isEmbedding && (
        <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5 text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating LiteRT Embeddings...
            </span>
            <span className="text-muted-foreground">
              {progress.current} / {progress.total} chunks
            </span>
          </div>
          <Progress
            value={(progress.current / (progress.total || 1)) * 100}
            className="h-2"
          />
        </div>
      )}
    </div>
  );
}
