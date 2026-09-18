import { create } from "zustand";
import type { Paper, Chunk, RAGCitation } from "@/types/research";

interface PaperState {
  currentPaper: Paper | null;
  chunks: Chunk[];
  selectedChunkId: string | null;
  activeCitations: RAGCitation[];
  searchQuery: string;
  isEmbeddingInProgress: boolean;
  embeddingProgress: { current: number; total: number };
  
  setCurrentPaper: (paper: Paper | null) => void;
  setChunks: (chunks: Chunk[]) => void;
  setSelectedChunkId: (id: string | null) => void;
  setActiveCitations: (citations: RAGCitation[]) => void;
  setSearchQuery: (query: string) => void;
  setEmbeddingProgress: (current: number, total: number, inProgress: boolean) => void;
}

export const usePaperStore = create<PaperState>((set) => ({
  currentPaper: null,
  chunks: [],
  selectedChunkId: null,
  activeCitations: [],
  searchQuery: "",
  isEmbeddingInProgress: false,
  embeddingProgress: { current: 0, total: 0 },

  setCurrentPaper: (currentPaper) => set({ currentPaper }),
  setChunks: (chunks) => set({ chunks }),
  setSelectedChunkId: (selectedChunkId) => set({ selectedChunkId }),
  setActiveCitations: (activeCitations) => set({ activeCitations }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setEmbeddingProgress: (current, total, isEmbeddingInProgress) =>
    set({ embeddingProgress: { current, total }, isEmbeddingInProgress }),
}));
