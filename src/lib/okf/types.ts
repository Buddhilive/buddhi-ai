/**
 * types.ts — Open Knowledge Format (OKF) v0.2 domain types.
 *
 * These types cover only the minimal
 * frontmatter shape this app emits during auto-ingestion; the `[key: string]`
 * index signature on OkfFrontmatter preserves any additional keys a concept
 * may carry, per spec §7 ("consumers should preserve [unknown keys] on
 * round-trip").
 */

export interface OkfGenerated {
    by: string;
    at: string;
}

export interface OkfFrontmatter {
    type: string;
    title?: string;
    description?: string;
    tags?: string[];
    generated?: OkfGenerated;
    [key: string]: unknown;
}

export interface OkfConcept {
    /** Bundle-relative concept id (file path minus the .md suffix). */
    id: string;
    frontmatter: OkfFrontmatter;
    /** Markdown body only (no frontmatter block). */
    body: string;
    /** Full markdown text — frontmatter block + body — stored verbatim. */
    raw: string;
    /** Original uploaded filename, for UI display. */
    fileName: string;
    fileSize: number;
    createdAt: string;
}

export interface OkfSearchHit {
    id: string;
    score: number;
}
