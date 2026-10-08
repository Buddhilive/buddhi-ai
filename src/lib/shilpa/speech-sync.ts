/**
 * Shilpa Studio Speech & Word-Mark Synchronization Layer
 * Synchronizes browser speech synthesis (Web Speech API) and Edge-TTS with visual mark triggers.
 */

import type { BeatTiming } from "@/types/shilpa";

export interface SpeechPlaybackOptions {
  text: string;
  voiceName?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onWordBoundary?: (word: string, charIndex: number, elapsedTime: number) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

/**
 * Checks if the Web Speech API is supported in the current browser.
 */
export function isWebSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Synthesizes speech live using the browser Web Speech API with word boundary tracking.
 */
export function playWebSpeechWithMarks(
  opts: SpeechPlaybackOptions
): { stop: () => void } {
  if (!isWebSpeechSupported()) {
    opts.onError?.(new Error("Web Speech API not supported in this browser"));
    return { stop: () => {} };
  }

  window.speechSynthesis.cancel();

  // Strip [[mark]] tags for clean audible speech
  const cleanText = opts.text.replace(/\[\[\w+\]\]/g, "");
  const utterance = new SpeechSynthesisUtterance(cleanText);

  utterance.rate = opts.rate ?? 0.95;
  utterance.pitch = opts.pitch ?? 1.0;
  utterance.volume = opts.volume ?? 1.0;

  const voices = window.speechSynthesis.getVoices();
  if (opts.voiceName) {
    const selectedVoice = voices.find((v) => v.name === opts.voiceName);
    if (selectedVoice) utterance.voice = selectedVoice;
  } else {
    // Prefer clean English voice if available
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
    );
    if (preferred) utterance.voice = preferred;
  }

  const startTime = performance.now();

  utterance.addEventListener("boundary", (event: any) => {
    if (event.name === "word") {
      const elapsed = (performance.now() - startTime) / 1000;
      const word = cleanText.substring(event.charIndex, event.charIndex + event.charLength || undefined);
      opts.onWordBoundary?.(word, event.charIndex, elapsed);
    }
  });

  utterance.addEventListener("end", () => {
    opts.onEnd?.();
  });

  utterance.addEventListener("error", (err) => {
    opts.onError?.(err);
  });

  window.speechSynthesis.speak(utterance);

  return {
    stop: () => window.speechSynthesis.cancel(),
  };
}

/**
 * Wall-clock pacing duration estimator for offline / muted lessons.
 */
export function estimateWallClockTimings(
  narrationText: string
): BeatTiming {
  const MARK_REGEX = /\[\[(\w+)\]\]/g;
  const cleanText = narrationText.replace(MARK_REGEX, "");
  const words = cleanText.trim().split(/\s+/).filter(Boolean);
  // ~150 words per minute -> 0.4s per word, minimum 6s
  const dur = Math.max(6, Math.round(words.length * 0.42 * 10) / 10);

  const marks: Record<string, number> = {};
  let match;
  while ((match = MARK_REGEX.exec(narrationText)) !== null) {
    const markName = match[1];
    const charOffset = match.index;
    const proportion = narrationText.length > 0 ? charOffset / narrationText.length : 0.5;
    marks[markName] = Math.round(Math.max(0.4, proportion * (dur - 1.2)) * 100) / 100;
  }

  const sentences = cleanText
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const cues: [number, string][] = [];
  const sentenceDur = sentences.length > 0 ? dur / sentences.length : dur;
  sentences.forEach((sentence, idx) => {
    cues.push([Math.round(idx * sentenceDur * 100) / 100, sentence]);
  });

  return { dur, marks, cues };
}
