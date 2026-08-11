/**
 * ingest.ts — converts an uploaded file into a single root OKF concept.
 *
 * Per the ingestion decision, each upload becomes exactly one root concept
 * (no chunking here). A `.md` upload with valid authored frontmatter
 * (non-empty `type`) is treated as curated and returned as-is
 * (enrichable: false). Otherwise frontmatter is synthesized minimally;
 * documents.ts may then run LLM-based enrichment (okf/enrich.ts) to fill in
 * type/tags/description on the root concept, and LLM-based decomposition
 * (okf/decompose.ts) to derive several linked sub-concepts from it.
 */

import packageJson from "../../../package.json";
import { extractTextFromPDF } from "@/lib/okf/pdf";
import { toConceptId } from "@/lib/okf/bundle";
import { parseFrontmatter, serializeFrontmatter } from "@/lib/okf/frontmatter";
import type { OkfConcept, OkfFrontmatter } from "@/lib/okf/types";

export const PRODUCER_ACTOR = `buddhi-ai/${packageJson.version}`;

function humanizeTitle(fileName: string): string {
    return fileName
        .replace(/\.[^./]+$/, "")
        .replace(/[-_]+/g, " ")
        .trim();
}

export async function extractText(file: File): Promise<string> {
    const ext = file.name.split(".").pop()?.toLowerCase();

    let text: string;
    if (ext === "pdf") {
        text = await extractTextFromPDF(file);
    } else {
        text = await file.text();
    }

    if (!text || text.trim().length === 0) {
        throw new Error(
            ext === "pdf"
                ? "No extractable text found. Scanned/image-only PDFs are not supported — please use a text-based PDF."
                : "File appears to be empty."
        );
    }

    return text;
}

export interface FileToConceptResult {
    concept: OkfConcept;
    /** true when frontmatter was synthesized and could still be improved by LLM enrichment. */
    enrichable: boolean;
}

export function fileToConcept(
    file: File,
    text: string,
    existingIds?: Set<string>
): FileToConceptResult {
    const id = toConceptId(file.name, existingIds);
    const ext = file.name.split(".").pop()?.toLowerCase();
    const trimmed = text.trim();

    let frontmatter: OkfFrontmatter | null = null;
    let body = trimmed;

    if (ext === "md" && /^---\s*\r?\n/.test(trimmed)) {
        try {
            const parsed = parseFrontmatter(trimmed);
            if (typeof parsed.frontmatter.type === "string" && parsed.frontmatter.type.trim()) {
                frontmatter = parsed.frontmatter;
                body = parsed.body;
            }
        } catch {
            // Malformed YAML frontmatter — fall through to synthesized frontmatter.
        }
    }

    const enrichable = frontmatter === null;
    if (!frontmatter) {
        frontmatter = {
            type: "Document",
            title: humanizeTitle(file.name),
            generated: { by: PRODUCER_ACTOR, at: new Date().toISOString() },
        };
    }

    const raw = serializeFrontmatter(frontmatter, body);

    return {
        concept: {
            id,
            frontmatter,
            body,
            raw,
            fileName: file.name,
            fileSize: file.size,
            createdAt: new Date().toISOString(),
        },
        enrichable,
    };
}
