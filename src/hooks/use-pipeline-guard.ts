"use client";

import { useEffect } from "react";
import { useIngestionStore } from "@/stores/ingestion-store";

/**
 * Hook to guard against accidental browser tab or window closure
 * while document ingestion and vector embedding is in progress.
 */
export function usePipelineGuard() {
  const isProcessing = useIngestionStore((state) => state.isProcessing);

  useEffect(() => {
    if (!isProcessing || typeof window === "undefined") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Standard message trigger across browsers
      const message =
        "Documents are currently being ingested and embedded in your research library. Are you sure you want to leave?";
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isProcessing]);
}
