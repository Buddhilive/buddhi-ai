"use client";

import { useState, useCallback } from "react";
import { embeddingManager } from "@/lib/embedding-manager";
import { saveEmbedding, savePaper } from "@/lib/paper-storage";
import { usePaperStore } from "@/stores/paper-store";
import type { Chunk, Paper } from "@/types/research";

export function useEmbedding() {
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const setStoreProgress = usePaperStore((state) => state.setEmbeddingProgress);

  const embedPaperChunks = useCallback(
    async (paper: Paper, chunks: Chunk[]): Promise<boolean> => {
      setIsEmbedding(true);
      setError(null);
      setProgress({ current: 0, total: chunks.length });
      setStoreProgress(0, chunks.length, true);

      try {
        await embeddingManager.initialize();

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const vector = await embeddingManager.generateEmbedding(chunk.text);
          await saveEmbedding(paper.id, chunk.chunkIndex, vector);

          const currentCount = i + 1;
          setProgress({ current: currentCount, total: chunks.length });
          setStoreProgress(currentCount, chunks.length, true);

          // Update paper embedding count intermittently
          if (currentCount % 5 === 0 || currentCount === chunks.length) {
            paper.embeddedChunks = currentCount;
            if (currentCount === chunks.length) {
              paper.embeddingStatus = "completed";
            } else {
              paper.embeddingStatus = "embedding";
            }
            await savePaper(paper);
          }
        }

        setIsEmbedding(false);
        setStoreProgress(chunks.length, chunks.length, false);
        return true;
      } catch (err) {
        console.error("[useEmbedding] Embedding failed:", err);
        const errMsg = (err as Error).message || "Embedding generation failed";
        setError(errMsg);
        setIsEmbedding(false);
        setStoreProgress(0, chunks.length, false);

        paper.embeddingStatus = "failed";
        await savePaper(paper);
        return false;
      }
    },
    [setStoreProgress]
  );

  return {
    embedPaperChunks,
    isEmbedding,
    progress,
    error,
  };
}
