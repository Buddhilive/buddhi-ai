# Buddhi AI: Private, On-Device Academic Intelligence & Research Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb?style=flat&logo=react)](https://react.dev/)
[![LiteRT](https://img.shields.io/badge/Google_LiteRT-WebGPU%2FWASM-4285F4?style=flat&logo=google)](https://ai.google.dev/edge/litert)
[![PGlite](https://img.shields.io/badge/PGlite-Vector_WASM-336791?style=flat&logo=postgresql)](https://pglite.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <img src="public/icons/icon-192x192.png" width="96" height="96" alt="Buddhi AI Logo" />
</p>

<p align="center">
  <strong>Buddhi AI</strong> is an open-source, client-side academic research platform and intelligent comprehension environment running <strong>100% privately in the browser</strong>. Powered by Google LiteRT, client-side language and embedding models, in-browser PGlite vector storage, and Recursive Language Models (RLM), Buddhi AI eliminates server computation costs while guaranteeing complete data confidentiality.
</p>

---

## Key Highlights

- **100% Client-Side Privacy**: Unpublished manuscripts, proprietary datasets, and personal reading notes never leave your device. All inference and vector queries execute locally.
- **On-Device LiteRT Runtime**: Powered by `@litert-lm/core` and `@litertjs/core` running on **WebGPU** with WebAssembly fallbacks.
- **Local Language & Embedding Models**: Native support for **Gemma 4 E2B** (`litert-community/gemma-4-E2B-it-litert-lm`) and **EmbeddingGemma 300M** (`litert-community/embeddinggemma-300m`).
- **In-Browser PGlite Vector Store**: Embedded PostgreSQL running in WebAssembly via `@electric-sql/pglite` and `@electric-sql/pglite-pgvector` for instant semantic vector search and paper chunk indexing.
- **Recursive Language Models (RLM)**: Intelligent recursive document decomposition, literature matrix synthesis, and hierarchical paper summarization.
- **Client-Side Execution Sandbox**: Direct integration with `@buddhilive/sandbox` and `@buddhilive/sandbox-sw` for zero-backend, client-side Next.js code execution and live interactive previews.
- **Academic Research Tools**: Integrated PDF extraction (`pdfjs-dist`), citation generation (APA, IEEE, ACM, BibTeX), and literature review drafting.

---

## System Architecture

```mermaid
graph TD
    User((Researcher)) -->|Upload Paper / Prompt| UI[Buddhi AI Research Workspace]

    subgraph Browser_Client_Side [Browser Environment - 100% Client-Side]
        direction TB

        subgraph Ingestion_Layer [Ingestion & Processing]
            PDF[PDF / Document Parser] --> CHUNK[Semantic Text Splitter]
            CHUNK --> EMB[LiteRT Embedding Worker<br/>EmbeddingGemma-300M]
        end

        subgraph Storage_Layer [In-Browser Storage]
            EMB -->|Vector Embeddings| PGLITE[(PGlite WASM<br/>pgvector Store)]
            PDF -->|Document Cache| IDB[(IndexedDB Storage)]
        end

        subgraph Reasoning_Layer [Cognitive & Reasoning Pipeline]
            PGLITE -->|Semantic Retrieval| RAG[RAG Engine]
            RAG --> RLM[Recursive Language Model<br/>RLM Service]
            RLM --> CTX[Context Assembler & Prompts]
        end

        subgraph Inference_Layer [On-Device Model Execution]
            CTX --> LITERT[Google LiteRT WebGPU Runtime]
            LITERT --> GEMMA[Gemma 4 E2B<br/>Chat Template v4]
        end

        subgraph Sandbox_Layer [Client Execution Sandbox]
            GEMMA -->|Generated Code / Previews| SB[@buddhilive/sandbox<br/>Service Worker Runtime]
        end
    end

    GEMMA -->|Streaming Token Responses| UI
    SB -->|Live In-Browser Preview| UI
```

---

## Core Capabilities

### 1. On-Device LiteRT AI Engine
Buddhi AI utilizes Google's **LiteRT** runtime (`@litert-lm/core`, `@litertjs/core`) for hardware-accelerated local inference:
- **Gemma 4 E2B**: Fast edge-optimized language model running in WebGPU mode, utilizing official `gemma4` channel chat templates.
- **EmbeddingGemma 300M**: On-device vector embeddings for academic paper chunking, literature similarity scoring, and dense retrieval.
- **Zero-Cloud Dependency**: Downloaded models are cached in the browser's origin storage; no external API keys or server quotas needed.

### 2. In-Browser PGlite Vector Store
Rather than sending paper text to remote vector databases, Buddhi AI runs a full SQL database in WebAssembly:
- Powered by `@electric-sql/pglite` and `@electric-sql/pglite-pgvector`.
- Generates Euclidean and cosine similarity vector queries directly within browser memory.
- Fast, transactional storage of paper sections, abstracts, methodology notes, and citation references.

### 3. Recursive Language Models (RLM)
Handling long scientific papers requires hierarchical digestion:
- `rlm-service.ts` coordinates recursive summarization and literature matrix generation.
- Breaks down complex 50+ page manuscripts into interconnected conceptual sections.
- Synthesizes findings across multiple publications to isolate methodology biases and research gaps.

### 4. In-Browser Sandbox Execution
Buddhi AI embeds `@buddhilive/sandbox` and `@buddhilive/sandbox-sw`:
- Compiles, bundles, and previews generated Next.js and React code entirely client-side.
- Service Worker routes requests dynamically inside the browser without spinning up any Node.js container or remote cloud environment.

---

## Supported Local Models

| Model | Type | Architecture | File | Provider |
|---|---|---|---|---|
| **Gemma 4 E2B** | Language | WebGPU / WASM | `gemma-4-E2B-it-web.litertlm` | `litert-community/gemma-4-E2B-it-litert-lm` |
| **EmbeddingGemma 300M** | Embedding | WebGPU / WASM | `embeddinggemma-300M_seq2048_mixed-precision.tflite` | `litert-community/embeddinggemma-300m` |

*Note: EmbeddingGemma requires a Hugging Face User Access Token due to repository gating.*

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Frontend Core**: React 19, TypeScript 5
- **On-Device AI Engine**: Google LiteRT (`@litert-lm/core`, `@litertjs/core`)
- **Vector Database**: PGlite (`@electric-sql/pglite`, `@electric-sql/pglite-pgvector`)
- **Sandbox Environment**: `@buddhilive/sandbox`, `@buddhilive/sandbox-sw`
- **Styling**: Tailwind CSS v4, Motion (Framer Motion v12)
- **Document Processing**: `pdfjs-dist`, `@langchain/textsplitters`
- **Markdown & Streaming**: `streamdown`, `@streamdown/code`, `@streamdown/math`, `@streamdown/mermaid`
- **State Management**: Zustand v5

---

## Developer Quickstart

### Prerequisites
- **Node.js**: >= 20.x
- **Package Manager**: `pnpm` >= 9.x
- **Browser**: Modern Chromium browser with WebGPU enabled (Chrome 113+, Edge 113+, or Brave).

### 1. Clone the Repository
```bash
git clone https://github.com/Buddhilive/buddhi-ai.git
cd buddhi-ai
```

### 2. Install Dependencies
During install, postinstall scripts automatically copy required Service Worker and LiteRT WASM binaries to `public/`:
```bash
pnpm install
```

*(Under the hood, this executes `node scripts/copy-sw.js && node scripts/copy-litert-wasm.js`)*

### 3. Launch Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
pnpm build
```

---

## Development Scripts

- `pnpm dev`: Start Next.js development server with Turbopack.
- `pnpm build`: Create optimized production build.
- `pnpm start`: Start production server.
- `pnpm lint`: Run ESLint checks across all TypeScript files.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.