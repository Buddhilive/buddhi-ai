/**
 * bundle.ts — concept id helpers.
 *
 * A concept id is the bundle-relative file path minus the `.md` suffix
 * (okf-guide.md §2). This app's bundle is flat (no directory hierarchy) since
 * ingestion produces one concept per uploaded file.
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

/** Appends -2, -3, ... to avoid colliding with an existing concept id. */
export function toConceptId(fileName: string, existingIds?: Set<string>): string {
    const base = slugify(fileName);
    if (!existingIds || !existingIds.has(base)) return base;

    let n = 2;
    while (existingIds.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
}
