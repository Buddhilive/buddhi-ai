/**
 * translate-gemma.ts
 *
 * Standalone translation engine built on top of MediaPipe LlmInference.
 * Manages its OWN LlmInference instance — completely separate from the
 * conversational chat engine in use-ai-model.ts.
 *
 * TranslateGemma uses the Gemma 4 token syntax but with a dedicated
 * translation instruction format derived from its chat_template.jinja:
 *
 *   <|turn|>user
 *   Translate the following {src_lang} source text to {tgt_lang}:
 *   {text}<turn|>
 *   <|turn|>model
 *
 * References:
 *   - https://huggingface.co/google/translategemma-4b-it
 *   - https://huggingface.co/spaces/webml-community/TranslateGemma-WebGPU
 */

import { FilesetResolver, LlmInference } from "@mediapipe/tasks-genai";

// ─── Language list ────────────────────────────────────────────────────────────

export interface TranslateGemmaLanguage {
    /** ISO 639-1 Alpha-2 code used in the prompt template. */
    code: string;
    /** English display name. */
    name: string;
    /** Native name for display (shown in parentheses in the UI). */
    nativeName: string;
}

/**
 * All 56 languages supported by TranslateGemma 4B-IT.
 * Codes are ISO 639-1 two-letter codes as required by the model's chat template.
 * Order: alphabetical by English name.
 */
