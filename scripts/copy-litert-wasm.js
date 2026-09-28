/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "..", "node_modules", "@litertjs", "core", "wasm");
const destDir = path.join(__dirname, "..", "public", "litert-wasm");

try {
  if (fs.existsSync(srcDir)) {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const files = fs.readdirSync(srcDir);
    for (const file of files) {
      const srcFile = path.join(srcDir, file);
      const destFile = path.join(destDir, file);
      if (fs.statSync(srcFile).isFile()) {
        fs.copyFileSync(srcFile, destFile);
      }
    }
    console.log(`✓ Successfully copied ${files.length} LiteRT WASM assets to public/litert-wasm/`);
  } else {
    console.warn("⚠️ Could not find @litertjs/core/wasm to copy");
  }
} catch (err) {
  console.error("Failed to copy LiteRT WASM assets:", err);
}
