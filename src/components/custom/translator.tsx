"use client";

/**
 * translator.tsx
 *
 * TranslatorView — full-featured translation UI powered by TranslateGemma.
 *
 * COMPONENT TREE
 * --------------
 *  TranslatorView             ← default export; gates on engine status
 *    ├─ TranslatorLoadingState   ← spinner while engine initialises
 *    ├─ TranslatorUnavailableState ← CTA when model is not downloaded
 *    └─ TranslatorSession        ← full UI, only mounted when engine is ready
 *         ├─ LanguageSelector    ← searchable dropdown (source + target)
 *         └─ translation panels (input + output)
 */

import { useTranslateEngine } from "@/hooks/use-translate-engine";
import { useTranslateGemmaStore } from "@/stores/translate-gemma-store";
import { useModelStore } from "@/stores/model-store";
import {
    translate,
    translateStream,
    TRANSLATE_GEMMA_LANGUAGES,
    type TranslateGemmaLanguage,
    TranslateGemmaError,
} from "@/lib/translate-gemma";
import {
    ModelSelector,
    ModelSelectorContent,
    ModelSelectorEmpty,
    ModelSelectorGroup,
    ModelSelectorInput,
    ModelSelectorItem,
    ModelSelectorList,
    ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
    ArrowLeftRight,
    BrainCircuit,
    CheckIcon,
    ChevronDown,
    CircleAlert,
    Copy,
    Languages,
    RotateCcw,
    X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRANSLATE_GEMMA_MODEL_ID = "litert-community/TranslateGemma-4B-IT";

/** Approximate max characters to accept (2K tokens ≈ 8K chars for most languages). */
const MAX_CHARS = 6000;
const WARN_CHARS = 5000;

// ─── Gate States ─────────────────────────────────────────────────────────────

function TranslatorLoadingState({ message }: { message?: string }) {
    return (
        <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-4 text-center">
            <Spinner className="size-8" />
            <p className="text-muted-foreground text-sm">
                {message ?? "Loading TranslateGemma engine…"}
            </p>
            <p className="text-muted-foreground max-w-sm text-xs">
                This may take a moment the first time while the model initialises in your browser.
            </p>
        </div>
    );
}

function TranslatorUnavailableState({ isError, errorMessage }: { isError: boolean; errorMessage?: string }) {
    return (
        <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-6 px-6 text-center">
            <div className="flex flex-col items-center gap-3">
                <Languages className="text-muted-foreground size-12" />
                <h2 className="text-lg font-semibold">
                    {isError ? "Translation engine failed to load" : "Translation model not downloaded"}
                </h2>
                <p className="text-muted-foreground max-w-sm text-sm">
                    {isError
                        ? (errorMessage ?? "The TranslateGemma engine could not be initialised. Try reloading the page. If the problem persists, re-download the model.")
                        : "Download the Translate Gemma model to use the in-browser translator. All translation runs locally — your text never leaves your device."}
                </p>

                {isError && errorMessage && (
                    <details className="mt-2 w-full max-w-md text-left">
                        <summary className="text-muted-foreground cursor-pointer text-xs">
                            Technical details
                        </summary>
                        <pre className="bg-muted mt-2 rounded-md p-2 text-xs overflow-auto whitespace-pre-wrap break-all">
                            {errorMessage}
                        </pre>
                    </details>
                )}
            </div>
            <Button asChild>
                <Link href="/models">
                    <BrainCircuit className="mr-2 size-4" />
                    {isError ? "Manage Models" : "Download Translate Gemma"}
                </Link>
            </Button>
        </div>
    );
}

// ─── Language Selector ────────────────────────────────────────────────────────

interface LanguageSelectorProps {
    value: string;
    onChange: (code: string) => void;
    excludeCode?: string;
    label: string;
    id: string;
}

function LanguageSelector({ value, onChange, excludeCode, label, id }: LanguageSelectorProps) {
    const [open, setOpen] = useState(false);

    const selected = TRANSLATE_GEMMA_LANGUAGES.find((l) => l.code === value);
    const available = TRANSLATE_GEMMA_LANGUAGES.filter((l) => l.code !== excludeCode);

    const handleSelect = useCallback(
        (code: string) => {
            onChange(code);
            setOpen(false);
        },
        [onChange]
    );

    return (
        <ModelSelector open={open} onOpenChange={setOpen}>
            <ModelSelectorTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    aria-label={`${label}: ${selected?.name ?? "Select language"}`}
                    className="flex h-9 min-w-[160px] items-center justify-between gap-2 px-3 font-normal"
                >
                    <span className="flex items-center gap-1.5 truncate">
                        <span className="font-medium">{selected?.name ?? "Select language"}</span>
                        {selected && (
                            <span className="text-muted-foreground text-xs">({selected.code})</span>
                        )}
                    </span>
                    <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                </Button>
            </ModelSelectorTrigger>

            <ModelSelectorContent title={label} className="w-[280px]">
                <ModelSelectorInput
                    placeholder="Search language…"
                    aria-label={`Search ${label.toLowerCase()}`}
                />
                <ModelSelectorList>
                    <ModelSelectorEmpty>No language found.</ModelSelectorEmpty>
                    <ModelSelectorGroup>
                        {available.map((lang) => (
                            <ModelSelectorItem
                                key={lang.code}
                                value={`${lang.name} ${lang.nativeName} ${lang.code}`}
                                onSelect={() => handleSelect(lang.code)}
                                className="flex items-center justify-between"
                                aria-selected={lang.code === value}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="font-medium">{lang.name}</span>
                                    <span className="text-muted-foreground text-xs">
                                        {lang.nativeName}
                                    </span>
                                </span>
                                <span className="text-muted-foreground ml-2 shrink-0 font-mono text-xs">
                                    {lang.code}
                                </span>
                            </ModelSelectorItem>
                        ))}
                    </ModelSelectorGroup>
                </ModelSelectorList>
            </ModelSelectorContent>
        </ModelSelector>
    );
}

// ─── Translator Session ───────────────────────────────────────────────────────

function TranslatorSession() {
    const [sourceLang, setSourceLang] = useState<TranslateGemmaLanguage>(
        TRANSLATE_GEMMA_LANGUAGES.find((l) => l.code === "en")!
    );
    const [targetLang, setTargetLang] = useState<TranslateGemmaLanguage>(
        TRANSLATE_GEMMA_LANGUAGES.find((l) => l.code === "es")!
    );
    const [sourceText, setSourceText] = useState("");
    const [outputText, setOutputText] = useState("");
    const [isTranslating, setIsTranslating] = useState(false);
    const [error, setError] = useState<{ title: string; detail: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const outputRef = useRef<HTMLDivElement>(null);
    const sourceRef = useRef<HTMLTextAreaElement>(null);

    const charCount = sourceText.length;
    const isOverLimit = charCount > MAX_CHARS;
    const isNearLimit = charCount > WARN_CHARS && !isOverLimit;

    // Auto-scroll output as it streams.
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [outputText]);

    const handleSourceLangChange = useCallback((code: string) => {
        const lang = TRANSLATE_GEMMA_LANGUAGES.find((l) => l.code === code);
        if (lang) setSourceLang(lang);
    }, []);

    const handleTargetLangChange = useCallback((code: string) => {
        const lang = TRANSLATE_GEMMA_LANGUAGES.find((l) => l.code === code);
        if (lang) setTargetLang(lang);
    }, []);

    const handleSwapLanguages = useCallback(() => {
        setSourceLang(targetLang);
        setTargetLang(sourceLang);
        // Optionally swap text too if there is translated output.
        if (outputText.trim()) {
            setSourceText(outputText.trim());
            setOutputText("");
        }
    }, [sourceLang, targetLang, outputText]);

    const handleClearSource = useCallback(() => {
        setSourceText("");
        setOutputText("");
        setError(null);
        sourceRef.current?.focus();
    }, []);

    const handleCopyOutput = useCallback(() => {
        if (!outputText.trim()) return;
        if (!navigator.clipboard) {
            toast.error("Clipboard is not available in this browser.");
            return;
        }
        navigator.clipboard
            .writeText(outputText.trim())
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch((err) => {
                console.error("[Translator] Clipboard write failed:", err);
                toast.error("Could not copy to clipboard.");
            });
    }, [outputText]);

    const handleTranslate = useCallback(() => {
        if (!sourceText.trim()) {
            setError({ title: "Empty source text", detail: "Please enter text to translate." });
            return;
        }
        if (isOverLimit) {
            setError({
                title: "Text too long",
                detail: `The source text exceeds the maximum of ${MAX_CHARS.toLocaleString()} characters. TranslateGemma supports up to 2,000 input tokens.`,
            });
            return;
        }
        if (sourceLang.code === targetLang.code) {
            setError({
                title: "Same language selected",
                detail: "Source and target languages must be different.",
            });
            return;
        }

        setError(null);
        setOutputText("");
        setIsTranslating(true);

        translateStream(
            sourceText,
            sourceLang.code,
            targetLang.code,
            // onChunk — called with each streamed chunk
            (accumulated: string) => {
                setOutputText(accumulated);
            },
            // onDone — called with the final cleaned result
            (fullText: string) => {
                setOutputText(fullText);
                setIsTranslating(false);
            },
            // onError
            (err: TranslateGemmaError) => {
                console.error("[Translator] Translation error:", err);
                setIsTranslating(false);

                const errorMessages: Record<string, { title: string; detail: string }> = {
                    NOT_INITIALIZED: {
                        title: "Engine not ready",
                        detail: "The translation engine is not initialised. Please refresh the page.",
                    },
                    UNSUPPORTED_LANGUAGE: {
                        title: "Unsupported language",
                        detail: err.message,
                    },
                    SAME_LANGUAGE: {
                        title: "Same language",
                        detail: "Source and target languages must be different.",
                    },
                    EMPTY_TEXT: {
                        title: "Empty text",
                        detail: "Please enter text to translate.",
                    },
                    INFERENCE_FAILED: {
                        title: "Translation failed",
                        detail: `The model encountered an error during inference. ${err.message}`,
                    },
                };

                const mapped = errorMessages[err.code] ?? {
                    title: "Translation error",
                    detail: err.message,
                };
                setError(mapped);
            }
        );
    }, [sourceText, sourceLang, targetLang, isOverLimit]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            // Ctrl/Cmd + Enter to translate
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                if (!isTranslating && sourceText.trim()) {
                    handleTranslate();
                }
            }
        },
        [handleTranslate, isTranslating, sourceText]
    );

    return (
        <div className="flex h-[calc(100vh-80px)] flex-col gap-0 overflow-hidden">
            {/* ── Header ───────────────────────────────────────────── */}
            <div className="flex shrink-0 flex-col gap-3 border-b px-6 py-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Source language */}
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                            From
                        </span>
                        <LanguageSelector
                            id="source-language-selector"
                            label="Source Language"
                            value={sourceLang.code}
                            onChange={handleSourceLangChange}
                            excludeCode={targetLang.code}
                        />
                    </div>

                    {/* Swap button */}
                    <Button
                        id="swap-languages-btn"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full"
                        onClick={handleSwapLanguages}
                        disabled={isTranslating}
                        aria-label="Swap source and target languages"
                        title="Swap languages"
                    >
                        <ArrowLeftRight className="size-4" />
                    </Button>

                    {/* Target language */}
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                            To
                        </span>
                        <LanguageSelector
                            id="target-language-selector"
                            label="Target Language"
                            value={targetLang.code}
                            onChange={handleTargetLangChange}
                            excludeCode={sourceLang.code}
                        />
                    </div>

                    {/* Translate button */}
                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            id="translate-btn"
                            onClick={handleTranslate}
                            disabled={isTranslating || !sourceText.trim() || isOverLimit}
                            size="sm"
                            className="gap-2 px-4"
                        >
                            {isTranslating ? (
                                <>
                                    <Spinner className="size-3.5" />
                                    Translating…
                                </>
                            ) : (
                                <>
                                    <Languages className="size-3.5" />
                                    Translate
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Keyboard shortcut hint */}
                <p className="text-muted-foreground text-xs">
                    Press{" "}
                    <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-xs">Ctrl+Enter</kbd>
                    {" "}to translate
                </p>
            </div>

            {/* ── Error alert ───────────────────────────────────────── */}
            {error && (
                <div className="shrink-0 px-6 pt-3">
                    <Alert variant="destructive" className="flex items-start gap-3">
                        <CircleAlert className="mt-0.5 size-4 shrink-0" />
                        <div className="flex-1">
                            <AlertTitle>{error.title}</AlertTitle>
                            <AlertDescription className="text-sm">{error.detail}</AlertDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 shrink-0 opacity-70 hover:opacity-100"
                            onClick={() => setError(null)}
                            aria-label="Dismiss error"
                        >
                            <X className="size-3.5" />
                        </Button>
                    </Alert>
                </div>
            )}

            {/* ── Translation panels (split view) ──────────────────── */}
            <div className="grid min-h-0 flex-1 grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
                {/* Source panel */}
                <div className="relative flex min-h-0 flex-col">
                    {/* Panel header */}
                    <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
                        <span className="text-sm font-medium">
                            {sourceLang.name}
                            <span className="text-muted-foreground ml-1.5 font-normal">
                                ({sourceLang.nativeName})
                            </span>
                        </span>
                        {sourceText && (
                            <Button
                                id="clear-source-btn"
                                variant="ghost"
                                size="icon"
                                className="size-6 opacity-60 hover:opacity-100"
                                onClick={handleClearSource}
                                aria-label="Clear source text"
                                title="Clear"
                            >
                                <X className="size-3.5" />
                            </Button>
                        )}
                    </div>

                    {/* Textarea */}
                    <textarea
                        id="source-text-area"
                        ref={sourceRef}
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter text to translate…"
                        className="flex-1 resize-none bg-transparent p-4 text-sm outline-none placeholder:text-muted-foreground/60 min-h-[200px]"
                        spellCheck
                        aria-label="Source text"
                        aria-describedby="source-char-count"
                    />

                    {/* Character count */}
                    <div
                        id="source-char-count"
                        className={`shrink-0 flex items-center justify-end px-4 pb-2 text-xs ${
                            isOverLimit
                                ? "text-destructive font-medium"
                                : isNearLimit
                                ? "text-amber-500"
                                : "text-muted-foreground"
                        }`}
                    >
                        {isOverLimit && <CircleAlert className="mr-1 size-3" />}
                        {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                        {isOverLimit && " — text too long"}
                    </div>
                </div>

                {/* Output panel */}
                <div className="relative flex min-h-0 flex-col">
                    {/* Panel header */}
                    <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
                        <span className="text-sm font-medium">
                            {targetLang.name}
                            <span className="text-muted-foreground ml-1.5 font-normal">
                                ({targetLang.nativeName})
                            </span>
                        </span>
                        <div className="flex items-center gap-1">
                            {outputText && !isTranslating && (
                                <>
                                    {/* Copy button */}
                                    <Button
                                        id="copy-output-btn"
                                        variant="ghost"
                                        size="icon"
                                        className="size-6 opacity-60 hover:opacity-100"
                                        onClick={handleCopyOutput}
                                        aria-label="Copy translation"
                                        title="Copy"
                                    >
                                        {copied ? (
                                            <CheckIcon className="size-3.5 text-green-500" />
                                        ) : (
                                            <Copy className="size-3.5" />
                                        )}
                                    </Button>
                                    {/* Retranslate button */}
                                    <Button
                                        id="retranslate-btn"
                                        variant="ghost"
                                        size="icon"
                                        className="size-6 opacity-60 hover:opacity-100"
                                        onClick={handleTranslate}
                                        aria-label="Re-translate"
                                        title="Retranslate"
                                    >
                                        <RotateCcw className="size-3.5" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Output content */}
                    <div
                        ref={outputRef}
                        className="flex-1 overflow-y-auto p-4 text-sm min-h-[200px]"
                        aria-live="polite"
                        aria-label="Translation output"
                    >
                        {isTranslating && !outputText && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Spinner className="size-4" />
                                <span className="text-sm">Translating…</span>
                            </div>
                        )}

                        {outputText ? (
                            <p className="whitespace-pre-wrap leading-relaxed">
                                {outputText}
                                {isTranslating && (
                                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-middle" />
                                )}
                            </p>
                        ) : (
                            !isTranslating && (
                                <p className="text-muted-foreground/60 text-sm italic select-none">
                                    Translation will appear here…
                                </p>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * TranslatorView — entry point for the /translator route.
 *
 * Calls useTranslateEngine() to auto-initialise the model when downloaded,
 * then gates the TranslatorSession behind engine readiness.
 */
export function TranslatorView() {
    // Initialise the engine while this component is mounted.
    useTranslateEngine();

    const status = useTranslateGemmaStore((s) => s.status);
    const error = useTranslateGemmaStore((s) => s.error);
    const models = useModelStore((s) => s.models);
    const hydrated = useModelStore((s) => s.hydrated);

    const isModelDownloaded =
        hydrated && models[TRANSLATE_GEMMA_MODEL_ID]?.status === "completed";

    // Model not downloaded at all — show download CTA.
    if (!isModelDownloaded) {
        return <TranslatorUnavailableState isError={false} />;
    }

    // Engine is loading.
    if (status === "idle" || status === "loading") {
        return <TranslatorLoadingState />;
    }

    // Engine failed.
    if (status === "error") {
        return <TranslatorUnavailableState isError errorMessage={error} />;
    }

    // Engine ready — render the full UI.
    return <TranslatorSession />;
}
