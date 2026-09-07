/**
 * Intercepts LiteRT-LM WebAssembly stderr messages.
 *
 * In the official @litert-lm/core WebAssembly build, C++ standard error (stderr)
 * is routed via Emscripten to `console.error`. This causes harmless diagnostic logs
 * (such as environment initialization, non-fatal NPU fallback checks, accelerator
 * registrations, and mel-filterbank DSP notices) to be treated as fatal errors
 * by the browser console and Next.js dev server overlays.
 *
 * This filter intercepts these LiteRT runtime diagnostics and redirects them
 * to `console.warn` instead of `console.error`.
 */

export function setupLiteRTLogFilter(): void {
    if (typeof window === "undefined") return;

    const globalObj = window as unknown as { __litert_log_filter_installed__?: boolean };
    if (globalObj.__litert_log_filter_installed__) return;
    globalObj.__litert_log_filter_installed__ = true;

    const originalError = console.error.bind(console);

    const isLiteRTDiagnostic = (firstArg: unknown): boolean => {
        if (typeof firstArg !== "string") return false;

        return (
            firstArg.startsWith("INFO: [") ||
            firstArg.startsWith("WARNING: [") ||
            /^(?:INFO|WARNING):\s*\[[\w_.-]+\.cc:\d+\]/.test(firstArg) ||
            /^W\d{4}\s+[\d:.]+\s+\d+\s+[\w_.-]+\.cc:\d+\]/.test(firstArg) ||
            firstArg.includes("npu_registry.cc") ||
            firstArg.includes("environment.cc") ||
            firstArg.includes("accelerator_registry.cc") ||
            firstArg.includes("gpu_registry.cc") ||
            firstArg.includes("cpu_registry.cc") ||
            firstArg.includes("mel_filterbank.cc") ||
            firstArg.includes("kLiteRtStatusErrorInvalidArgument")
        );
    };

    console.error = (...args: unknown[]) => {
        if (args.length > 0 && isLiteRTDiagnostic(args[0])) {
            console.warn("[LiteRT]", ...args);
            return;
        }
        originalError(...args);
    };
}

// Auto-run when imported on the client
if (typeof window !== "undefined") {
    setupLiteRTLogFilter();
}
