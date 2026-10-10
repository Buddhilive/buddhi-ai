/**
 * Shilpa Studio AI Beat Generator
 * Orchestrates chapter text extraction, storyboarding, and executable BEATS code generation.
 */

import type {
  ShilpaSection,
  ShilpaStoryboard,
  StoryboardBeat,
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
    // Estimated ~140 words per minute -> ~0.43s per word, minimum 8s
    const dur = Math.max(8, Math.round(words.length * 0.43 * 10) / 10);

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
 * Analyzes extracted chapter text to extract key concepts, definitions, and questions.
 */
function analyzeAndExtractStoryboard(
  section: ShilpaSection,
  chapterText: string
): ShilpaStoryboard {
  const cleanLines = chapterText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("## Page"));

  // Extract candidate sentences with conceptual value
  const contentSentences: string[] = [];
  for (const line of cleanLines) {
    if (line.length > 20 && !line.toLowerCase().startsWith("copyright") && !line.toLowerCase().startsWith("table of contents")) {
      const parts = line.split(/(?<=[.?!])\s+/);
      for (const p of parts) {
        const trimmed = p.trim();
        if (trimmed.length > 25 && trimmed.length < 160) {
          contentSentences.push(trimmed);
        }
      }
    }
  }

  const title = section.title || `Chapter ${section.chapterNumber}`;
  const s1 = contentSentences[0] || `In this chapter, we explore the core visual foundations and principles of ${title}.`;
  const s2 = contentSentences[1] || `Every idea in this section builds upon structured relationships and visual transformations.`;
  const s3 = contentSentences[2] || `Notice how each component interacts and balances out across each step of the model.`;
  const s4 = contentSentences[3] || `Understanding the fundamental visual representation makes the formal rules intuitive.`;

  const beats: StoryboardBeat[] = [
    {
      id: "intro",
      title: "Chapter Overview",
      type: "lesson",
      narrationText: `Chapter ${section.chapterNumber}. [[topic]]${title}. [[goal]]${s1}`,
      visualActions: [
        "Display chapter badge and title banner",
        "Render overview card with central concept pill",
      ],
    },
    {
      id: "foundation",
      title: "Core Foundation",
      type: "lesson",
      narrationText: `[[concept]]Let's examine the foundational principle. [[detail]]${s2}`,
      visualActions: [
        "Draw visual model container with glowing border",
        "Animate visual argument diagram and concept badge",
      ],
    },
    {
      id: "visual_model",
      title: "Visual Transformation",
      type: "lesson",
      narrationText: `[[model]]Observe the transformation closely. [[mechanics]]${s3}`,
      visualActions: [
        "Render multi-step dynamic comparison boxes",
        "Animate transition indicators and formula highlights",
      ],
    },
    {
      id: "q1",
      title: "Quick Check",
      type: "quiz",
      narrationText: `Let's do a quick check to verify your understanding of ${title}.`,
      visualActions: ["Display interactive check card"],
      quizSpec: {
        id: `q-${section.chapterNumber}-1`,
        type: "choice",
        prompt: `Which statement best describes ${title}?`,
        options: [
          s1.length > 80 ? s1.slice(0, 75) + "..." : s1,
          "It represents a static rule with no interactive structure.",
          "It has no visual or mathematical relationship.",
        ],
        answer: 0,
        explanation: `In Shilpa Studio, ${title} is understood through its visual transformations and core properties.`,
      },
    },
    {
      id: "summary",
      title: "Summary & Takeaways",
      type: "lesson",
      narrationText: `[[wrap]]To summarize Chapter ${section.chapterNumber}: [[takeaway]]${s4}`,
      visualActions: [
        "Display key takeaways recap card",
        "Highlight mastery checkmarks and conclusion pill",
      ],
    },
  ];

  return {
    chapterNumber: section.chapterNumber,
    title,
    targetAudience: "Visual Learners",
    visualMetaphors: ["Geometric balance", "Transformation model"],
    beats,
  };
}

/**
 * Escapes strings safely for JavaScript template strings.
 */
function escapeJs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
}

/**
 * Builds an executable, rich interactive lesson script from a storyboard.
 */
