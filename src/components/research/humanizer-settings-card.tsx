"use client";

import React, { useState } from "react";
import {
  Wand2,
  Sparkles,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Flame,
  Gauge,
  Check,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import {
  HUMANIZER_PRESETS,
  HUMANIZER_CLAMP_LIMITS,
  BANNED_CLICHES_BY_STRICTNESS,
} from "@/lib/humanizer/constants";
import type {
  HumanizerPresetId,
  BurstinessLevel,
  NegativeFilterStrictness,
} from "@/types/humanizer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function HumanizerSettingsCard() {
  const {
    humanizer,
    setHumanizerEnabled,
    setHumanizerPreset,
    updateHumanizerConfig,
    resetHumanizerDefaults,
  } = useSettingsStore();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleToggleEnabled = (checked: boolean) => {
    setHumanizerEnabled(checked);
    toast.success(checked ? "LLM Humanizer enabled" : "LLM Humanizer disabled");
  };

  const handleSelectPreset = (preset: HumanizerPresetId) => {
    setHumanizerPreset(preset);
    toast.info(`Preset switched to ${preset === "technical_peer" ? "Technical Peer" : preset.charAt(0).toUpperCase() + preset.slice(1)}`);
  };

  const handleBurstinessChange = (value: number[]) => {
    const level = value[0] as BurstinessLevel;
    updateHumanizerConfig({ burstinessLevel: level, preset: "custom" });
  };

  const handleStrictnessChange = (strictness: NegativeFilterStrictness) => {
    updateHumanizerConfig({ negativeFilterStrictness: strictness, preset: "custom" });
  };

  const handleCustomGuidanceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateHumanizerConfig({ customGuidance: e.target.value, preset: "custom" });
  };

  const handleTemperatureChange = (val: number[]) => {
    updateHumanizerConfig({ temperature: val[0], preset: "custom" });
  };

  const handleTopPChange = (val: number[]) => {
    updateHumanizerConfig({ topP: val[0], preset: "custom" });
  };

  const handleTopKChange = (val: number[]) => {
    updateHumanizerConfig({ topK: val[0], preset: "custom" });
  };

  const handleReset = () => {
    resetHumanizerDefaults();
    toast.info("Humanizer parameters restored to Balanced defaults");
  };

  const burstinessDescriptions: Record<BurstinessLevel, string> = {
    1: "Level 1: Uniform, steady sentence structure",
    2: "Level 2: Mild variation in clause length",
    3: "Level 3: Natural cadence, balanced short & complex clauses",
    4: "Level 4: High dynamic burstiness, punchy contrasts",
    5: "Level 5: Maximum cadence variance, sharp rhythmic shifts",
  };

  return (
    <Card className="border border-border/80 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Wand2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">LLM Humanizer</CardTitle>
                <Badge variant={humanizer.enabled ? "default" : "outline"} className="text-[10px] px-1.5 py-0 h-4">
                  {humanizer.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Steers on-device Gemma 2B decoding and prompts for natural phrasing, varied cadence, and cliché elimination.
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={humanizer.enabled}
            onCheckedChange={handleToggleEnabled}
            aria-label="Toggle LLM Humanizer"
          />
        </div>
      </CardHeader>

      {humanizer.enabled && (
        <CardContent className="space-y-5 pt-0">
          {/* Preset Selection Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Preset Style Profile</span>
              {humanizer.preset === "custom" && (
                <Badge variant="secondary" className="text-[10px] font-mono">
                  Custom Tuning
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["balanced", "casual", "technical_peer"] as const).map((key) => {
                const p = HUMANIZER_PRESETS[key];
                const isSelected = humanizer.preset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectPreset(key)}
                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 text-foreground"
                        : "border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-semibold">{p.name}</span>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground line-clamp-2">
                      {p.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Burstiness (Sentence Cadence) Slider */}
          <div className="space-y-2 rounded-lg border p-3.5 bg-muted/20">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Gauge className="size-3.5 text-primary" />
                Burstiness & Cadence Variance
              </span>
              <span className="font-mono text-xs text-primary font-semibold">
                Level {humanizer.burstinessLevel}/5
              </span>
            </div>
            <Slider
              value={[humanizer.burstinessLevel]}
              min={1}
              max={5}
              step={1}
              onValueChange={handleBurstinessChange}
              className="py-1"
            />
            <p className="text-[11px] text-muted-foreground">
              {burstinessDescriptions[humanizer.burstinessLevel]}
            </p>
          </div>

          {/* Negative Cliché Strictness Filter */}
          <div className="space-y-2 rounded-lg border p-3.5 bg-muted/20">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <ShieldAlert className="size-3.5 text-amber-500" />
                Negative Cliché Filter Strictness
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {humanizer.negativeFilterStrictness} filter
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {(["low", "medium", "high"] as const).map((lvl) => {
                const isSelected = humanizer.negativeFilterStrictness === lvl;
                return (
                  <Button
                    key={lvl}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={`h-8 text-xs capitalize ${isSelected ? "" : "text-muted-foreground"}`}
                    onClick={() => handleStrictnessChange(lvl)}
                  >
                    {lvl}
                  </Button>
                );
              })}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 flex flex-wrap gap-1 items-center">
              <span>Suppresses:</span>
              {BANNED_CLICHES_BY_STRICTNESS[humanizer.negativeFilterStrictness].slice(0, 4).map((c, i) => (
                <Badge key={i} variant="outline" className="text-[10px] py-0 px-1 font-mono text-muted-foreground bg-background">
                  {c}
                </Badge>
              ))}
              {BANNED_CLICHES_BY_STRICTNESS[humanizer.negativeFilterStrictness].length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{BANNED_CLICHES_BY_STRICTNESS[humanizer.negativeFilterStrictness].length - 4} more
                </span>
              )}
            </div>
          </div>

          {/* Custom Style Guidance */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="custom-guidance" className="font-medium text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-purple-500" />
                Custom Style Guidance (Optional)
              </label>
            </div>
            <Textarea
              id="custom-guidance"
              value={humanizer.customGuidance}
              onChange={handleCustomGuidanceChange}
              placeholder="e.g. Write with concise dry humor and short analogies; avoid passive voice."
              className="text-xs resize-none h-18 bg-background"
            />
          </div>

          {/* Advanced Hyperparameter Collapsible */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="w-full flex items-center justify-between p-3 text-xs font-medium hover:bg-muted/30 transition-colors text-foreground"
            >
              <div className="flex items-center gap-2">
                <Sliders className="size-3.5 text-muted-foreground" />
                <span>Advanced Decoding Hyperparameters</span>
              </div>
              {showAdvanced ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            {showAdvanced && (
              <div className="p-3.5 border-t space-y-4 bg-muted/10 text-xs">
                {/* Temperature */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground flex items-center gap-1">
                      <Flame className="size-3 text-amber-500" /> Temperature ($T$)
                    </span>
                    <span className="font-mono text-primary font-semibold">{humanizer.temperature.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[humanizer.temperature]}
                    min={HUMANIZER_CLAMP_LIMITS.minTemperature}
                    max={HUMANIZER_CLAMP_LIMITS.maxTemperature}
                    step={0.05}
                    onValueChange={handleTemperatureChange}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Deterministic (0.10)</span>
                    <span>Creative (1.05)</span>
                  </div>
                </div>

                {/* Top-P */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">Nucleus Sampling (Top-$p$)</span>
                    <span className="font-mono text-primary font-semibold">{humanizer.topP.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[humanizer.topP]}
                    min={HUMANIZER_CLAMP_LIMITS.minTopP}
                    max={HUMANIZER_CLAMP_LIMITS.maxTopP}
                    step={0.02}
                    onValueChange={handleTopPChange}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Focused (0.50)</span>
                    <span>Broad (0.98)</span>
                  </div>
                </div>

                {/* Top-K */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">Top-$k$ Sampling</span>
                    <span className="font-mono text-primary font-semibold">{humanizer.topK}</span>
                  </div>
                  <Slider
                    value={[humanizer.topK]}
                    min={HUMANIZER_CLAMP_LIMITS.minTopK}
                    max={HUMANIZER_CLAMP_LIMITS.maxTopK}
                    step={5}
                    onValueChange={handleTopKChange}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>10 tokens</span>
                    <span>100 tokens</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}

      {humanizer.enabled && (
        <CardFooter className="flex items-center justify-between border-t bg-muted/10 py-2.5 px-6">
          <span className="text-[11px] text-muted-foreground">
            Changes apply automatically to new inference runs.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs h-7 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" />
            Reset to Defaults
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