export const TRANSLATE_GEMMA_LANGUAGES: TranslateGemmaLanguage[] = [
    { code: "af", name: "Afrikaans", nativeName: "Afrikaans" },
    { code: "sq", name: "Albanian", nativeName: "Shqip" },
    { code: "ar", name: "Arabic", nativeName: "العربية" },
    { code: "hy", name: "Armenian", nativeName: "Հայերեն" },
    { code: "az", name: "Azerbaijani", nativeName: "Azərbaycan" },
    { code: "eu", name: "Basque", nativeName: "Euskara" },
    { code: "bn", name: "Bengali", nativeName: "বাংলা" },
    { code: "bg", name: "Bulgarian", nativeName: "Български" },
    { code: "ca", name: "Catalan", nativeName: "Català" },
    { code: "zh", name: "Chinese (Simplified)", nativeName: "中文" },
    { code: "hr", name: "Croatian", nativeName: "Hrvatski" },
    { code: "cs", name: "Czech", nativeName: "Čeština" },
    { code: "da", name: "Danish", nativeName: "Dansk" },
    { code: "nl", name: "Dutch", nativeName: "Nederlands" },
    { code: "en", name: "English", nativeName: "English" },
    { code: "et", name: "Estonian", nativeName: "Eesti" },
    { code: "fi", name: "Finnish", nativeName: "Suomi" },
    { code: "fr", name: "French", nativeName: "Français" },
    { code: "gl", name: "Galician", nativeName: "Galego" },
    { code: "ka", name: "Georgian", nativeName: "ქართული" },
    { code: "de", name: "German", nativeName: "Deutsch" },
    { code: "el", name: "Greek", nativeName: "Ελληνικά" },
    { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
    { code: "he", name: "Hebrew", nativeName: "עברית" },
    { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
    { code: "hu", name: "Hungarian", nativeName: "Magyar" },
    { code: "is", name: "Icelandic", nativeName: "Íslenska" },
    { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
    { code: "ga", name: "Irish", nativeName: "Gaeilge" },
    { code: "it", name: "Italian", nativeName: "Italiano" },
    { code: "ja", name: "Japanese", nativeName: "日本語" },
    { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
    { code: "kk", name: "Kazakh", nativeName: "Қазақ" },
    { code: "km", name: "Khmer", nativeName: "ខ្មែរ" },
    { code: "ko", name: "Korean", nativeName: "한국어" },
    { code: "lv", name: "Latvian", nativeName: "Latviešu" },
    { code: "lt", name: "Lithuanian", nativeName: "Lietuvių" },
    { code: "mk", name: "Macedonian", nativeName: "Македонски" },
    { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
    { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
    { code: "mt", name: "Maltese", nativeName: "Malti" },
    { code: "mr", name: "Marathi", nativeName: "मराठी" },
    { code: "mn", name: "Mongolian", nativeName: "Монгол" },
    { code: "no", name: "Norwegian", nativeName: "Norsk" },
    { code: "fa", name: "Persian", nativeName: "فارسی" },
    { code: "pl", name: "Polish", nativeName: "Polski" },
    { code: "pt", name: "Portuguese", nativeName: "Português" },
    { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
    { code: "ro", name: "Romanian", nativeName: "Română" },
    { code: "ru", name: "Russian", nativeName: "Русский" },
    { code: "sr", name: "Serbian", nativeName: "Српски" },
    { code: "sk", name: "Slovak", nativeName: "Slovenčina" },
    { code: "sl", name: "Slovenian", nativeName: "Slovenščina" },
    { code: "es", name: "Spanish", nativeName: "Español" },
    { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
    { code: "sv", name: "Swedish", nativeName: "Svenska" },
    { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
    { code: "te", name: "Telugu", nativeName: "తెలుగు" },
    { code: "th", name: "Thai", nativeName: "ภาษาไทย" },
    { code: "tr", name: "Turkish", nativeName: "Türkçe" },
    { code: "uk", name: "Ukrainian", nativeName: "Українська" },
    { code: "ur", name: "Urdu", nativeName: "اردو" },
    { code: "uz", name: "Uzbek", nativeName: "Oʻzbek" },
    { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
    { code: "cy", name: "Welsh", nativeName: "Cymraeg" },
    { code: "zu", name: "Zulu", nativeName: "isiZulu" },
];

// A quick Set for O(1) validation lookups.
const SUPPORTED_CODES = new Set(TRANSLATE_GEMMA_LANGUAGES.map((l) => l.code));

// ─── Prompt template ──────────────────────────────────────────────────────────

/**
 * Build the TranslateGemma prompt string.
 *
 * The format mirrors the model's `chat_template.jinja`:
 *   - Gemma 4 turn tokens are used (<|turn|> / <turn|>)
 *   - Source and target language names (not codes) are used in the instruction
 *     to give the model the clearest possible signal.
 *
 * @throws {TranslateGemmaError} if a language code is not supported.
 */
function buildTranslationPrompt(
    text: string,
    sourceLangCode: string,
    targetLangCode: string
): string {
    const srcLang = TRANSLATE_GEMMA_LANGUAGES.find((l) => l.code === sourceLangCode);
    const tgtLang = TRANSLATE_GEMMA_LANGUAGES.find((l) => l.code === targetLangCode);

    if (!srcLang) {
        throw new TranslateGemmaError(
            `Unsupported source language code: "${sourceLangCode}". ` +
                `Use one of the codes from TRANSLATE_GEMMA_LANGUAGES.`,
            "UNSUPPORTED_LANGUAGE"
        );
    }
    if (!tgtLang) {
        throw new TranslateGemmaError(
            `Unsupported target language code: "${targetLangCode}". ` +
                `Use one of the codes from TRANSLATE_GEMMA_LANGUAGES.`,
            "UNSUPPORTED_LANGUAGE"
        );
    }
    if (sourceLangCode === targetLangCode) {
        throw new TranslateGemmaError(
            "Source and target languages must be different.",
            "SAME_LANGUAGE"
        );
    }
    if (!text.trim()) {
        throw new TranslateGemmaError(
            "Source text is empty. Please provide text to translate.",
            "EMPTY_TEXT"
        );
    }

    // Gemma 4 instruction-tuned translation format.
    // The model was fine-tuned to expect language names in the instruction.
    return (
        `<|turn|>user\n` +
        `Translate the following ${srcLang.name} source text to ${tgtLang.name}:\n` +
        `${text.trim()}<turn|>\n` +
        `<|turn|>model\n`
    );
}

// ─── Error class ──────────────────────────────────────────────────────────────

export type TranslateGemmaErrorCode =
    | "NOT_INITIALIZED"
    | "ALREADY_INITIALIZING"
    | "INIT_FAILED"
    | "UNSUPPORTED_LANGUAGE"
    | "SAME_LANGUAGE"
    | "EMPTY_TEXT"
    | "INFERENCE_FAILED"
    | "DISPOSE_WHILE_TRANSLATING";

export class TranslateGemmaError extends Error {
    readonly code: TranslateGemmaErrorCode;

    constructor(message: string, code: TranslateGemmaErrorCode) {
        super(`[TranslateGemma] ${message}`);
        this.name = "TranslateGemmaError";
        this.code = code;
    }
}

// ─── Engine singleton ─────────────────────────────────────────────────────────

type EngineStatus = "idle" | "loading" | "ready" | "error";

let _instance: LlmInference | null = null;
let _status: EngineStatus = "idle";
let _initError: string | null = null;
let _isTranslating = false;
let _initPromise: Promise<void> | null = null;

// Status change subscribers (simple pub/sub so the store/hook can react).
type StatusListener = (status: EngineStatus, error?: string) => void;
const _statusListeners = new Set<StatusListener>();

function notifyStatus(status: EngineStatus, error?: string) {
    _status = status;
    _initError = error ?? null;
    for (const listener of _statusListeners) {
        listener(status, error);
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Subscribe to engine status changes. Returns an unsubscribe function.
 */
export function onTranslateGemmaStatus(listener: StatusListener): () => void {
    _statusListeners.add(listener);
    // Immediately call with current state so the subscriber is up to date.
    listener(_status, _initError ?? undefined);
    return () => _statusListeners.delete(listener);
}

/**
 * Current engine status — useful for one-shot reads without subscribing.
 */
export function getTranslateGemmaStatus(): EngineStatus {
    return _status;
}

/**
 * Initialise the TranslateGemma LlmInference engine.
 *
 * @param objectUrl A blob: URL pointing to the downloaded .task model file.
 *                  Obtain via `getModelObjectURL(modelId)` from model-manager.ts.
 *
 * Safe to call multiple times — concurrent calls are deduplicated.
 * Once initialised, subsequent calls are no-ops.
 */
export async function initTranslateGemma(objectUrl: string): Promise<void> {
    // Already good.
    if (_instance) return;

    // Deduplicate concurrent init calls.
    if (_initPromise) return _initPromise;

    notifyStatus("loading");

    _initPromise = (async () => {
        try {
            const genai = await FilesetResolver.forGenAiTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest/wasm"
            );

            _instance = await LlmInference.createFromOptions(genai, {
                baseOptions: { modelAssetPath: objectUrl },
                // TranslateGemma context: 2K input tokens (model spec).
                // We use 4096 max to allow some headroom in output.
                maxTokens: 4096,
            });

            notifyStatus("ready");
            console.info(
                "[TranslateGemma] Engine initialised successfully."
            );
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : String(err);
            notifyStatus(
                "error",
                `Failed to initialise TranslateGemma engine: ${msg}`
            );
            console.error("[TranslateGemma] Init error:", err);
            throw new TranslateGemmaError(
                `Engine initialisation failed: ${msg}`,
                "INIT_FAILED"
            );
        } finally {
            _initPromise = null;
        }
    })();

    return _initPromise;
}

/**
 * Translate text synchronously (waits for the full response).
 *
 * @param text           The source text to translate.
 * @param sourceLangCode ISO 639-1 code of the source language.
 * @param targetLangCode ISO 639-1 code of the target language.
 * @returns Translated text string.
 *
 * @throws {TranslateGemmaError} for all known failure modes.
 */
export async function translate(
    text: string,
    sourceLangCode: string,
    targetLangCode: string
): Promise<string> {
    if (!_instance) {
        throw new TranslateGemmaError(
            "Engine is not initialised. Call initTranslateGemma() first.",
            "NOT_INITIALIZED"
        );
    }

    const prompt = buildTranslationPrompt(text, sourceLangCode, targetLangCode);

    try {
        _isTranslating = true;
        const result = await _instance.generateResponse(prompt);
        return result.trim();
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[TranslateGemma] Inference error:", err);
        throw new TranslateGemmaError(
            `Translation failed: ${msg}`,
            "INFERENCE_FAILED"
        );
    } finally {
        _isTranslating = false;
    }
}

/**
 * Translate text with streaming output (tokens delivered as they are generated).
 *
 * @param text             The source text.
 * @param sourceLangCode   ISO 639-1 source language code.
 * @param targetLangCode   ISO 639-1 target language code.
 * @param onChunk          Called with each new text chunk as it streams in.
 * @param onDone           Called when translation is complete with the full text.
 * @param onError          Called if an error occurs.
 */
export function translateStream(
    text: string,
    sourceLangCode: string,
    targetLangCode: string,
    onChunk: (chunk: string, done: boolean) => void,
    onDone: (fullText: string) => void,
    onError: (error: TranslateGemmaError) => void
): void {
    if (!_instance) {
        onError(
            new TranslateGemmaError(
                "Engine is not initialised. Call initTranslateGemma() first.",
                "NOT_INITIALIZED"
            )
        );
        return;
    }

    let prompt: string;
    try {
        prompt = buildTranslationPrompt(text, sourceLangCode, targetLangCode);
    } catch (err) {
        onError(
            err instanceof TranslateGemmaError
                ? err
                : new TranslateGemmaError(String(err), "INFERENCE_FAILED")
        );
        return;
    }

    _isTranslating = true;
    let accumulated = "";

    _instance.generateResponse(
        prompt,
        (partialResult: string, done: boolean) => {
            accumulated += partialResult;
            // Strip any model turn tokens that may leak into output.
            const cleaned = accumulated.replace(/<turn\|>/g, "").replace(/<\|turn\|>/g, "");
            onChunk(cleaned, done);
            if (done) {
                _isTranslating = false;
                onDone(cleaned.trim());
            }
        }
    );
}

/**
 * Returns true if a translation is currently in progress.
 */
export function isTranslating(): boolean {
    return _isTranslating;
}

/**
 * Validate a language code without throwing  — returns true if supported.
 */
export function isSupportedLanguageCode(code: string): boolean {
    return SUPPORTED_CODES.has(code);
}

/**
 * Look up a language by its code. Returns undefined if not found.
 */
export function getLanguageByCode(
    code: string
): TranslateGemmaLanguage | undefined {
    return TRANSLATE_GEMMA_LANGUAGES.find((l) => l.code === code);
}

/**
 * Dispose of the TranslateGemma engine and release WASM memory.
 * After calling this, call `initTranslateGemma()` again to re-initialise.
 *
 * @throws {TranslateGemmaError} if a translation is in progress.
 */
export async function disposeTranslateGemma(): Promise<void> {
    if (_isTranslating) {
        throw new TranslateGemmaError(
            "Cannot dispose engine while a translation is in progress. " +
                "Wait for the current translation to complete first.",
            "DISPOSE_WHILE_TRANSLATING"
        );
    }
    if (_instance) {
        try {
            _instance.close();
        } catch (err) {
            // close() may throw if already disposed; log and continue.
            console.warn("[TranslateGemma] Error during dispose:", err);
        }
        _instance = null;
    }
    notifyStatus("idle");
    console.info("[TranslateGemma] Engine disposed.");
}
