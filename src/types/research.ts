export type EmbeddingStatus = "idle" | "extracting" | "embedding" | "completed" | "failed";

export interface PaperMetadata {
  title: string;
  authors: string[];
  year?: string;
  abstract?: string;
  doi?: string;
  journal?: string;
}

export interface Paper {
  id: string; // nanoid
  hash: string; // SHA-256 for dedup
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  pageCount: number;
  metadata: PaperMetadata;
  embeddingStatus: EmbeddingStatus;
  totalChunks: number;
  embeddedChunks: number;
  rawText?: string;
}

export interface Chunk {
  id: string; // ${paperId}::${chunkIndex}
  paperId: string;
  chunkIndex: number;
  pageNumber: number;
  sectionHeading?: string;
  text: string;
  tokenCount?: number;
}

export interface ChunkEmbedding {
  id: string; // ${paperId}::${chunkIndex}
  paperId: string;
  chunkIndex: number;
  embedding: number[]; // Float32Array serialized as Array for IDB
}

export interface SearchResultChunk extends Chunk {
  similarity: number;
}

export type CitationFormat = "apa" | "mla" | "bibtex" | "chicago" | "ieee";

export interface RAGCitation {
  chunkId: string;
  paperId: string;
  pageNumber: number;
  sectionHeading?: string;
  textSnippet: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: RAGCitation[];
  timestamp: number;
}

export type PipelineStage =
  | "idle"
  | "reading"
  | "parsing"
  | "chunking"
  | "embedding"
  | "saving"
  | "completed"
  | "failed";

export interface IngestionJob {
  id: string; // paperId
  fileName: string;
  fileSize: number;
  stage: PipelineStage;
  progress: number; // 0 to 100 percentage
  currentStep: number; // 1 to 4
  totalSteps: number; // 4
  stepLabel: string;
  currentChunk: number;
  totalChunks: number;
  error?: string;
  paper?: Paper;
  startTime: number;
  completedTime?: number;
}

export interface IngestionQueueState {
  jobs: IngestionJob[];
  isProcessing: boolean;
  activeJobId: string | null;
}

export interface PGliteVectorRecord {
  id: string;
  paper_id: string;
  chunk_index: number;
  page_number: number;
  text: string;
  embedding: number[];
}

