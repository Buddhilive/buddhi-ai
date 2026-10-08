"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Download,
  Terminal,
  Play,
  Map,
  Film,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShilpaPlayer } from "./shilpa-player";
import { ShilpaChapterMap } from "./shilpa-chapter-map";
import { ShilpaStoryboardView } from "./shilpa-storyboard";
import { ShilpaSandboxEditor } from "./shilpa-sandbox-editor";
import { ShilpaGeneratorDialog } from "./shilpa-generator-dialog";
import { useShilpaStore } from "@/stores/shilpa-store";
import { getShilpaBookById, getChapterContent } from "@/lib/shilpa/storage";
import { exportBookAsZip } from "@/lib/shilpa/export-zip";
import type { ShilpaSection } from "@/types/shilpa";

interface ShilpaStudioProps {
  bookId: string;
}

export function ShilpaStudio({ bookId }: ShilpaStudioProps) {
  const router = useRouter();
  const {
    activeBook,
    activeChapter,
    activeTab,
    setActiveBook,
    setActiveChapter,
    setActiveTab,
  } = useShilpaStore();

  const [loading, setLoading] = useState(true);
  const [scriptContent, setScriptContent] = useState<string | undefined>();
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [targetChapter, setTargetChapter] = useState<ShilpaSection | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        let book = await getShilpaBookById(bookId);

        // Built-in Demo Book Fallback
        if (!book && bookId === "elementary-algebra") {
          book = {
            id: "elementary-algebra",
            title: "Elementary Algebra",
            author: "OpenStax / Papermorph",
            pageCount: 68,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: "ready",
            language: "en",
            coverPalette: ["#1d2b27", "#3dd68c", "#e2a93c", "#4daafc"],
            isSample: true,
            sections: [
              {
                chapterNumber: 1,
                folder: "ch01",
                title: "Types of numbers",
                unit: "Unit 1: Foundations",
                startPage: 1,
                endPage: 12,
                chapterStartPage: 1,
                estimatedMinutes: 8,
                status: "ready",
              },
              {
                chapterNumber: 2,
                folder: "ch02",
                title: "Integers and absolute value",
                unit: "Unit 1: Foundations",
                startPage: 13,
                endPage: 28,
                chapterStartPage: 13,
                estimatedMinutes: 9,
                status: "unprocessed",
              },
            ],
          };
        }

        if (book) {
          setActiveBook(book);
          if (book.sections.length > 0 && !activeChapter) {
            setActiveChapter(book.sections[0]);
          }
        }
      } catch (err) {
        console.error("[shilpa-studio] Failed to load book:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [bookId, setActiveBook, setActiveChapter, activeChapter]);

  // Load chapter script content when chapter changes
  useEffect(() => {
    async function loadScript() {
      if (!activeBook || !activeChapter) return;
      if (activeBook.isSample && activeChapter.folder === "ch01") {
        setScriptContent(undefined); // Loads /shilpa/sample/ch01.html directly
        return;
      }
      try {
        const data = await getChapterContent(activeBook.id, activeChapter.folder);
        setScriptContent(data?.scriptContent);
      } catch (err) {
        console.error("[shilpa-studio] Failed to load chapter content:", err);
      }
    }

    loadScript();
  }, [activeBook, activeChapter]);

  const handleOpenGenerator = (chapter: ShilpaSection) => {
    setTargetChapter(chapter);
    setGeneratorOpen(true);
  };

  const handleExportZip = async () => {
    if (!activeBook) return;
    try {
      setIsExporting(true);
      await exportBookAsZip(activeBook);
    } catch (err) {
      console.error("[shilpa-studio] Export ZIP failed:", err);
      alert("Failed to export ZIP. Check the console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading || !activeBook) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-zinc-400">Loading Shilpa Studio...</p>
      </div>
    );
  }

  const currentChapter = activeChapter || activeBook.sections[0];

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Studio Navigation Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/shilpa")}
            className="h-8 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Bookshelf
          </Button>

          <div className="h-4 w-px bg-zinc-800" />

          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-semibold truncate text-zinc-100 flex items-center gap-2">
              {activeBook.title}
              {activeBook.isSample && (
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                  Demo
                </Badge>
              )}
            </h1>
            <span className="text-[11px] text-zinc-400 truncate">
              {currentChapter ? `Chapter ${currentChapter.chapterNumber}: ${currentChapter.title}` : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentChapter && (
            <Button
              size="sm"
              onClick={() => handleOpenGenerator(currentChapter)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-8 gap-1.5 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate Lesson
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportZip}
            disabled={isExporting}
            className="border-zinc-700 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 text-xs h-8 gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? "Exporting..." : "Export .zip"}
          </Button>
        </div>
      </div>

      {/* Main Workspace Area with Tabs */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex items-center justify-between pb-2 shrink-0">
            <TabsList className="bg-zinc-900 border border-zinc-800 h-9 p-1">
              <TabsTrigger
                value="player"
                className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-300 text-xs gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                Lesson Player
              </TabsTrigger>
              <TabsTrigger
                value="map"
                className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-300 text-xs gap-1.5"
              >
                <Map className="h-3.5 w-3.5" />
                Chapter Map ({activeBook.sections.length})
              </TabsTrigger>
              <TabsTrigger
                value="storyboard"
                className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-300 text-xs gap-1.5"
              >
                <Film className="h-3.5 w-3.5" />
                Storyboard
              </TabsTrigger>
              <TabsTrigger
                value="sandbox"
                className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-300 text-xs gap-1.5"
              >
                <Terminal className="h-3.5 w-3.5" />
                Sandbox IDE
              </TabsTrigger>
            </TabsList>

            <span className="text-[11px] text-zinc-500 hidden sm:flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              Runtime engine derived from Papermorph (MIT License)
            </span>
          </div>

          <TabsContent value="player" className="flex-1 min-h-0 m-0 pt-1">
            {currentChapter && (
              <ShilpaPlayer
                bookId={activeBook.id}
                chapter={currentChapter}
                isSample={activeBook.isSample}
                scriptContent={scriptContent}
                onGenerateClick={() => handleOpenGenerator(currentChapter)}
              />
            )}
          </TabsContent>

          <TabsContent value="map" className="flex-1 min-h-0 m-0 pt-1 overflow-hidden">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 h-full overflow-y-auto">
              <ShilpaChapterMap
                sections={activeBook.sections}
                activeChapterFolder={currentChapter?.folder}
                onSelectChapter={(sec) => {
                  setActiveChapter(sec);
                  setActiveTab("player");
                }}
                onGenerateChapter={(sec) => handleOpenGenerator(sec)}
              />
            </div>
          </TabsContent>

          <TabsContent value="storyboard" className="flex-1 min-h-0 m-0 pt-1 overflow-hidden">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 h-full overflow-y-auto">
              <ShilpaStoryboardView storyboard={currentChapter?.storyboard} />
            </div>
          </TabsContent>

          <TabsContent value="sandbox" className="flex-1 min-h-0 m-0 pt-1">
            {currentChapter && (
              <ShilpaSandboxEditor
                book={activeBook}
                chapter={currentChapter}
                onPreviewLesson={() => setActiveTab("player")}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Generator Modal Dialog */}
      {targetChapter && (
        <ShilpaGeneratorDialog
          open={generatorOpen}
          onOpenChange={setGeneratorOpen}
          bookId={activeBook.id}
          bookTitle={activeBook.title}
          chapter={targetChapter}
          onSuccess={() => {
            // Re-fetch or refresh active chapter script
            getChapterContent(activeBook.id, targetChapter.folder).then((data) => {
              if (data?.scriptContent) setScriptContent(data.scriptContent);
            });
          }}
        />
      )}
    </div>
  );
}
