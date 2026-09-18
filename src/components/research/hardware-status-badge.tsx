"use client";

import React, { useEffect, useState } from "react";
import { Cpu, Zap } from "lucide-react";
import { isWebGPUSupported } from "@litertjs/core";

export function HardwareStatusBadge() {
  const [hasWebGpu, setHasWebGpu] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const supported = isWebGPUSupported();
      setHasWebGpu(supported);
    } catch {
      setHasWebGpu(false);
    }
  }, []);

  if (hasWebGpu === null) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border font-mono transition-colors ${
        hasWebGpu
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-border bg-muted/40 text-muted-foreground"
      }`}
      title={
        hasWebGpu
          ? "Hardware acceleration active via WebGPU"
          : "WebGPU unavailable; falling back to WASM / CPU execution"
      }
    >
      {hasWebGpu ? (
        <>
          <Zap className="h-3 w-3 shrink-0 text-emerald-500" />
          <span>WebGPU Active</span>
        </>
      ) : (
        <>
          <Cpu className="h-3 w-3 shrink-0" />
          <span>WASM / CPU Mode</span>
        </>
      )}
    </div>
  );
}
