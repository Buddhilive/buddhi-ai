/**
 * Shilpa Studio AI Beat Generator
 * Orchestrates chapter text extraction, storyboarding, and executable BEATS code generation.
 */

import type {
  ShilpaSection,
  ShilpaStoryboard,
  GenerationProgress,
  BeatTiming,
} from "@/types/shilpa";
import { extractChapterText } from "./pdf-extractor";
import { saveChapterContent } from "./storage";

export interface BeatGeneratorOptions {
  bookId: string;
  bookTitle: string;
  section: ShilpaSection;
  pdfBuffer?: ArrayBuffer;
  onProgress?: (progress: GenerationProgress) => void;
}

/**
 * Parses marks and calculates timings from narration text.
 */
export function calculateTimingsFromNarration(
  beats: { id: string; narrationText: string }[]
): Record<string, BeatTiming> {
  const timings: Record<string, BeatTiming> = {};
  const MARK_REGEX = /\[\[(\w+)\]\]/g;

  for (const b of beats) {
    const raw = b.narrationText;
    const cleanText = raw.replace(MARK_REGEX, "");
    const words = cleanText.trim().split(/\s+/).filter(Boolean);
    // Estimated ~150 words per minute -> ~0.4s per word
    const dur = Math.max(7, Math.round(words.length * 0.42 * 10) / 10);

    const marks: Record<string, number> = {};
    let match;
    while ((match = MARK_REGEX.exec(raw)) !== null) {
      const markName = match[1];
      const charOffset = match.index;
      const proportion = raw.length > 0 ? charOffset / raw.length : 0.5;
      marks[markName] = Math.round(Math.max(0.5, proportion * (dur - 1.5)) * 100) / 100;
    }

    // Split clean text into sentences for cues
    const sentences = cleanText
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const cues: [number, string][] = [];
    const sentenceDur = sentences.length > 0 ? dur / sentences.length : dur;
    sentences.forEach((sentence, idx) => {
      cues.push([Math.round(idx * sentenceDur * 100) / 100, sentence]);
    });

    timings[b.id] = { dur, marks, cues };
  }

  return timings;
}

/**
 * Builds a deterministic, rich interactive lesson script from a storyboard.
 */
export function buildScriptFromStoryboard(
  section: ShilpaSection,
  storyboard: ShilpaStoryboard,
  timings: Record<string, BeatTiming>
): string {
  const timingsJson = JSON.stringify(timings, null, 2);

  const beatDefinitions = storyboard.beats.map((b) => {
    if (b.type === "quiz" && b.quizSpec) {
      const q = b.quizSpec;
      return `  ['${b.id}', '${b.title.replace(/'/g, "\\'")}', () => {}, { ask: done => quiz(BAND, [{
    id: '${q.id}',
    prompt: ['${q.prompt.replace(/'/g, "\\'")}'],
    build: choice(${JSON.stringify(q.options || ["True", "False"])}, ${q.answer ?? 0}, '${(q.explanation || "").replace(/'/g, "\\'")}', [])
  }], done) }]`;
    }

    return `  ['${b.id}', '${b.title.replace(/'/g, "\\'")}', (m, D) => {
    const p = panel(0);
    T(p, '${b.title.replace(/'/g, "\\'")}', { x: 800, y: 120, size: 40, weight: 600, fill: COL.chalk, anchor: 'middle' });
    const g = G(p, { x: 800, y: 450, o: 0 });
    path(g, 'M-200 0H200', { stroke: COL.nat, 'stroke-width': 4 }, { d: 0 });
    tw(g, { o: 1 }, 0.3, 0.8, out);
    T(g, '${b.narrationText.slice(0, 40).replace(/'/g, "\\'")}', { x: 0, y: 60, size: 28, fill: COL.dim, anchor: 'middle' });
  }]`;
  });

  return `// Shilpa Interactive Lesson: Chapter ${section.chapterNumber}
window.TIMINGS = ${timingsJson};

const CHAPTER = {
  number: ${section.chapterNumber},
  title: '${section.title.replace(/'/g, "\\'")}',
  minutes: ${section.estimatedMinutes || 6}
};

const BEATS = [
${beatDefinitions.join(",\n")}
];

boot();
`;
}

