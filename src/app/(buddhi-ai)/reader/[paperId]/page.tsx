"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, BookOpen } from "lucide-react";
import { getPaperById, getChunksByPaperId } from "@/lib/paper-storage";
import { usePaperStore } from "@/stores/paper-store";
import { PdfReader } from "@/components/research/pdf-reader";
import { AiAssistantPanel } from "@/components/research/ai-assistant-panel";
import { Button } from "@/components/ui/button";
import type { Paper, Chunk } from "@/types/research";

export default function ReaderPage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const resolvedParams = use(params);
  const paperId = resolvedParams.paperId;
  const router = useRouter();

  const [paper, setPaper] = useState<Paper | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(true);

  const { setCurrentPaper, setChunks: setStoreChunks } = usePaperStore();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const p = await getPaperById(paperId);
        if (p) {
          setPaper(p);
          setCurrentPaper(p);
          const c = await getChunksByPaperId(paperId);
          setChunks(c);
          setStoreChunks(c);
        }
      } catch (err) {
        console.error("Failed to load paper:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [paperId, setCurrentPaper, setStoreChunks]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Opening document...</p>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <BookOpen className="h-10 w-10 text-muted-foreground/50" />
        <h2 className="text-xl font-semibold">Paper Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested paper could not be found in your local library.
        </p>
        <Button onClick={() => router.push("/library")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-full min-h-0 overflow-hidden">
      <div className="h-12 border-b bg-background/80 backdrop-blur px-6 flex items-center justify-between shrink-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/library")}
          className="gap-2 text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Button>
        <span
          className="text-xs font-medium text-muted-foreground truncate max-w-md"
          title={paper.metadata.title}
        >
          {paper.metadata.title}
        </span>
      </div>

      <div className="flex flex-1 min-h-0 min-w-0 w-full overflow-hidden">
        <PdfReader paper={paper} chunks={chunks} />
        <AiAssistantPanel paperId={paper.id} />
      </div>
    </div>
  );
}
