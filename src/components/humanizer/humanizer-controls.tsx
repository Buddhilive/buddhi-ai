"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wand2,
  RotateCcw,
  Square,
  GraduationCap,
  Briefcase,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useHumanizerStore } from "@/stores/humanizer-store";
import { useLiteRTModelStore } from "@/stores/litert-store";
import type { HumanizerPresetId, HumanizerIntensity } from "@/types/humanizer";
import Link from "next/link";

interface HumanizerControlsProps {
  onExecute: () => void;
  onCancel: () => void;
}

export function HumanizerControls({ onExecute, onCancel }: HumanizerControlsProps) {
  const {
    rawInput,
    outputMarkdown,
    config,
    setTonePreset,
    setIntensity,
    stage,
  } = useHumanizerStore();

  const liteRTInstance = useLiteRTModelStore((s) => s.liteRTModelInstance);

  const isBusy = stage === "analyzing" || stage === "processing" || stage === "reassembling";
  const hasInput = rawInput.trim().length > 0;
  const isModelReady = Boolean(liteRTInstance);
  const isRehumanize = outputMarkdown.length > 0 && !isBusy;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border rounded-xl shadow-xs">
      {/* Left controls: Persona and Intensity */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Tone Persona Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Tone:</span>
          <Select
            value={config.tonePreset}
            onValueChange={(val) => setTonePreset(val as HumanizerPresetId)}
            disabled={isBusy}
          >
            <SelectTrigger className="h-8 text-xs w-[170px] bg-background">
              <SelectValue placeholder="Select persona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balanced" className="text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span>Balanced Natural</span>
                </div>
              </SelectItem>
              <SelectItem value="academic_hedged" className="text-xs">
                <div className="flex items-center gap-2">
                  <GraduationCap className="size-3.5 text-blue-500" />
                  <span>Academic Hedged</span>
                </div>
              </SelectItem>
              <SelectItem value="executive_concise" className="text-xs">
                <div className="flex items-center gap-2">
                  <Briefcase className="size-3.5 text-amber-500" />
                  <span>Executive Concise</span>
                </div>
              </SelectItem>
              <SelectItem value="conversational" className="text-xs">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-3.5 text-emerald-500" />
                  <span>Conversational</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Intensity Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Intensity:</span>
          <div className="flex items-center p-0.5 rounded-lg bg-muted border">
            {(["low", "balanced", "aggressive"] as HumanizerIntensity[]).map((level) => (
              <Button
                key={level}
                variant={config.intensity === level ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[11px] px-2.5 capitalize rounded-md"
                onClick={() => setIntensity(level)}
                disabled={isBusy}
              >
                {level}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Right controls: Model status & Trigger Button */}
      <div className="flex items-center gap-2 ml-auto">
        {!isModelReady && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span className="hidden md:inline">Model not loaded.</span>
            <Link href="/models" className="underline font-semibold hover:text-amber-700">
              Load Gemma
            </Link>
          </div>
        )}

        {isBusy ? (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs px-3 gap-1.5 font-medium shadow-xs"
            onClick={onCancel}
          >
            <Square className="size-3 fill-current" />
            <span>Stop</span>
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs px-4 gap-1.5 font-semibold shadow-xs transition-all"
            onClick={onExecute}
            disabled={!hasInput || !isModelReady}
          >
            {isRehumanize ? (
              <>
                <RotateCcw className="size-3.5" />
                <span>Re-humanize</span>
              </>
            ) : (
              <>
                <Wand2 className="size-3.5" />
                <span>Humanize</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
