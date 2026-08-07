/**
 * ingest.ts — converts an uploaded file into a single OKF concept.
 *
 * Per the ingestion decision, each upload becomes exactly one concept (no
 * chunking). Frontmatter is intentionally minimal (type/title/generated) —
 * this is unattended ingestion, not curated authoring, so fields implying
 * review or attestation (sources, verified, status) are not fabricated.
 */

import packageJson from "../../../package.json";
import { extractTextFromPDF } from "@/lib/okf/pdf";
import { toConceptId } from "@/lib/okf/bundle";
import { serializeFrontmatter } from "@/lib/okf/frontmatter";
import type { OkfConcept, OkfFrontmatter } from "@/lib/okf/types";

const PRODUCER_ACTOR = `buddhi-ai/${packageJson.version}`;

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

export function fileToConcept(
    file: File,
    text: string,
    existingIds?: Set<string>
): OkfConcept {
    const id = toConceptId(file.name, existingIds);

    const frontmatter: OkfFrontmatter = {
        type: "Document",
        title: humanizeTitle(file.name),
        generated: { by: PRODUCER_ACTOR, at: new Date().toISOString() },
    };

    const body = text.trim();
    const raw = serializeFrontmatter(frontmatter, body);

    return {
        id,
        frontmatter,
        body,
        raw,
        fileName: file.name,
        fileSize: file.size,
        createdAt: new Date().toISOString(),
    };
}
