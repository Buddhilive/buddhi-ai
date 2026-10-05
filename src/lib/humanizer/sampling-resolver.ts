/**
 * Humanizer Sampling Parameters Resolver
 * Resolves and clamps decoding parameters for @litert-lm/core Web runtime
 */

import { SamplerType } from "@litert-lm/core";
import type { HumanizerConfig } from "@/types/humanizer";
import { HUMANIZER_CLAMP_LIMITS } from "./constants";

export interface ResolvedSamplerParameters {
  type: typeof SamplerType.TOP_P;
  temperature: number;
  p: number;
  k: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Resolves and strictly bounds humanizer decoding parameters to protect against
 * sampling crashes, loops, or NaN artifacts in LiteRT-LM Web.
 */
export function resolveSamplerParameters(config: HumanizerConfig): ResolvedSamplerParameters {
  const temperature = clamp(
    config.temperature,
    HUMANIZER_CLAMP_LIMITS.minTemperature,
    HUMANIZER_CLAMP_LIMITS.maxTemperature
  );

  const p = clamp(
    config.topP,
    HUMANIZER_CLAMP_LIMITS.minTopP,
    HUMANIZER_CLAMP_LIMITS.maxTopP
  );

  const k = Math.round(
    clamp(
      config.topK,
      HUMANIZER_CLAMP_LIMITS.minTopK,
      HUMANIZER_CLAMP_LIMITS.maxTopK
    )
  );

  return {
    type: SamplerType.TOP_P,
    temperature,
    p,
    k,
  };
}