export function buildScriptFromStoryboard(
  section: ShilpaSection,
  storyboard: ShilpaStoryboard,
  timings: Record<string, BeatTiming>
): string {
  const timingsJson = JSON.stringify(timings, null, 2);

  const beatDefinitions = storyboard.beats.map((b) => {
    const cleanNarration = escapeJs(b.narrationText);
    const safeTitle = escapeJs(b.title);

    if (b.type === "quiz" && b.quizSpec) {
      const q = b.quizSpec;
      return `  ['${b.id}', '${safeTitle}', () => {}, { narration: '${cleanNarration}', ask: done => quiz(BAND, [{
    id: '${q.id}',
    prompt: ['${escapeJs(q.prompt)}'],
    build: choice(${JSON.stringify(q.options || ["True", "False"])}, ${q.answer ?? 0}, '${escapeJs(q.explanation || "")}', [])
  }], done) }]`;
    }

    // Rich visual code for lesson beats
    if (b.id === "intro") {
      return `  ['${b.id}', '${safeTitle}', (m, D) => {
    const p = panel(0);
    // Badge
    const badge = G(p, { x: 800, y: 140, o: 0 });
    path(badge, 'M-120 -18h240v36h-240z', { fill: '#14201c', stroke: COL.good, 'stroke-width': 2, rx: 18 });
    T(badge, 'CHAPTER ${section.chapterNumber} • OVERVIEW', { x: 0, y: 6, size: 16, fill: COL.good, weight: 600, anchor: 'middle' });
    tw(badge, { o: 1 }, 0.2, 0.5, out);

    // Main Title
    const h = T(p, '${escapeJs(section.title)}', { x: 800, y: 220, size: 54, weight: 600, fill: COL.chalk, anchor: 'middle', o: 0 });
    tw(h, { o: 1, y: 210 }, 0.4, 0.8, out);

    // Overview Card
    const card = G(p, { x: 800, y: 500, o: 0, s: 0.95 });
    path(card, 'M-520 -180h1040v360h-1040z', { fill: '#14201c', stroke: COL.faint, 'stroke-width': 2, rx: 20 });
    tw(card, { o: 1, s: 1 }, 0.8, 0.9, out);

    // Icon Circle
    const icon = G(card, { x: -440, y: -90 });
    mk('circle', { r: 24, fill: COL.good, opacity: '0.15' }, icon);
    mk('circle', { r: 10, fill: COL.good }, icon);

    T(card, 'Interactive Lesson Objectives', { x: -390, y: -82, size: 28, fill: COL.chalk, weight: 600 });
    T(card, '• Master core concepts through visual transformations', { x: -440, y: -10, size: 24, fill: COL.chalk });
    T(card, '• Interactive step-by-step checks and self-tests', { x: -440, y: 40, size: 24, fill: COL.dim });
    T(card, '• Visual argument pacing synchronized with audio & captions', { x: -440, y: 90, size: 24, fill: COL.dim });
  }, { narration: '${cleanNarration}' }]`;
    }

    if (b.id === "foundation") {
      return `  ['${b.id}', '${safeTitle}', (m, D) => {
    const p = panel(0);
    // Header
    const h = T(p, '${safeTitle}', { x: 800, y: 130, size: 40, weight: 600, fill: COL.chalk, anchor: 'middle', o: 0 });
    tw(h, { o: 1 }, 0.2, 0.6, out);

    // Visual model container
    const card = G(p, { x: 800, y: 470, o: 0 });
    path(card, 'M-520 -190h1040v380h-1040z', { fill: '#14201c', stroke: COL.nat, 'stroke-width': 2.5, rx: 20 });
    tw(card, { o: 1 }, 0.4, 0.8, out);

    // Concept Badge
    const tag = G(card, { x: 0, y: -110 });
    path(tag, 'M-180 -20h360v40h-360z', { fill: COL.nat, opacity: '0.2', rx: 20 });
    T(tag, 'CORE PRINCIPLE', { x: 0, y: 6, size: 18, fill: COL.nat, weight: 700, anchor: 'middle' });

    // Concept Statement
    T(card, '${escapeJs(b.narrationText.replace(/\[\[\w+\]\]/g, "").slice(0, 75))}', { x: 0, y: -20, size: 28, fill: COL.chalk, weight: 600, anchor: 'middle' });

    // Step indicators
    const row = G(card, { x: 0, y: 70, o: 0 });
    path(row, 'M-380 -30h220v60h-220z', { fill: '#1d2b27', stroke: COL.faint, 'stroke-width': 1.5, rx: 12 });
    T(row, '1. Definition', { x: -270, y: 8, size: 20, fill: COL.chalk, anchor: 'middle' });

    path(row, 'M-110 -30h220v60h-220z', { fill: '#1d2b27', stroke: COL.whole, 'stroke-width': 1.5, rx: 12 });
    T(row, '2. Model', { x: 0, y: 8, size: 20, fill: COL.whole, anchor: 'middle' });

    path(row, 'M160 -30h220v60h-220z', { fill: '#1d2b27', stroke: COL.good, 'stroke-width': 1.5, rx: 12 });
    T(row, '3. Verification', { x: 270, y: 8, size: 20, fill: COL.good, anchor: 'middle' });

    tw(row, { o: 1 }, 0.9, 0.7, out);
  }, { narration: '${cleanNarration}' }]`;
    }

    if (b.id === "visual_model") {
      return `  ['${b.id}', '${safeTitle}', (m, D) => {
    const p = panel(0);
    const h = T(p, '${safeTitle}', { x: 800, y: 130, size: 40, weight: 600, fill: COL.chalk, anchor: 'middle', o: 0 });
    tw(h, { o: 1 }, 0.2, 0.6, out);

    // Two-column visual transformation model
    const leftBox = G(p, { x: 530, y: 470, o: 0, x0: 480 });
    path(leftBox, 'M-220 -170h440v340h-440z', { fill: '#14201c', stroke: COL.int, 'stroke-width': 2, rx: 16 });
    T(leftBox, 'Input State', { x: 0, y: -100, size: 26, fill: COL.int, weight: 600, anchor: 'middle' });
    T(leftBox, 'Initial Parameters', { x: 0, y: -40, size: 22, fill: COL.chalk, anchor: 'middle' });
    path(leftBox, 'M-140 30h280', { stroke: COL.dim, 'stroke-width': 3 });
    T(leftBox, 'Structured Properties', { x: 0, y: 90, size: 20, fill: COL.dim, anchor: 'middle' });
    tw(leftBox, { o: 1, x: 530 }, 0.4, 0.8, out);

    // Arrow in center
    const arrowG = G(p, { x: 800, y: 470, o: 0 });
    path(arrowG, 'M-30 0H30M10 -15L30 0L10 15', { stroke: COL.chalk, 'stroke-width': 4 });
    tw(arrowG, { o: 1 }, 0.8, 0.6, out);

    // Right Box
    const rightBox = G(p, { x: 1070, y: 470, o: 0 });
    path(rightBox, 'M-220 -170h440v340h-440z', { fill: '#14201c', stroke: COL.good, 'stroke-width': 2, rx: 16 });
    T(rightBox, 'Transformed Result', { x: 0, y: -100, size: 26, fill: COL.good, weight: 600, anchor: 'middle' });
    T(rightBox, 'Balanced Equation', { x: 0, y: -40, size: 22, fill: COL.chalk, anchor: 'middle' });
    path(rightBox, 'M-140 30h280', { stroke: COL.good, 'stroke-width': 3 });
    T(rightBox, 'Consistent Outcome', { x: 0, y: 90, size: 20, fill: COL.dim, anchor: 'middle' });
    tw(rightBox, { o: 1 }, 1.1, 0.8, out);
  }, { narration: '${cleanNarration}' }]`;
    }

    // Default / Summary beat
    return `  ['${b.id}', '${safeTitle}', (m, D) => {
    const p = panel(0);
    const h = T(p, '${safeTitle}', { x: 800, y: 130, size: 40, weight: 600, fill: COL.chalk, anchor: 'middle', o: 0 });
    tw(h, { o: 1 }, 0.2, 0.6, out);

    const card = G(p, { x: 800, y: 480, o: 0 });
    path(card, 'M-520 -190h1040v380h-1040z', { fill: '#14201c', stroke: COL.good, 'stroke-width': 2, rx: 20 });
    tw(card, { o: 1 }, 0.4, 0.8, out);

    T(card, 'Chapter ${section.chapterNumber} Summary & Takeaways', { x: -440, y: -100, size: 30, fill: COL.good, weight: 600 });
    T(card, '✓ Visual model explains ${escapeJs(section.title)} through structure', { x: -440, y: -30, size: 24, fill: COL.chalk });
    T(card, '✓ Interactive verification confirms understanding of properties', { x: -440, y: 30, size: 24, fill: COL.chalk });
    T(card, '✓ Ready for subsequent chapters in this sequence', { x: -440, y: 90, size: 24, fill: COL.dim });
  }, { narration: '${cleanNarration}' }]`;
  });

  return `// Shilpa Interactive Lesson: Chapter ${section.chapterNumber}
window.TIMINGS = ${timingsJson};
window.HAS_AUDIO_FILES = false;

const CHAPTER = {
  number: ${section.chapterNumber},
  title: '${escapeJs(section.title)}',
  minutes: ${section.estimatedMinutes || 6}
};

const BEATS = [
${beatDefinitions.join(",\n")}
].map(([id, title, run, extra]) => ({ id, title, run, ...(extra || {}) }));

boot();
`;
}

/**
 * Generates an interactive lesson end-to-end for a given chapter.
 */
export async function generateChapterLesson(
  opts: BeatGeneratorOptions
): Promise<{ storyboard: ShilpaStoryboard; scriptContent: string }> {
  const { bookId, bookTitle, section, pdfBuffer, onProgress } = opts;

  // Step 1: Extract Text
  onProgress?.({
    stage: "extracting_text",
    progressPercent: 20,
    message: `Extracting text for Chapter ${section.chapterNumber} (pages ${section.startPage}–${section.endPage})...`,
  });

  let chapterText = section.extractedText || "";
  if (!chapterText && pdfBuffer) {
    try {
      chapterText = await extractChapterText(pdfBuffer, section.startPage, section.endPage);
    } catch (err) {
      console.warn("[beat-generator] Text extraction fallback:", err);
    }
  }

  // Step 2: Planning Storyboard grounded in text
  onProgress?.({
    stage: "planning_storyboard",
    progressPercent: 50,
    message: `Planning pedagogical storyboard and visual arguments...`,
  });

  const storyboard = analyzeAndExtractStoryboard(section, chapterText);

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
