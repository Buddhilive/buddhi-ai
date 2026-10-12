/**
 * Shilpa Studio Prompt Composer
 * Encapsulates pedagogical rules, visual arguments, SVG drawing APIs, and timing invariants.
 */

import type { ShilpaSection } from "@/types/shilpa";

export const SHILPA_ENGINE_DIRECTIVE = `
You are the Shilpa Studio Interactive Lesson Author. Your mission is to turn chapter text from reference textbooks into an animated, narrated, interactive web lesson.

### Stage & Geometry
- Viewport: SVG 1600x900 (\`viewBox="0 0 1600 900"\`). Center is (800, 450).
- Scene elements live in \`scene\`. HTML cards live in \`#ui\`.
- Shared state across beats is held on \`S\` (e.g. \`S.line\`, \`S.panel\`). \`reset()\` clears it between seeks.

### Drawing Helpers Available
- \`G(parent, {x, y, s, r, o})\`: Group
- \`path(parent, d, attrs, {d: 0})\`: Path. \`{d: 0}\` prepares it for animated drawing via \`draw(p, t0, dur)\`.
- \`T(parent, text, {x, y, size, fill, font, weight, anchor, o})\`: Text
- \`M(parent, parts, {x, y, size, fill, anchor, o, s})\`: Math with baseline at y (parts: strings, \`F(n,d)\` fractions, \`R(x, i)\` roots, \`E(exp)\` exponents).
- \`panel(t0)\`: Fade current scene group and start a new one.
- \`tw(el, to, t0, dur, ease)\`: Tween attributes (\`x\`, \`y\`, \`s\`, \`r\`, \`o\`). Eases: \`io\`, \`out\`, \`back\`, \`lin\`.
- \`show(el, t0, dur)\`, \`hide(el, t0, dur)\`, \`pop(el, t0)\`, \`pulse(el, t0)\`, \`draw(path, t0, dur)\`.
- Colors in \`COL\`: \`chalk\` (#f4f4f5), \`dim\` (#a1a1aa), \`faint\` (#52525b), \`good\` (#10b981), \`bad\` (#ef4444), and hues (\`nat\`, \`whole\`, \`int\`, \`rat\`, \`irr\`, \`real\`).

### Beat Structure & Timing
Each beat has:
- \`id\`: string identifier (e.g. 'intro', 'step1', 'q1', 'wrap', 'finish')
- \`title\`: short string
- \`run\`: \`(m, D) => { ... }\` where \`m('markName', offset)\` gives the second offset when the spoken word after \`[[markName]]\` begins. \`D\` is clip duration.
- Optional question: \`{ ask: done => quiz(BAND, [ { id: '...', prompt: [...], build: choice(...) } ], done) }\`.

### Pedagogical Rules
1. **The picture explains the idea through change**: Rearrange, split, balance, count, compare. Animation is the argument, not decoration.
2. **Open on the subject**: Introduce the visual object promptly at t0 (within 0.4s).
3. **Synchronize with narration marks**: Use \`[[mark]]\` in narration, and trigger actions with \`m('mark')\`.
4. **Interactive Quick Checks**: Use \`choice\`, \`blanks\`, or \`tap\` questions to verify understanding.
`;

export function composeStoryboardPrompt(
  bookTitle: string,
  section: ShilpaSection,
  chapterText: string
): string {
  return `${SHILPA_ENGINE_DIRECTIVE}

You are planning the storyboard for Chapter ${section.chapterNumber}: "${section.title}" from "${bookTitle}".
Reference Text (Pages ${section.startPage}-${section.endPage}):
---
${chapterText.slice(0, 8000)}
---

Create a JSON storyboard with 4 to 7 beats:
1. 'intro': Title card and high-level learning goal.
2. 2 to 4 lesson beats: Each introducing one core visual model and concept with narration containing [[mark]] tags.
3. 1 to 2 'q1' / 'q2' quick check beats with interactive quiz cards.
4. 'wrap' or 'finish': Summary of key insights.

Output ONLY valid JSON matching this schema:
{
  "chapterNumber": ${section.chapterNumber},
  "title": "${section.title}",
  "targetAudience": "Learners seeking visual intuition",
  "visualMetaphors": ["list of main visual representations used"],
  "beats": [
    {
      "id": "intro",
      "title": "Introduction",
      "type": "lesson",
      "narrationText": "Welcome to Chapter ${section.chapterNumber}. [[start]]Today we explore ${section.title}.",
      "visualActions": ["Fade in title text", "Animate primary concept diagram"],
      "quizSpec": null
    },
    {
      "id": "q1",
      "title": "Quick Check",
      "type": "quiz",
      "narrationText": "Quick check. Let's see if you can identify the correct concept.",
      "visualActions": ["Display quiz prompt"],
      "quizSpec": {
        "id": "q1",
        "type": "choice",
        "prompt": "Which of the following is true?",
        "options": ["Option A", "Option B", "Option C"],
        "answer": 0,
        "explanation": "Explanation of why Option A is correct."
      }
    }
  ]
}
`;
}

export function composeBeatsCodePrompt(
  section: ShilpaSection,
  storyboardJson: string
): string {
  return `${SHILPA_ENGINE_DIRECTIVE}

You are generating the complete executable JavaScript script for Chapter ${section.chapterNumber}: "${section.title}".

Storyboard Specification:
---
${storyboardJson}
---

Generate the complete executable JavaScript code that defines CHAPTER, drawing helpers, BEATS array, and calls boot().
Ensure the code:
1. Defines:
   \`const CHAPTER = { number: ${section.chapterNumber}, title: '${section.title.replace(/'/g, "\\'")}', minutes: ${section.estimatedMinutes} };\`
2. Implements all beats in \`const BEATS = [ ... ];\`.
3. Sets up inline timing fallback \`window.TIMINGS = { ... };\` with durations (8 to 15s per beat), marks, and sentence cues.
4. Uses valid SVG helpers (\`G\`, \`path\`, \`T\`, \`M\`, \`tw\`, \`panel\`, \`show\`, \`hide\`, \`pop\`, \`pulse\`, \`draw\`).
5. Implements question beats using \`quiz(BAND, [...], done)\`.
6. Concludes with \`boot();\`.

Output ONLY executable JavaScript code inside a \`\`\`javascript code block.
`;
}
