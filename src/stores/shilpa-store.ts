import { create } from "zustand";
import type { ShilpaBook, ShilpaSection, GenerationProgress } from "@/types/shilpa";
import { getAllShilpaBooks, saveShilpaBook, ShilpaChapterData } from "@/lib/shilpa/storage";

interface ShilpaStoreState {
  books: ShilpaBook[];
  activeBook: ShilpaBook | null;
  activeChapter: ShilpaSection | null;
  activeChapterData: ShilpaChapterData | null;
  activeTab: "player" | "map" | "storyboard" | "sandbox";
  generationProgress: GenerationProgress;
  isLoading: boolean;

  // Actions
  setBooks: (books: ShilpaBook[]) => void;
  setActiveBook: (book: ShilpaBook | null) => void;
  setActiveChapter: (chapter: ShilpaSection | null) => void;
  setActiveChapterData: (data: ShilpaChapterData | null) => void;
  setActiveTab: (tab: "player" | "map" | "storyboard" | "sandbox") => void;
  setGenerationProgress: (progress: GenerationProgress) => void;
  resetGenerationProgress: () => void;
  updateSection: (bookId: string, folder: string, updates: Partial<ShilpaSection>) => Promise<void>;
  loadBooks: () => Promise<void>;
}

const DEFAULT_PROGRESS: GenerationProgress = {
  stage: "idle",
  progressPercent: 0,
  message: "",
};

export const useShilpaStore = create<ShilpaStoreState>((set, get) => ({
  books: [],
  activeBook: null,
  activeChapter: null,
  activeChapterData: null,
  activeTab: "player",
  generationProgress: DEFAULT_PROGRESS,
  isLoading: false,

  setBooks: (books) => set({ books }),
  setActiveBook: (activeBook) => set({ activeBook }),
  setActiveChapter: (activeChapter) => set({ activeChapter }),
  setActiveChapterData: (activeChapterData) => set({ activeChapterData }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setGenerationProgress: (generationProgress) => set({ generationProgress }),
  resetGenerationProgress: () => set({ generationProgress: DEFAULT_PROGRESS }),

  updateSection: async (bookId, folder, updates) => {
    const { activeBook, books } = get();
    if (!activeBook || activeBook.id !== bookId) return;

    const updatedSections = activeBook.sections.map((sec) =>
      sec.folder === folder ? { ...sec, ...updates } : sec
    );

    const updatedBook: ShilpaBook = {
      ...activeBook,
      sections: updatedSections,
      updatedAt: Date.now(),
    };

    await saveShilpaBook(updatedBook);

    set({
      activeBook: updatedBook,
      activeChapter:
        get().activeChapter?.folder === folder
          ? { ...get().activeChapter!, ...updates }
          : get().activeChapter,
      books: books.map((b) => (b.id === bookId ? updatedBook : b)),
    });
  },

  loadBooks: async () => {
    set({ isLoading: true });
    try {
      const books = await getAllShilpaBooks();
      set({ books });
    } catch (err) {
      console.error("[shilpa-store] Failed to load books:", err);
    } finally {
      set({ isLoading: false });
    }
  },
}));
