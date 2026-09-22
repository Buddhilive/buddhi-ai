import { searchChunks } from "./vector-store";
import { embeddingManager } from "./embedding-manager";
import { getPaperById } from "./paper-storage";
import { RAG_SIMILARITY_THRESHOLD, RAG_TOP_K } from "@/const/rag";
import type { Paper, RagContext, SearchResultChunk } from "@/types/research";
import { toast } from "sonner";

/**
 * Performs library-wide semantic retrieval over all embedded paper chunks.
 * Hydrates matching chunks with paper metadata and filters by similarity threshold.
 *
 * @param query - The user search query or question
 * @param topK - Maximum number of chunks to return (default: RAG_TOP_K = 5)
 * @param threshold - Minimum cosine similarity threshold (default: RAG_SIMILARITY_THRESHOLD = 0.55)
 * @returns Array of hydrated RagContext objects sorted by similarity descending
 */
export async function retrieveRagContext(
  query: string,
  topK: number = RAG_TOP_K,
  threshold: number = RAG_SIMILARITY_THRESHOLD
): Promise<RagContext[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  // Generate embedding vector for the search query
  let queryVector: number[];
  try {
    queryVector = await embeddingManager.generateEmbedding(trimmedQuery);
  } catch (err) {
    const errorMsg = (err as Error)?.message || String(err);
    console.warn(
      "[rag-retrieval] Could not generate embedding for query. Proceeding without RAG context:",
      err
    );
    toast.error("RAG retrieval unavailable", {
      description: errorMsg.includes("Cache API")
        ? "EmbeddingGemma 300M model is not downloaded. Please install it on the Models page."
        : errorMsg,
    });
    return [];
  }

  if (!queryVector || queryVector.length === 0) {
    return [];
  }

  // Perform library-wide vector similarity search
  let searchResults: SearchResultChunk[];
  try {
    searchResults = await searchChunks(queryVector, undefined, topK, threshold);
  } catch (err) {
    console.error("[rag-retrieval] Vector search failed:", err);
    return [];
  }

  if (!searchResults || searchResults.length === 0) {
    console.info(
      `[rag-retrieval] No chunks above threshold ${threshold} for query: "${trimmedQuery.slice(0, 60)}"`
    );
    return [];
  }

  console.info(
    `[rag-retrieval] Retrieved ${searchResults.length} chunks (top similarity: ${searchResults[0]?.similarity.toFixed(3)}) for query: "${trimmedQuery.slice(0, 60)}"`
  );

  // Hydrate chunks with paper metadata (cache papers to avoid redundant IndexedDB calls)
  const paperCache = new Map<string, Paper | null>();
  const uniquePaperIds = Array.from(new Set(searchResults.map((r) => r.paperId)));

  await Promise.all(
    uniquePaperIds.map(async (paperId) => {
      try {
        const paper = await getPaperById(paperId);
        paperCache.set(paperId, paper);
      } catch (err) {
        console.warn(`[rag-retrieval] Failed to load paper metadata for ${paperId}:`, err);
        paperCache.set(paperId, null);
      }
    })
  );

  const ragContexts: RagContext[] = searchResults.map((chunk) => {
    const paper = paperCache.get(chunk.paperId);
    return {
      paperId: chunk.paperId,
      paperTitle: paper?.metadata?.title?.trim() || paper?.fileName || "Unknown Paper",
      authors: paper?.metadata?.authors || [],
      year: paper?.metadata?.year,
      pageNumber: chunk.pageNumber,
      sectionHeading: chunk.sectionHeading,
      textSnippet: chunk.text,
      similarity: chunk.similarity,
    };
  });

  // Sort descending by similarity
  ragContexts.sort((a, b) => b.similarity - a.similarity);

  if (ragContexts.length > 0) {
    toast.success(`Retrieved ${ragContexts.length} relevant sections from library`, {
      description: `Top match: "${ragContexts[0].paperTitle.slice(0, 30)}..." (${(ragContexts[0].similarity * 100).toFixed(0)}% match)`,
    });
  }

  return ragContexts;
}
