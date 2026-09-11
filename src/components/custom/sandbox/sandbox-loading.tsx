"use client";

import React from "react";
import {
  Terminal,
  TerminalHeader,
  TerminalTitle,
  TerminalStatus,
  TerminalActions,
  TerminalCopyButton,
  TerminalClearButton,
  TerminalContent,
} from "@/components/ai-elements/terminal";
import { SandboxInitStage } from "@/types/sandbox";
import {
  Cpu,
  FolderPlus,
  Package,
  Play,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SandboxLoadingProps {
  stage: SandboxInitStage;
  progressText: string;
  logs: string[];
  errorMessage: string | null;
  onRetry?: () => void;
  onClearLogs?: () => void;
}

interface StepInfo {
  id: SandboxInitStage;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepInfo[] = [
  {
    id: "booting",
    label: "Kernel Boot",
    description: "WebAssembly POSIX environment",
    icon: Cpu,
  },
  {
    id: "scaffolding",
    label: "Scaffolding",
    description: "Next.js 16 App Router template",
    icon: FolderPlus,
  },
  {
    id: "installing",
    label: "Dependencies",
    description: "Running npm install",
    icon: Package,
  },
  {
    id: "starting",
    label: "Dev Server",
    description: "Booting next dev --port 3000",
    icon: Play,
  },
];

export function SandboxLoading({
  stage,
  progressText,
  logs,
  errorMessage,
  onRetry,
  onClearLogs,
}: SandboxLoadingProps) {
  const getStepStatus = (stepId: SandboxInitStage) => {
    const stageOrder: SandboxInitStage[] = [
      "booting",
      "scaffolding",
      "installing",
      "starting",
      "ready",
    ];

    if (stage === "error") {
      return "error";
    }

    const currentIndex = stageOrder.indexOf(stage);
    const stepIndex = stageOrder.indexOf(stepId);

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const outputString = logs.length > 0 ? logs.join("\n") : "Waiting for terminal output...";
  const isStreaming = stage !== "error" && stage !== "ready";

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Header Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-400 animate-pulse" />
              <h3 className="font-semibold text-base text-zinc-100 tracking-tight">
                Initializing Next.js Project Sandbox
              </h3>
            </div>
            <p className="text-xs text-zinc-400">
              {progressText || "Preparing client-side WebAssembly environment..."}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {stage === "error" ? (
              <Badge variant="destructive" className="flex items-center gap-1 py-1 px-2.5">
                <AlertCircle className="size-3.5" />
                <span>Initialization Failed</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 py-1 px-2.5 text-emerald-400 border-emerald-500/30 bg-emerald-500/10 font-mono text-[11px]"
              >
                <Loader2 className="size-3.5 animate-spin" />
                <span className="capitalize">{stage}...</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Step Progress Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
          {STEPS.map((step) => {
            const status = getStepStatus(step.id);
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 ${
                  status === "active"
                    ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    : status === "completed"
                    ? "border-zinc-800 bg-zinc-900/40 text-zinc-400"
                    : "border-zinc-900 bg-zinc-950/40 text-zinc-600"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {status === "completed" ? (
                    <CheckCircle2 className="size-4 text-emerald-400" />
                  ) : status === "active" ? (
                    <Loader2 className="size-4 text-emerald-400 animate-spin" />
                  ) : (
                    <Icon className="size-4 text-zinc-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div
                    className={`text-xs font-medium truncate ${
                      status === "active"
                        ? "text-emerald-300"
                        : status === "completed"
                        ? "text-zinc-300"
                        : "text-zinc-500"
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">{step.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Action Banner */}
      {stage === "error" && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-destructive">Initialization Error</h4>
              <p className="text-xs text-zinc-300 mt-0.5">{errorMessage || "An unexpected error occurred."}</p>
            </div>
          </div>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="gap-1.5 shrink-0 bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
            >
              <RotateCw className="size-3.5" />
              <span>Retry Initialization</span>
            </Button>
          )}
        </div>
      )}

      {/* Terminal View */}
      <div className="flex-1 flex flex-col min-h-[340px]">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Live Setup Stream
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">virtual /workspace</span>
        </div>

        <Terminal
          output={outputString}
          isStreaming={isStreaming}
          onClear={onClearLogs}
          className="flex-1 w-full border-zinc-800 bg-zinc-950 font-mono text-xs rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          <TerminalHeader className="bg-zinc-900/80 px-4 py-2 border-b border-zinc-800 shrink-0">
            <TerminalTitle className="text-xs text-zinc-300 flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400" />
              <span>terminal: npm install &amp; next dev</span>
            </TerminalTitle>
            <div className="flex items-center gap-2">
              <TerminalStatus>
                <span className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                  {progressText}
                </span>
              </TerminalStatus>
              <TerminalActions>
                <TerminalCopyButton className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" />
                {onClearLogs && (
                  <TerminalClearButton className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" />
                )}
              </TerminalActions>
            </div>
          </TerminalHeader>
          <TerminalContent className="flex-1 max-h-none overflow-y-auto p-4 text-zinc-300 leading-relaxed font-mono" />
        </Terminal>
      </div>
    </div>
  );
}
