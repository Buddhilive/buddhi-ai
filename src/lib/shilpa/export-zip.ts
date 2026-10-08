/**
 * Shilpa Studio - Standalone Static Book Exporter
 * Bundles the complete animated book into a self-contained ZIP using fflate.
 */

import { zipSync, strToU8 } from "fflate";
import type { ShilpaBook } from "@/types/shilpa";

/**
 * Generates the root index.html (Bookshelf & Table of Contents page).
 */
function buildBookIndexHtml(book: ShilpaBook): string {
  const chapterList = book.sections
    .map(
      (sec) => `    <li class="chapter-item">
      <span class="num">${sec.chapterNumber}</span>
      <div class="info">
        <a href="${sec.folder}/index.html">${sec.title}</a>
        <span class="meta">${sec.unit ? sec.unit + " • " : ""}~${sec.estimatedMinutes} mins</span>
      </div>
    </li>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="${book.language || "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${book.title} — Animated Interactive Book</title>
  <style>
    :root {
      --bg: #09090b;
      --card: #18181b;
      --border: #27272a;
      --text: #f4f4f5;
      --muted: #a1a1aa;
      --primary: #10b981;
    }
    body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 720px;
      width: 100%;
      padding: 48px 20px;
    }
    .header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--primary);
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      padding: 2px 8px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
    }
    p.author {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
    }
    .toc {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .chapter-item {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 18px;
      transition: all 0.2s ease;
    }
    .chapter-item:hover {
      border-color: var(--primary);
      transform: translateX(2px);
    }
    .num {
      width: 28px;
      height: 28px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
    }
    .info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .info a {
      color: var(--text);
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
    }
    .info a:hover {
      color: var(--primary);
    }
    .meta {
      font-size: 12px;
      color: var(--muted);
    }
    .footer {
      margin-top: 48px;
      font-size: 12px;
      color: var(--muted);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Interactive Web Book</span>
      <h1>${book.title}</h1>
      <p class="author">${book.author || "Created with Shilpa Studio"}</p>
    </div>

    <ul class="toc">
${chapterList}
    </ul>

    <div class="footer">
      Generated with <strong>Shilpa Studio (Buddhi AI)</strong>. Offline runnable static site.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Exports the complete book project as a downloadable ZIP.
 */
export async function exportBookAsZip(book: ShilpaBook): Promise<void> {
  const files: Record<string, Uint8Array> = {};

  // 1. Fetch engine.js and engine.css
  let engineJs = "";
  let engineCss = "";
  try {
    const jsRes = await fetch("/shilpa/lib/engine.js");
    engineJs = await jsRes.text();
    const cssRes = await fetch("/shilpa/lib/engine.css");
    engineCss = await cssRes.text();
  } catch {
    console.warn("[export-zip] Could not fetch engine assets from /shilpa/lib");
  }

  files["lib/engine.js"] = strToU8(engineJs);
  files["lib/engine.css"] = strToU8(engineCss);

  // 2. Root index.html
  files["index.html"] = strToU8(buildBookIndexHtml(book));

  // 3. Chapters
  for (const sec of book.sections) {
    const folder = sec.folder;
    const timingsObj = sec.timings || {};

    files[`${folder}/audio/en/timings.js`] = strToU8(
      `window.TIMINGS = ${JSON.stringify(timingsObj, null, 2)};\n`
    );

    const scriptBody =
      sec.scriptContent ||
      `const CHAPTER = { number: ${sec.chapterNumber}, title: '${sec.title}', minutes: ${sec.estimatedMinutes} };\nconst BEATS = [];\nboot();\n`;

    const chapterHtml = `<!doctype html>
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

    files[`${folder}/index.html`] = strToU8(chapterHtml);
  }

  // 4. Zip and trigger browser download
  const zipped = zipSync(files);
  const blob = new Blob([zipped as any], { type: "application/zip" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${book.id || "interactive-book"}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
