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
 *  1. retrieveRagContext()   — queries PGlite, filters by score, deduplicates
 *  2. buildRagContextBlock() — formats segments into the plain-text block that
 *                              gets appended to the user message before the LLM
 *  3. toSourceItems()        — projects segments to the minimal shape needed
 *                              by the Sources UI components
 *
 * GRACEFUL DEGRADATION
 * --------------------
 * retrieveRagContext() never throws. Any failure (embedding model not loaded,
 * PGlite unavailable, network error, etc.) is caught, logged, and returns an
 * empty array so the chat continues without augmentation.
 */

import { hasDocuments, retrieveSegments } from "@/lib/llamaindex-provider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single retrieved chunk with its provenance and similarity score. */
export interface RagSegment {
    text: string;
    fileName: string;
    documentId: string;
    score: number;
}

/**
 * Minimal shape consumed by the Sources / Source ai-element components.
 * Deduplication is done upstream in retrieveRagContext, so each entry here
 * represents a distinct source document.
 */
export interface RagSourceItem {
    fileName: string;
    documentId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimum cosine-similarity score (0–1) for a retrieved chunk to be included.
 *
 * 0.35 is conservative — below this threshold the chunk is almost certainly
 * not topically related to the query. The LLM instruction in the context block
 * hedges against borderline chunks being misused.
 */
const DEFAULT_MIN_SCORE = 0.35;

/** Default number of candidate chunks to request from the vector store. */
const DEFAULT_TOP_K = 5;

// ---------------------------------------------------------------------------
// retrieveRagContext
// ---------------------------------------------------------------------------

/**
 * Retrieves, filters, and deduplicates relevant document segments for a query.
 * Always searches the global document store — documents are accessible from
 * any chat regardless of where the conversation started.
 *
 * Returns an empty array (never throws) when:
 *  - query is blank
 *  - no documents have been indexed
 *  - the embedding model is not yet loaded
 *  - any other retrieval error occurs
 *
 * @param query    The user's raw text query.
 * @param topK     Number of raw candidates to fetch before filtering. Default 5.
 * @param minScore Minimum similarity score (0–1) to accept. Default 0.35.
 */
export async function retrieveRagContext(
    query: string,
    topK: number = DEFAULT_TOP_K,
    minScore: number = DEFAULT_MIN_SCORE
): Promise<RagSegment[]> {
    // Guard: nothing to retrieve for a blank query.
    if (!query.trim()) return [];

    console.log(`[rag] retrieveRagContext — query: "${query.slice(0, 80)}${query.length > 80 ? "…" : ""}"`);

    try {
        // Early exit when no documents are indexed — avoids the expensive
        // embedding model cold-start path on every chat submission.
        const hasAny = await hasDocuments();
        console.log(`[rag] hasDocuments: ${hasAny}`);
        if (!hasAny) return [];

        // Query the entire document store (no chatId filter).
        const rawResults = await retrieveSegments(query, topK);
        console.log(`[rag] raw results (${rawResults.length}):`, rawResults.map((r) => ({
            documentId: r.documentId,
            fileName: r.fileName,
            score: r.node.score,
            textSnippet: r.text?.slice(0, 60),
        })));

        // ── Filter by minimum similarity score ────────────────────────────
        const filtered = rawResults.filter(
            (r) => (r.node.score ?? 0) >= minScore
        );
        console.log(`[rag] after score filter (>= ${minScore}): ${filtered.length} results`);

        // ── Deduplicate by documentId (keep highest-score chunk per doc) ──
        const bestByDoc = new Map<string, typeof filtered[number]>();
        for (const result of filtered) {
            const existing = bestByDoc.get(result.documentId);
            if (!existing || (result.node.score ?? 0) > (existing.node.score ?? 0)) {
                bestByDoc.set(result.documentId, result);
            }
        }

        // ── Project to RagSegment[] ───────────────────────────────────────
        const segments = Array.from(bestByDoc.values()).map((r) => ({
            text: r.text,
            fileName: r.fileName,
            documentId: r.documentId,
            score: r.node.score ?? 0,
        }));
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
 *   chunk text …
 *
 *   [Source 2: "other.txt"]
 *   chunk text …
 *
 *   Use the above context …
 *
 * The instruction at the end hedges against low-relevance chunks being
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
 * Source ai-element components. Deduplication is already done upstream.
 */
export function toSourceItems(segments: RagSegment[]): RagSourceItem[] {
    return segments.map((s) => ({
        fileName: s.fileName,
        documentId: s.documentId,
    }));
}
