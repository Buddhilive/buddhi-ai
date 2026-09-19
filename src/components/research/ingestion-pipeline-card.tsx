"use client";

import React from "react";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Database,
  Layers,
  Sparkles,
  FileSearch,
} from "lucide-react";
import { useIngestionStore } from "@/stores/ingestion-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PipelineStage } from "@/types/research";

const PIPELINE_STEPS: Array<{
  id: PipelineStage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  stepNumber: number;
}> = [
  { id: "parsing", label: "Parsing", icon: FileSearch, stepNumber: 1 },
  { id: "chunking", label: "Chunking", icon: Layers, stepNumber: 2 },
  { id: "embedding", label: "Embedding", icon: Sparkles, stepNumber: 3 },
  { id: "saving", label: "Saving", icon: Database, stepNumber: 4 },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function IngestionPipelineCard() {
  const [mounted, setMounted] = React.useState(false);
  const { jobs, removeJob, clearCompletedJobs } = useIngestionStore();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || jobs.length === 0) return null;

  const activeCount = jobs.filter(
    (j) => j.stage !== "completed" && j.stage !== "failed" && j.stage !== "idle"
  ).length;
  const completedCount = jobs.filter((j) => j.stage === "completed").length;
  const failedCount = jobs.filter((j) => j.stage === "failed").length;

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm transition-all">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            {activeCount > 0 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Layers className="h-4 w-4" />
            )}
          </div>
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight">
              Ingestion Pipeline
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Client-side document parsing, semantic chunking & vector indexing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-[10px] animate-pulse">
              {activeCount} Processing
            </Badge>
          )}
          {completedCount > 0 && (
            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
              {completedCount} Completed
            </Badge>
          )}
          {failedCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {failedCount} Failed
            </Badge>
          )}

          {(completedCount > 0 || failedCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompletedJobs}
              className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear Finished
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-3 transition-colors hover:bg-muted/30"
          >
            {/* Top row: File info + Status Badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-xs font-medium truncate leading-tight">
                    {job.fileName}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatBytes(job.fileSize)}
                    {job.totalChunks > 0 && ` • ${job.totalChunks} chunks`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={
                    job.stage === "completed"
                      ? "default"
                      : job.stage === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[10px] capitalize px-2 py-0.5"
                >
                  {job.stage === "completed" ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </span>
                  ) : job.stage === "failed" ? (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Error
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Step {job.currentStep}/4
                    </span>
                  )}
                </Badge>

                {(job.stage === "completed" || job.stage === "failed") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeJob(job.id)}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Stepper indicator */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {PIPELINE_STEPS.map((step) => {
                const isStepCompleted =
                  job.stage === "completed" || job.currentStep > step.stepNumber;
                const isCurrentStep =
                  job.stage === step.id ||
                  (job.currentStep === step.stepNumber && job.stage !== "completed" && job.stage !== "failed");
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all ${
                      isStepCompleted
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : isCurrentStep
                        ? "bg-primary/10 border-primary/40 text-primary shadow-xs"
                        : "bg-muted/40 border-border/40 text-muted-foreground opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {isStepCompleted ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : isCurrentStep ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <StepIcon className="h-3.5 w-3.5" />
                      )}
                      <span className="text-[11px] font-medium leading-none">
                        {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress bar and details */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  {job.stepLabel || "Preparing..."}
                </span>
                <span className="font-mono text-[10px]">{job.progress}%</span>
              </div>
              <Progress
                value={job.progress}
                className={`h-1.5 ${job.stage === "failed" ? "bg-destructive/20" : ""}`}
              />
            </div>

            {/* Error banner if failed */}
            {job.error && (
              <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="break-all">{job.error}</span>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
