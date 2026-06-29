import { Spinner } from "@/components/ui/spinner";
import { BrainCircuitIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Shown while `useModelEngine` is initialising the LlmInference instance
 * (i.e. `liteRTModelStatus` is `'idle'` or `'loading'`).
 */
export function ModelLoadingState() {
    return (
        <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-4 text-center">
            <Spinner className="size-8" />
            <p className="text-muted-foreground text-sm">Loading AI model…</p>
        </div>
    );
}

/**
 * Shown when the store is hydrated but no completed language model was found,
 * OR when LlmInference initialisation failed.
 *
 * Gives the user a clear path to the Model Manager so they can download one.
 */
export function ModelUnavailableState({ isError }: { isError: boolean }) {
    return (
        <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-6 px-6 text-center">
            <div className="flex flex-col items-center gap-3">
                <BrainCircuitIcon className="text-muted-foreground size-12" />
                <h2 className="text-lg font-semibold">
                    {isError ? "Model failed to load" : "No AI model available"}
                </h2>
                <p className="text-muted-foreground max-w-sm text-sm">
                    {isError
                        ? "The language model could not be initialised. Try reloading the page. If the problem persists, re-download the model."
                        : "Download a language model to start chatting. All inference runs locally — your data never leaves your device."}
                </p>
            </div>
            <Button asChild>
                <Link href="/models">
                    <BrainCircuitIcon className="mr-2 size-4" />
                    {isError ? "Manage Models" : "Download a Model"}
                </Link>
            </Button>
        </div>
    );
}