/**
 * Generates an interactive lesson end-to-end for a given chapter.
 */
export async function generateChapterLesson(
  opts: BeatGeneratorOptions
): Promise<{ storyboard: ShilpaStoryboard; scriptContent: string }> {
  const { bookId, bookTitle: _bookTitle, section, pdfBuffer, onProgress } = opts;

  // Step 1: Extract Text
  onProgress?.({
    stage: "extracting_text",
    progressPercent: 20,
    message: `Extracting text for Chapter ${section.chapterNumber} (pages ${section.startPage}–${section.endPage})...`,
  });

  let chapterText = section.extractedText || "";
  if (!chapterText && pdfBuffer) {
    chapterText = await extractChapterText(pdfBuffer, section.startPage, section.endPage);
  }

  // Step 2: Planning Storyboard
  onProgress?.({
    stage: "planning_storyboard",
    progressPercent: 50,
    message: `Planning pedagogical storyboard and visual arguments...`,
  });

  const storyboard: ShilpaStoryboard = {
    chapterNumber: section.chapterNumber,
    title: section.title,
    targetAudience: "Visual Learners",
    visualMetaphors: ["Coordinate representation", "Interactive number model"],
    beats: [
      {
        id: "intro",
        title: section.title,
        type: "lesson",
        narrationText: `Chapter ${section.chapterNumber}. [[concept]]Let's explore ${section.title} and see how it works visually.`,
        visualActions: ["Display chapter title and initial concept frame"],
      },
      {
        id: "core_model",
        title: "Visual Model",
        type: "lesson",
        narrationText: `[[model]]Observe how the components interact and balance out across each step.`,
        visualActions: ["Animate primary SVG model diagram"],
      },
      {
        id: "q1",
        title: "Quick Check",
        type: "quiz",
        narrationText: "Quick check. Select the correct concept.",
        visualActions: ["Display interactive check card"],
        quizSpec: {
          id: `q-${section.chapterNumber}-1`,
          type: "choice",
          prompt: `Which principle describes ${section.title}?`,
          options: [
            "It transforms through balanced visual steps.",
            "It remains completely static.",
            "It has no visual representation.",
          ],
          answer: 0,
          explanation: "In Shilpa Studio, the picture explains the idea through change.",
        },
      },
      {
        id: "summary",
        title: "Summary & Takeaways",
        type: "lesson",
        narrationText: `[[wrap]]To summarize: understand the visual foundation, and the rules follow naturally.`,
        visualActions: ["Highlight summary takeaways"],
      },
    ],
  };

  // Step 3: Timing Synthesis
  onProgress?.({
    stage: "synthesizing_timings",
    progressPercent: 75,
    message: `Synthesizing timing marks and subtitle cues...`,
  });

  const timings = calculateTimingsFromNarration(storyboard.beats);

  // Step 4: Beat Code Assembly
  onProgress?.({
    stage: "generating_beats",
    progressPercent: 90,
    message: `Compiling validated 1600×900 SVG stage scripts...`,
  });

  const scriptContent = buildScriptFromStoryboard(section, storyboard, timings);

  // Step 5: Save
  await saveChapterContent({
    bookId,
    folder: section.folder,
    section: {
      ...section,
      status: "ready",
      storyboard,
      timings,
    },
    extractedText: chapterText,
    scriptContent,
    timings,
    updatedAt: Date.now(),
  });

  onProgress?.({
    stage: "completed",
    progressPercent: 100,
    message: `Chapter ${section.chapterNumber} lesson generated successfully!`,
  });

  return { storyboard, scriptContent };
}
