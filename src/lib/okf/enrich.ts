/**
 * enrich.ts — on-device LLM classification for concepts with no authored frontmatter.
 *
 * Mirrors the non-chat LLM call pattern in `src/lib/memory.ts` (`runSummarization`):
 * build a small BuddhiAIMessage[], render it via `generateChatTemplate`, and drive
 * `instance.generateResponse()` wrapped in a Promise. Never throws — callers get
 * `null` on any failure and fall back to the synthesized frontmatter from ingest.ts.
 */

import type { LlmInference } from "@mediapipe/tasks-genai";
import { generateChatTemplate } from "@/lib/buddhi-ai-core/chat-template-generator";
import type { BuddhiAIMessage } from "@/types/messages";
import type { OkfFrontmatter } from "@/lib/okf/types";

const MAX_BODY_CHARS = 4000;
const MAX_TAGS = 6;
const MAX_TAG_LENGTH = 30;
const MAX_TYPE_LENGTH = 40;
const MAX_DESCRIPTION_LENGTH = 200;

export type EnrichedFields = Partial<Pick<OkfFrontmatter, "type" | "tags" | "description">>;

// MediaPipe's LlmInference is not reentrant — serialize extraction calls so
// concurrent document uploads (documents.ts allows up to 5 in parallel) never
// call generateResponse on top of each other.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const result = queue.then(fn, fn);
    queue = result.catch(() => undefined);
    return result;
}

function buildMessages(fileName: string, body: string): BuddhiAIMessage[] {
    const excerpt = body.slice(0, MAX_BODY_CHARS);
    return [
        {
            role: "system",
            content:
                "You classify documents for a knowledge base. Given a file name and its " +
                "content, respond with STRICT JSON only — no markdown fences, no commentary, " +
                'no text before or after. Schema: {"type": string, "tags": string[], "description": string}. ' +
                '"type" is a short 1-3 word noun phrase naming the kind of document (e.g. ' +
                '"Meeting Notes", "API Reference", "Recipe", "Research Paper"). "tags" is up to ' +
                "6 short lowercase keywords for the document's topics. \"description\" is one " +
                "concise sentence summarizing the document. Output only the JSON object.",
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

function sanitize(parsed: unknown): EnrichedFields | null {
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    const result: EnrichedFields = {};

    if (typeof obj.type === "string" && obj.type.trim()) {
        result.type = obj.type.trim().slice(0, MAX_TYPE_LENGTH);
    }

    if (Array.isArray(obj.tags)) {
        const tags = [
            ...new Set(
                obj.tags
                    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
                    .map((t) => t.trim().slice(0, MAX_TAG_LENGTH))
            ),
        ].slice(0, MAX_TAGS);
        if (tags.length > 0) result.tags = tags;
    }

    if (typeof obj.description === "string" && obj.description.trim()) {
        result.description = obj.description.trim().slice(0, MAX_DESCRIPTION_LENGTH);
    }

    return Object.keys(result).length > 0 ? result : null;
}

async function runExtraction(
    instance: LlmInference,
    fileName: string,
    body: string
): Promise<EnrichedFields | null> {
    const prompt = await generateChatTemplate(buildMessages(fileName, body));

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

    const parsed = JSON.parse(stripCodeFences(raw));
    return sanitize(parsed);
}

/**
 * Classifies `type`/`tags`/`description` from a concept's content using the
 * on-device model. Returns `null` on any failure (bad JSON, model error,
 * empty result) — callers should keep their existing fallback frontmatter.
 */
export function extractFrontmatterWithLlm(
    instance: LlmInference,
    fileName: string,
    body: string
): Promise<EnrichedFields | null> {
    return enqueue(async () => {
        try {
            return await runExtraction(instance, fileName, body);
        } catch (err) {
            console.warn("[okf/enrich] LLM extraction failed, falling back to defaults:", err);
            return null;
        }
    });
}
