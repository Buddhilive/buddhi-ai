"use client";

import { useLiteRTModelStore } from "@/stores/litert-store";
import { PromptBuilderSession } from "@/components/custom/prompt-builder";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PromptBuilderPage() {
  const { liteRTModelStatus } = useLiteRTModelStore();

  return (
    <div className="flex flex-col h-full items-center justify-center p-4">
      {liteRTModelStatus === "ready" ? (
        <PromptBuilderSession />
      ) : liteRTModelStatus === "loading" || liteRTModelStatus === "idle" ? (
        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Spinner />
          <p className="text-sm">Loading language model...</p>
        </div>
      ) : (
        <Alert variant="destructive" className="max-w-md">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Model Unavailable</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">The Prompt Builder requires the Gemma 4 E2B model to be downloaded and ready.</p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/models">Go to Model Manager</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
