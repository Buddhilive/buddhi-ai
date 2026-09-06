# Quickstart: Testing LiteRT-LM Local Inference

## Prerequisites
- A WebGPU-capable modern browser (e.g. Google Chrome 113+ or Microsoft Edge) with hardware acceleration enabled.
- Node.js 20+ installed.

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Run Development Server**:
   ```bash
   pnpm dev
   ```

3. **Download Model**:
   - Open browser to `http://localhost:3000/models`.
   - Locate **Gemma 4 E2B** (`gemma-4-E2B-it-web.litertlm`).
   - Click **Download** and wait until download reaches 100% and marks as `Completed`.

4. **Start Chatting**:
   - Navigate to `http://localhost:3000/chat`.
   - Submit a prompt (e.g. "Explain WebGPU in simple terms").
   - Confirm tokens stream in real-time.
   - Confirm sidebar only shows `New Chat`, `Models`, and `History` (no `Documents` or `Knowledge Graph`).
