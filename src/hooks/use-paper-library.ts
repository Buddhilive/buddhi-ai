"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAllPapers, deletePaperAndData } from "@/lib/paper-storage";
import type { Paper } from "@/types/research";
import { toast } from "sonner";

export function usePaperLibrary() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const refreshPapers = useCallback(async () => {
    try {
      setIsLoading(true);
      const all = await getAllPapers();
      setPapers(all.sort((a, b) => b.uploadedAt - a.uploadedAt));
    } catch (err) {
      console.error("Failed to load papers:", err);
      toast.error("Failed to refresh library");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPapers();
  }, [refreshPapers]);

  const deletePaper = async (paperId: string): Promise<boolean> => {
    try {
      await deletePaperAndData(paperId);
      setPapers((prev) => prev.filter((p) => p.id !== paperId));
      toast.success("Paper and associated vectors deleted");
      return true;
    } catch (err) {
      console.error("Failed to delete paper:", err);
      toast.error("Failed to delete paper");
      return false;
    }
  };

  const filteredPapers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return papers;
    return papers.filter((p) => {
      const matchTitle = (p.metadata.title || p.fileName).toLowerCase().includes(q);
      const matchAuthors = p.metadata.authors.some((a) => a.toLowerCase().includes(q));
      return matchTitle || matchAuthors;
    });
  }, [papers, searchQuery]);

  return {
    papers: filteredPapers,
    allPapersCount: papers.length,
    isLoading,
    searchQuery,
    setSearchQuery,
    deletePaper,
    refreshPapers,
  };
}
