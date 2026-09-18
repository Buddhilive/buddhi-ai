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
