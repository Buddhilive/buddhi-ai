/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "@buddhilive", "sandbox-sw", "dist", "sw.js");
const dest = path.join(__dirname, "..", "public", "sandbox-sw.js");

try {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log("✓ Successfully copied sandbox-sw.js to public/");
  } else {
    console.warn("⚠️ Could not find @buddhilive/sandbox-sw/dist/sw.js to copy");
  }
} catch (err) {
  console.error("Failed to copy sandbox-sw.js:", err);
}
