import {
  getEmbeddingsByPaperId,
  getAllEmbeddings,
  getChunksByPaperId,
} from "./paper-storage";
import { searchVectorChunks } from "./pglite-vector-store";
import type { Chunk, SearchResultChunk } from "@/types/research";

/**
 * Calculates cosine similarity between two numeric vectors.
 * Returns a value between -1.0 and 1.0 (or 0.0 for zero vectors).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Searches chunks matching a query vector using PGlite pgvector cosine distance,
 * falling back to in-memory IndexedDB search if needed.
 */
export async function searchChunks(
  queryVector: number[],
  paperId?: string,
  topK = 5,
  similarityThreshold = 0.3
): Promise<SearchResultChunk[]> {
  try {
    const pgResults = await searchVectorChunks(queryVector, paperId, topK);
    if (pgResults.length > 0) {
      return pgResults
        .filter((r) => r.similarity >= similarityThreshold)
        .map((r) => ({
          id: r.id,
          paperId: r.paperId,
          chunkIndex: r.chunkIndex,
          pageNumber: r.pageNumber,
          text: r.text,
          similarity: r.similarity,
        }));
    }
  } catch (err) {
    console.warn("[vector-store] PGlite search failed, falling back to IDB scan:", err);
  }

  const embeddings = paperId
    ? await getEmbeddingsByPaperId(paperId)
    : await getAllEmbeddings();

  if (embeddings.length === 0) return [];

  // Score each embedding
  const scored = embeddings.map((emb) => ({
    id: emb.id,
    paperId: emb.paperId,
    chunkIndex: emb.chunkIndex,
    similarity: cosineSimilarity(queryVector, emb.embedding),
  }));

  // Sort descending by similarity
  scored.sort((a, b) => b.similarity - a.similarity);

  // Filter threshold and take topK
  const topMatches = scored
    .filter((s) => s.similarity >= similarityThreshold)
    .slice(0, topK);

  if (topMatches.length === 0) return [];

  // Hydrate with chunk text
  const results: SearchResultChunk[] = [];
  const chunksCache = new Map<string, Chunk[]>();

  for (const match of topMatches) {
    let paperChunks = chunksCache.get(match.paperId);
    if (!paperChunks) {
      paperChunks = await getChunksByPaperId(match.paperId);
      chunksCache.set(match.paperId, paperChunks);
    }

    const chunk = paperChunks.find((c) => c.chunkIndex === match.chunkIndex);
    if (chunk) {
      results.push({
        ...chunk,
        similarity: match.similarity,
      });
    }
  }

  return results;
}
