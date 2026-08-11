/**
 * decompose.ts — on-device LLM decomposition of a document into multiple
 * cross-linked OKF concepts.
 *
 * ingest.ts produces exactly one "root" concept per uploaded file (no
 * chunking, by design). This module is the piece that actually builds a
 * *graph*: it asks the on-device model to split the document's content into
 * several distinct concepts (topics/entities/sections/ideas) plus the
 * relationships between them, so documents.ts can persist a root concept
 * with several linked sub-concepts instead of a single isolated node.
 *
 * Mirrors enrich.ts's LLM-call pattern exactly (same message-building /
 * response-draining shape) and shares its serialization queue
 * (`enqueueLlmCall`), since MediaPipe's LlmInference instance is not
 * reentrant and both modules drive the same instance.
 */

import type { LlmInference } from "@mediapipe/tasks-genai";
import { generateChatTemplate } from "@/lib/buddhi-ai-core/chat-template-generator";
import type { BuddhiAIMessage } from "@/types/messages";
import { enqueueLlmCall } from "@/lib/okf/enrich";

const MAX_BODY_CHARS = 4000;
const MAX_CONCEPTS = 8;
const MIN_CONCEPTS = 2;
const MAX_TAGS = 6;
const MAX_TAG_LENGTH = 30;
const MAX_TYPE_LENGTH = 40;
const MAX_DESCRIPTION_LENGTH = 200;
const MAX_TITLE_LENGTH = 100;
const MAX_SLUG_LENGTH = 60;

export interface DecomposedConcept {
    slug: string;
    title: string;
    type: string;
    tags: string[];
    description: string;
    body: string;
    /** Slugs of other concepts in this same batch that this one relates to. */
    relatesTo: string[];
}

function buildMessages(fileName: string, text: string): BuddhiAIMessage[] {
    const excerpt = text.slice(0, MAX_BODY_CHARS);
    return [
        {
            role: "system",
            content:
                "You decompose documents into a knowledge graph for a knowledge base. Given a " +
                "file name and its content, split it into between 3 and 8 distinct concepts — " +
                "topics, entities, sections, or ideas covered by the document. Respond with " +
                "STRICT JSON only — no markdown fences, no commentary, no text before or after. " +
                'Schema: {"concepts": [{"slug": string, "title": string, "type": string, ' +
                '"tags": string[], "description": string, "body": string, "relatesTo": string[]}]}. ' +
                '"slug" is a short unique kebab-case identifier for the concept within this ' +
                'response. "type" is a short 1-3 word noun phrase naming the kind of concept ' +
                '(e.g. "Topic", "Entity", "Procedure", "Definition"). "tags" is up to 6 short ' +
                'lowercase keywords. "description" is one concise sentence. "body" is a 1-2 sentence ' +
                'markdown summary of just that concept. "relatesTo" is a list ' +
                'of OTHER concepts\' "slug" values from this same response that this concept is ' +
                "directly related to — omit it or leave it empty if none. Output only the JSON object.",
        },
        {
            role: "user",
            content: `File name: ${fileName}\n\nContent:\n${excerpt}`,
        },
    ];
}

function stripCodeFences(raw: string): string {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Small on-device models sometimes hit their output limit mid-response,
 * cutting the JSON off inside the array of concept objects. Rather than
 * discard the whole response, walk it bracket-by-bracket (skipping string
 * contents) and find the last point where a complete concept object was
 * just closed inside the array — i.e. the last "}" whose enclosing
 * structure is directly "[". Truncate there and close whatever brackets
 * are still open. Returns null if no safe truncation point exists (e.g.
 * the response was cut off before even one full object completed).
 */
function repairTruncatedJson(raw: string): unknown | null {
    const stack: string[] = [];
    let inString = false;
    let escape = false;
    let lastSafeIndex = -1;
    let lastSafeStack: string[] = [];

    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (inString) {
            if (escape) escape = false;
            else if (ch === "\\") escape = true;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') {
            inString = true;
            continue;
        }
        if (ch === "{" || ch === "[") {
            stack.push(ch);
        } else if (ch === "}" || ch === "]") {
            stack.pop();
            if (ch === "}" && stack.length > 0 && stack[stack.length - 1] === "[") {
                lastSafeIndex = i + 1;
                lastSafeStack = [...stack];
            }
        }
    }

    if (lastSafeIndex === -1) return null;

    let truncated = raw.slice(0, lastSafeIndex);
    for (let i = lastSafeStack.length - 1; i >= 0; i--) {
        truncated += lastSafeStack[i] === "{" ? "}" : "]";
    }

    try {
        return JSON.parse(truncated);
    } catch {
        return null;
    }
}

function slugifyCandidate(raw: string): string {
    return raw
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, MAX_SLUG_LENGTH);
}

