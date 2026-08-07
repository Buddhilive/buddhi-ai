/**
 * rag.ts
 *
 * Naive RAG utilities — retrieval, context formatting, and source projection.
 *
 * This module is a pure utility layer with no React dependencies. All RAG
 * logic lives here so that chat-interface.tsx stays thin and the retrieval
 * pipeline can be tested or reused independently.
 *
 * PIPELINE
 * --------
 *  1. retrieveRagContext()   — keyword-searches the OKF concept store,
 *                              filters by relative score, fetches bodies
 *  2. buildRagContextBlock() — formats segments into the plain-text block that
 *                              gets appended to the user message before the LLM
 *  3. toSourceItems()        — projects segments to the minimal shape needed
 *                              by the Sources UI components
 *
 * GRACEFUL DEGRADATION
 * --------------------
 * retrieveRagContext() never throws. Any failure (IndexedDB unavailable,
 * search error, etc.) is caught, logged, and returns an empty array so the
 * chat continues without augmentation.
 */

import { hasConcepts, getConcept } from "@/lib/okf/store";
import { search } from "@/lib/okf/search";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single retrieved concept with its provenance and relevance score. */
export interface RagSegment {
    text: string;
    fileName: string;
    documentId: string;
    score: number;
}

/**
 * Minimal shape consumed by the Sources / Source ai-element components.
 * Each entry represents a distinct source document (ingestion is one
 * concept per document, so no further deduplication is needed).
 */
export interface RagSourceItem {
    fileName: string;
    documentId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimum relevance score, expressed as a fraction of the top hit's score
 * (0–1), for a search result to be included.
 *
 * Unlike cosine similarity, MiniSearch's BM25-derived score is unbounded and
 * query-dependent, so it can't be compared against a fixed absolute
 * threshold. Instead we keep any hit scoring at least this fraction of the
 * best match — e.g. 0.35 keeps results at least 35% as relevant as the top
 * hit, discarding clearly-weaker tail matches.
 */
const DEFAULT_MIN_SCORE_RATIO = 0.35;

/** Default number of candidate concepts to request from the search index. */
const DEFAULT_TOP_K = 5;

/** Cap on how much of a concept's body is injected into the prompt context. */
const MAX_SOURCE_CHARS = 2000;

// ---------------------------------------------------------------------------
// retrieveRagContext
// ---------------------------------------------------------------------------

/**
 * Retrieves and filters relevant concepts for a query.
 * Always searches the global document store — documents are accessible from
 * any chat regardless of where the conversation started.
 *
 * Returns an empty array (never throws) when:
 *  - query is blank
 *  - no documents have been indexed
 *  - any other retrieval error occurs
 *
 * @param query         The user's raw text query.
 * @param topK          Number of candidates to fetch. Default 5.
 * @param minScoreRatio Minimum score as a fraction of the top hit's score
 *                      (0–1) to accept. Default 0.35.
 */
export async function retrieveRagContext(
    query: string,
    topK: number = DEFAULT_TOP_K,
    minScoreRatio: number = DEFAULT_MIN_SCORE_RATIO
): Promise<RagSegment[]> {
    // Guard: nothing to retrieve for a blank query.
    if (!query.trim()) return [];

    console.log(`[rag] retrieveRagContext — query: "${query.slice(0, 80)}${query.length > 80 ? "…" : ""}"`);

    try {
        // Early exit when no documents are indexed.
        const hasAny = await hasConcepts();
        console.log(`[rag] hasConcepts: ${hasAny}`);
        if (!hasAny) return [];

        const hits = await search(query, topK);
        console.log(`[rag] raw hits (${hits.length}):`, hits);

        if (hits.length === 0) return [];

        // ── Filter by score relative to the top hit ───────────────────────
        const topScore = hits[0].score;
        const filtered = hits.filter((h) => h.score >= topScore * minScoreRatio);
        console.log(`[rag] after ratio filter (>= ${minScoreRatio} of top): ${filtered.length} results`);

        // ── Fetch concept bodies and project to RagSegment[] ──────────────
        const segments: RagSegment[] = [];
        for (const hit of filtered) {
            const concept = await getConcept(hit.id);
            if (!concept) continue;
            segments.push({
                text: concept.body.slice(0, MAX_SOURCE_CHARS),
                fileName: concept.frontmatter.title ?? concept.fileName,
                documentId: concept.id,
                score: hit.score,
            });
        }

        console.log(`[rag] final segments (${segments.length}):`, segments.map((s) => ({
            fileName: s.fileName,
            score: s.score,
        })));
        return segments;
    } catch (err) {
        console.warn(
            "[rag] Retrieval failed — continuing without RAG context.",
            err instanceof Error
                ? `${err.name}: ${err.message}`
                : String(err)
        );
        return [];
    }
}

// ---------------------------------------------------------------------------
// buildRagContextBlock
// ---------------------------------------------------------------------------

/**
 * Formats retrieved segments into a plain-text block that is appended to the
 * user's message before it reaches the LLM.
 *
 * Returns null when segments is empty so callers can skip injection entirely.
 *
 * The block follows this structure:
 *
 *   \n\n---
 *   Relevant context from your knowledge base:
 *
 *   [Source 1: "filename.pdf"]
 *   document text (truncated) …
 *
 *   [Source 2: "other.txt"]
 *   document text (truncated) …
 *
 *   Use the above context …
 *
 * The instruction at the end hedges against low-relevance sources being
 * over-indexed by the model while keeping it short (context window is limited).
 */
export function buildRagContextBlock(segments: RagSegment[]): string | null {
    if (segments.length === 0) return null;

    const sourceBlocks = segments
        .map(
            (seg, i) =>
                `[Source ${i + 1}: "${seg.fileName}"]\n${seg.text.trim()}`
        )
        .join("\n\n");

    return (
        "\n\n---\n" +
        "Relevant context from your knowledge base:\n\n" +
        sourceBlocks +
        "\n\n" +
        "Use the above context to help answer the question. " +
        "If the context is not relevant, ignore it and answer from your general knowledge."
    );
}

// ---------------------------------------------------------------------------
// toSourceItems
// ---------------------------------------------------------------------------

/**
 * Projects RagSegment[] to the minimal shape consumed by the Sources /
 * Source ai-element components.
 */
export function toSourceItems(segments: RagSegment[]): RagSourceItem[] {
    return segments.map((s) => ({
        fileName: s.fileName,
        documentId: s.documentId,
    }));
}
