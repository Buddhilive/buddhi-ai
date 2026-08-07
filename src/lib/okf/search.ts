/**
 * search.ts — client-side BM25 keyword search over OKF concepts.
 *
 * Replaces pgvector cosine-similarity search. MiniSearch indexes title/tags/
 * body with title/tags boosted, so exact-term matches in a document's title
 * outrank incidental body mentions. The index is an in-memory singleton,
 * lazily hydrated from IndexedDB (src/lib/okf/store.ts) on first use — cheap
 * to rebuild each session at the scale of hundreds of documents.
 */

import MiniSearch from "minisearch";
import { getAllConcepts } from "@/lib/okf/store";
import type { OkfConcept, OkfSearchHit } from "@/lib/okf/types";

interface IndexedDoc {
    id: string;
    title: string;
    tags: string;
    body: string;
}

function toIndexedDoc(concept: OkfConcept): IndexedDoc {
    return {
        id: concept.id,
        title: concept.frontmatter.title ?? concept.fileName,
        tags: (concept.frontmatter.tags ?? []).join(" "),
        body: concept.body,
    };
}

function createIndex(): MiniSearch<IndexedDoc> {
    return new MiniSearch<IndexedDoc>({
        idField: "id",
        fields: ["title", "tags", "body"],
        storeFields: [],
        searchOptions: {
            boost: { title: 2, tags: 1.5 },
            fuzzy: 0.2,
            prefix: true,
        },
    });
}

let index: MiniSearch<IndexedDoc> | null = null;
let hydratePromise: Promise<void> | null = null;

async function ensureHydrated(): Promise<MiniSearch<IndexedDoc>> {
    if (index) return index;
    if (!hydratePromise) {
        hydratePromise = (async () => {
            const concepts = await getAllConcepts();
            const built = createIndex();
            built.addAll(concepts.map(toIndexedDoc));
            index = built;
        })();
    }
    await hydratePromise;
    return index!;
}

export async function indexConcept(concept: OkfConcept): Promise<void> {
    const idx = await ensureHydrated();
    const doc = toIndexedDoc(concept);
    if (idx.has(concept.id)) idx.replace(doc);
    else idx.add(doc);
}

export async function removeFromIndex(id: string): Promise<void> {
    const idx = await ensureHydrated();
    if (idx.has(id)) idx.discard(id);
}

export async function search(query: string, topK: number): Promise<OkfSearchHit[]> {
    const idx = await ensureHydrated();
    return idx
        .search(query)
        .slice(0, topK)
        .map((r) => ({ id: r.id as string, score: r.score }));
}