function sanitize(parsed: unknown): DecomposedConcept[] | null {
    if (!parsed || typeof parsed !== "object") return null;
    
    // Accept either {"concepts": [...]} or bare [...]
    let list: unknown = (parsed as Record<string, unknown>).concepts;
    if (!Array.isArray(list)) {
        // Try as bare array if not wrapped
        if (Array.isArray(parsed)) {
            list = parsed;
        } else {
            console.warn("[okf/decompose] Missing or invalid 'concepts' field; got:", typeof parsed === "object" ? Object.keys(parsed) : typeof parsed);
            return null;
        }
    }

    if (!Array.isArray(list)) return null;

    const usedSlugs = new Set<string>();
    const rawEntries: { slug: string; entry: Record<string, unknown> }[] = [];

    for (const item of list) {
        if (!item || typeof item !== "object") continue;
        const obj = item as Record<string, unknown>;

        if (typeof obj.title !== "string" || !obj.title.trim()) continue;
        if (typeof obj.body !== "string" || !obj.body.trim()) continue;

        let slug = typeof obj.slug === "string" ? slugifyCandidate(obj.slug) : "";
        if (!slug) slug = slugifyCandidate(obj.title);
        if (!slug) continue;

        if (usedSlugs.has(slug)) {
            let n = 2;
            while (usedSlugs.has(`${slug}-${n}`)) n++;
            slug = `${slug}-${n}`;
        }
        usedSlugs.add(slug);

        rawEntries.push({ slug, entry: obj });
        if (rawEntries.length >= MAX_CONCEPTS) break;
    }

    if (rawEntries.length < MIN_CONCEPTS) {
        console.warn(`[okf/decompose] Too few concepts: found ${rawEntries.length}, need ≥${MIN_CONCEPTS}`);
        return null;
    }

    const result: DecomposedConcept[] = rawEntries.map(({ slug, entry }) => {
        const tags = Array.isArray(entry.tags)
            ? [
                  ...new Set(
                      entry.tags
                          .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
                          .map((t) => t.trim().slice(0, MAX_TAG_LENGTH))
                  ),
              ].slice(0, MAX_TAGS)
            : [];

        const relatesTo = Array.isArray(entry.relatesTo)
            ? [
                  ...new Set(
                      entry.relatesTo
                          .filter((r): r is string => typeof r === "string")
                          .map((r) => slugifyCandidate(r))
                          .filter((r) => r && r !== slug && usedSlugs.has(r))
                  ),
              ]
            : [];

        return {
            slug,
            title: String(entry.title).trim().slice(0, MAX_TITLE_LENGTH),
            type:
                typeof entry.type === "string" && entry.type.trim()
                    ? entry.type.trim().slice(0, MAX_TYPE_LENGTH)
                    : "Concept",
            tags,
            description:
                typeof entry.description === "string"
                    ? entry.description.trim().slice(0, MAX_DESCRIPTION_LENGTH)
                    : "",
            body: String(entry.body).trim(),
            relatesTo,
        };
    });

    return result;
}

async function runDecomposition(
    instance: LlmInference,
    fileName: string,
    text: string
): Promise<DecomposedConcept[] | null> {
    const prompt = await generateChatTemplate(buildMessages(fileName, text));

    const raw = await new Promise<string>((resolve, reject) => {
        let accumulated = "";
        try {
            instance.generateResponse(prompt, (chunk: string, done: boolean) => {
                if (done) {
                    resolve(accumulated.trim().replace(/<turn\|>\s*$/, "").replace(/<end_of_turn>\s*$/, "").trim());
                } else {
                    accumulated += chunk;
                }
            });
        } catch (err) {
            reject(err);
        }
    });

    console.debug("[okf/decompose] Model response:", raw.slice(0, 500));
    const cleaned = stripCodeFences(raw);

    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch (err) {
        const repaired = repairTruncatedJson(cleaned);
        if (repaired === null) throw err;
        console.warn("[okf/decompose] Response was truncated; recovered partial concepts from what parsed cleanly.");
        parsed = repaired;
    }

    return sanitize(parsed);
}

/**
 * Decomposes a document's text into several cross-linked OKF concepts using
 * the on-device model. Returns `null` on any failure (bad JSON, model error,
 * too few valid concepts) — callers should fall back to a single root
 * concept, exactly as ingest.ts already produces.
 */
export function extractConceptsWithLlm(
    instance: LlmInference,
    fileName: string,
    text: string
): Promise<DecomposedConcept[] | null> {
    return enqueueLlmCall(async () => {
        try {
            return await runDecomposition(instance, fileName, text);
        } catch (err) {
            console.warn("[okf/decompose] LLM decomposition failed, falling back to single concept:", err);
            return null;
        }
    });
}







