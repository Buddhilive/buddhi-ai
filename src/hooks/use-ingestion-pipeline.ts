"use client";

import { useCallback, useRef } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { parsePdfDocument } from "@/lib/pdf-parser";
import { savePaper, saveChunks, saveEmbedding, getPaperByHash } from "@/lib/paper-storage";
import { saveChunkEmbeddings } from "@/lib/pglite-vector-store";
import { embeddingManager } from "@/lib/embedding-manager";
import { useIngestionStore } from "@/stores/ingestion-store";
import type { Paper, IngestionJob, PGliteVectorRecord } from "@/types/research";

const MAX_BATCH_FILES = 5;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

async function computeSha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useIngestionPipeline() {
  const isRunningRef = useRef(false);
  const {
    jobs,
    isProcessing,
    addJobs,
    setJobStage,
    setJobProgress,
    setJobError,
    setJobCompleted,
    setActiveJobId,
    setIsProcessing,
  } = useIngestionStore();

  const processJob = useCallback(
    async (job: IngestionJob, file: File): Promise<boolean> => {
      setActiveJobId(job.id);

      try {
        // Step 1: Parsing
        setJobStage(job.id, "parsing", "Step 1/4: Reading document & extracting text...", 15, 1);
        const arrayBuffer = await file.arrayBuffer();
        const hash = await computeSha256(arrayBuffer);

        // Deduplication check
        const existing = await getPaperByHash(hash);
        if (existing) {
          toast.info(`"${existing.metadata.title || existing.fileName}" is already in your library.`);
          setJobCompleted(job.id, existing);
          return true;
        }

        const fallbackTitle = file.name.replace(/\.pdf$/i, "");
        const parsed = await parsePdfDocument(arrayBuffer, job.id, fallbackTitle);

        if (parsed.pages.every((p) => p.text.trim().length === 0)) {
          const errMsg = "No extractable text found. The document may be scanned or image-based.";
          toast.error(`${file.name}: ${errMsg}`);
          setJobError(job.id, errMsg);
          return false;
        }

        // Step 2: Chunking
        setJobStage(
          job.id,
          "chunking",
          `Step 2/4: Chunked into ${parsed.chunks.length} semantic segments...`,
          35,
          2
        );

        const chunks = parsed.chunks;
        if (chunks.length === 0) {
          const errMsg = "Document produced zero text chunks.";
          toast.error(`${file.name}: ${errMsg}`);
          setJobError(job.id, errMsg);
          return false;
        }

        // Step 3: Embedding
        setJobStage(
          job.id,
          "embedding",
          `Step 3/4: Generating embeddings (0/${chunks.length})...`,
          40,
          3
        );

        await embeddingManager.initialize();

        const vectorRecords: PGliteVectorRecord[] = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embeddingVector = await embeddingManager.generateEmbedding(chunk.text);

          // Prepare PGlite record
          vectorRecords.push({
            id: chunk.id,
            paper_id: job.id,
            chunk_index: chunk.chunkIndex,
            page_number: chunk.pageNumber,
            text: chunk.text,
            embedding: embeddingVector,
          });

          // Also save in IDB store as fallback
          await saveEmbedding(job.id, chunk.chunkIndex, embeddingVector);

          setJobProgress(job.id, i + 1, chunks.length);
        }

        // Step 4: Saving
        setJobStage(
          job.id,
          "saving",
          "Step 4/4: Persisting vectors into PGlite & metadata into IndexedDB...",
          90,
          4
        );

        const newPaper: Paper = {
          id: job.id,
          hash,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: Date.now(),
          pageCount: parsed.pages.length,
          metadata: {
            title: parsed.title,
            authors: ["Unknown Author"],
          },
          embeddingStatus: "completed",
          totalChunks: chunks.length,
          embeddedChunks: chunks.length,
          rawText: parsed.fullText,
        };

        // Save to IndexedDB
        await savePaper(newPaper);
        await saveChunks(chunks);

        // Save vectors to PGlite (pgvector)
        await saveChunkEmbeddings(vectorRecords);

        setJobCompleted(job.id, newPaper);
        toast.success(`Successfully indexed "${newPaper.metadata.title}" (${chunks.length} chunks)`);
        return true;
      } catch (err) {
        console.error(`[useIngestionPipeline] Pipeline failed for ${file.name}:`, err);
        const errMsg = (err as Error).message || "Document processing failed";
        toast.error(`Error processing ${file.name}: ${errMsg}`);
        setJobError(job.id, errMsg);
        return false;
      }
    },
    [setActiveJobId, setJobStage, setJobCompleted, setJobError, setJobProgress]
  );

  const enqueueFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);

      if (files.length === 0) return;

      // 1. Enforce Max Batch Limit
      if (files.length > MAX_BATCH_FILES) {
        toast.error(`Maximum ${MAX_BATCH_FILES} documents can be uploaded at a time.`);
      }

      const filesToProcess = files.slice(0, MAX_BATCH_FILES);
      const validJobsWithFiles: Array<{ job: IngestionJob; file: File }> = [];

      for (const file of filesToProcess) {
        // Validate MIME / extension
        if (!file.name.toLowerCase().endsWith(".pdf")) {
          toast.error(`Skipped "${file.name}": Only PDF documents are supported.`);
          continue;
        }

        // Validate File Size (<= 25 MB)
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(
            `Skipped "${file.name}": File size (${(file.size / (1024 * 1024)).toFixed(
              1
            )}MB) exceeds the 25MB limit.`
          );
          continue;
        }

        const jobId = nanoid();
        const job: IngestionJob = {
          id: jobId,
          fileName: file.name,
          fileSize: file.size,
          stage: "idle",
          progress: 0,
          currentStep: 1,
          totalSteps: 4,
          stepLabel: "Queued for processing",
          currentChunk: 0,
          totalChunks: 0,
          startTime: Date.now(),
        };

        validJobsWithFiles.push({ job, file });
      }

      if (validJobsWithFiles.length === 0) return;

      // Add to store
      addJobs(validJobsWithFiles.map((pair) => pair.job));
      setIsProcessing(true);

      // Process in queue sequentially to manage browser memory
      if (!isRunningRef.current) {
        isRunningRef.current = true;
        try {
          for (const { job, file } of validJobsWithFiles) {
            await processJob(job, file);
          }
        } finally {
          isRunningRef.current = false;
          setActiveJobId(null);
          setIsProcessing(false);
        }
      }
    },
    [addJobs, setIsProcessing, processJob, setActiveJobId]
  );

  return {
    jobs,
    isProcessing,
    enqueueFiles,
  };
}
