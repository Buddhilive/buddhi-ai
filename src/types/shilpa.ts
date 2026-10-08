/**
 * Shilpa Studio TypeScript Domain Types
 * Feature: 018-papermorph-interactive-books
 */

export interface BeatTiming {
  dur: number;                   // Duration in seconds
  marks: Record<string, number>; // word marker -> second offset
  cues: [number, string][];      // [startSec, sentenceText][]
}

export interface QuizSpec {
  id: string;
  type: "choice" | "blanks" | "tap" | "grid";
  prompt: string;
  options?: string[];
  answer?: string | number | string[];
  explanation: string;
  wrongExplanations?: string[];
}

export interface StoryboardBeat {
  id: string;                    // e.g. "intro", "natural", "q1"
  title: string;                 // Step title
  type: "lesson" | "quiz";
  narrationText: string;         // With [[mark]] tags
  visualActions: string[];       // Description of SVG tweens
  quizSpec?: QuizSpec;
}

export interface ShilpaStoryboard {
  chapterNumber: number;
  title: string;
  targetAudience: string;
  visualMetaphors: string[];     // e.g. "Number line", "Balance scale", "Area tiles"
  beats: StoryboardBeat[];
}

export interface ShilpaSection {
  chapterNumber: number;         // 1, 2, 3...
  folder: string;                // "ch01", "ch02"...
  title: string;                 // "Types of numbers"
  unit?: string;                 // "Part 1: The Basics"
  startPage: number;             // 1-based inclusive PDF page
  endPage: number;               // 1-based inclusive PDF page
  chapterStartPage: number;      // First page of chapter content
  estimatedMinutes: number;      // e.g. 5-10
  status: "unprocessed" | "storyboarded" | "ready";
  extractedText?: string;        // Markdown extracted from PDF pages
  storyboard?: ShilpaStoryboard; // Planned beats & visual descriptions
  timings?: Record<string, BeatTiming>; // Beat ID -> Timing
  scriptContent?: string;        // Generated HTML/JS page content
}

export interface ShilpaBook {
  id: string;                    // unique slug, e.g. "elementary-algebra"
  title: string;                 // e.g. "Elementary Algebra"
  author?: string;
  sourcePdfHash?: string;        // SHA-256 for dedup
  fileName?: string;
  fileSize?: number;
  pageCount: number;
  createdAt: number;
  updatedAt: number;
  status: "draft" | "mapped" | "ready";
  language: string;              // default: "en"
  coverPalette: string[];        // primary visual palette
  sections: ShilpaSection[];     // mapped chapters
  isSample?: boolean;            // true if pre-bundled demo book
}

export type GenerationStage =
  | "idle"
  | "extracting_text"
  | "planning_storyboard"
  | "generating_beats"
  | "synthesizing_timings"
  | "completed"
  | "error";

export interface GenerationProgress {
  stage: GenerationStage;
  progressPercent: number;
  message: string;
  activeBeatIndex?: number;
  totalBeats?: number;
  error?: string;
}
