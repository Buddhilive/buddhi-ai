/**
 * bundle.ts — concept id helpers.
 *
 * A concept id is the bundle-relative file path minus the `.md` suffix
 * (okf-guide.md §2). This app's bundle is flat (no directory hierarchy);
 * ingestion produces one root concept per uploaded file, optionally paired
 * with several decomposed sub-concept ids derived from the root id
 * (see okf/decompose.ts) — those still live at the bundle root, just with
 * `--`-prefixed ids rather than in a subdirectory.
 */

export function slugify(fileName: string): string {
    const base = fileName.replace(/\.[^./]+$/, "");
    const slug = base
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug || "document";
}

/** Appends -2, -3, ... to avoid colliding with an existing id in the set. */
export function uniqueConceptId(base: string, existingIds?: Set<string>): string {
    if (!existingIds || !existingIds.has(base)) return base;

    let n = 2;
    while (existingIds.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
}

/** Appends -2, -3, ... to avoid colliding with an existing concept id. */
export function toConceptId(fileName: string, existingIds?: Set<string>): string {
    return uniqueConceptId(slugify(fileName), existingIds);
}
