/**
 * Shilpa Studio - Sandbox POSIX VirtualFS Bridge
 * Generates file maps for mounting Shilpa book projects into @buddhilive/sandbox.
 */

import type { ShilpaBook } from "@/types/shilpa";

export interface SandboxBookFileMap {
  [filePath: string]: string;
}

/**
 * Constructs the complete file tree for a book project to mount into /workspace/books/<slug>/.
 */
export async function buildSandboxBookFiles(
  book: ShilpaBook,
  engineJsContent?: string,
  engineCssContent?: string
): Promise<SandboxBookFileMap> {
  const files: SandboxBookFileMap = {};
  const basePath = `/workspace/books/${book.id}`;

  // 1. BOOK.md
  files[`${basePath}/BOOK.md`] = `# ${book.title}
Author: ${book.author || "Unknown"}
Language: ${book.language}
Chapters: ${book.sections.length}
Created with Shilpa Studio (Buddhi AI).
`;

  // 2. sections.json
  files[`${basePath}/sections.json`] = JSON.stringify(
    book.sections.map((s) => ({
      folder: s.folder,
      title: s.title,
      unit: s.unit,
      start: s.startPage,
      end: s.endPage,
      minutes: s.estimatedMinutes,
      status: s.status,
    })),
    null,
    2
  );

  // 3. Engine copy
  if (engineJsContent) {
    files[`${basePath}/lib/engine.js`] = engineJsContent;
  }
  if (engineCssContent) {
    files[`${basePath}/lib/engine.css`] = engineCssContent;
  }

  // 4. Chapters
  for (const sec of book.sections) {
    const chapterFolder = `${basePath}/${sec.folder}`;
    const timingsObj = sec.timings || {};

    files[`${chapterFolder}/audio/en/timings.js`] = `window.TIMINGS = ${JSON.stringify(timingsObj, null, 2)};\n`;

    const scriptBody = sec.scriptContent || `// Chapter ${sec.chapterNumber} lesson script\nconst CHAPTER = { number: ${sec.chapterNumber}, title: '${sec.title}', minutes: ${sec.estimatedMinutes} };\nconst BEATS = [];\nboot();\n`;

    files[`${chapterFolder}/index.html`] = `<!doctype html>
<html lang="${book.language || "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${sec.title} — ${book.title}</title>
  <link rel="stylesheet" href="../lib/engine.css">
</head>
<body>
  <script src="../lib/engine.js"></script>
  <script src="audio/en/timings.js"></script>
  <script>
  'use strict';
  ${scriptBody}
  </script>
</body>
</html>`;
  }

  return files;
}
