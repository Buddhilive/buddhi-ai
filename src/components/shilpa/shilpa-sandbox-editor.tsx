"use client";

import React, { useState, useEffect } from "react";
import {
  FileCode,
  Save,
  Play,
  Check,
  FolderTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ShilpaBook, ShilpaSection } from "@/types/shilpa";
import { useShilpaStore } from "@/stores/shilpa-store";
import { saveChapterContent, getChapterContent } from "@/lib/shilpa/storage";

interface ShilpaSandboxEditorProps {
  book: ShilpaBook;
  chapter: ShilpaSection;
  onPreviewLesson?: () => void;
}

export function ShilpaSandboxEditor({
  book,
  chapter,
  onPreviewLesson,
}: ShilpaSandboxEditorProps) {
  const { updateSection } = useShilpaStore();
  const [selectedFile, setSelectedFile] = useState<string>("script.js");
  const [code, setCode] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    async function loadCode() {
      const data = await getChapterContent(book.id, chapter.folder);
      const defaultScript =
        data?.scriptContent ||
        chapter.scriptContent ||
        `// Chapter ${chapter.chapterNumber}: ${chapter.title}\nconst CHAPTER = { number: ${chapter.chapterNumber}, title: '${chapter.title}', minutes: ${chapter.estimatedMinutes} };\nconst BEATS = [];\nboot();\n`;

      if (selectedFile === "script.js") {
        setCode(defaultScript);
      } else if (selectedFile === "timings.js") {
        setCode(JSON.stringify(chapter.timings || {}, null, 2));
      } else if (selectedFile === "sections.json") {
        setCode(JSON.stringify(book.sections, null, 2));
      }
    }

    loadCode();
  }, [book, chapter, selectedFile]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (selectedFile === "script.js") {
        await updateSection(book.id, chapter.folder, {
          scriptContent: code,
          status: "ready",
        });
        await saveChapterContent({
          bookId: book.id,
          folder: chapter.folder,
          section: {
            ...chapter,
            scriptContent: code,
            status: "ready",
          },
          scriptContent: code,
          updatedAt: Date.now(),
        });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error("[sandbox-editor] Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const files = [
    { id: "script.js", path: `${chapter.folder}/index.html (script)`, label: "Chapter Script" },
    { id: "timings.js", path: `${chapter.folder}/timings.js`, label: "Beat Timings" },
    { id: "sections.json", path: "sections.json", label: "Book Sections Map" },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-emerald-400" />
          <span className="font-mono text-zinc-400">/workspace/books/{book.id}/</span>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            POSIX VirtualFS
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {onPreviewLesson && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onPreviewLesson}
              className="h-7 text-xs px-2.5 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1.5"
            >
              <Play className="h-3 w-3 fill-current text-emerald-400" />
              Live Stage Preview
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 font-medium"
          >
            {savedSuccess ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* File Sidebar */}
        <div className="w-52 bg-zinc-900/50 border-r border-zinc-800 p-2 flex flex-col gap-1 shrink-0">
          <div className="text-[11px] font-semibold text-zinc-500 px-2 py-1 uppercase tracking-wider">
            Files
          </div>
          {files.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFile(f.id)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                selectedFile === f.id
                  ? "bg-emerald-500/10 text-emerald-300 font-medium"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              <FileCode className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{f.label}</span>
            </button>
          ))}
        </div>

        {/* Code Editor TextArea */}
        <div className="flex-1 flex flex-col bg-zinc-950 p-3 min-h-0">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full bg-zinc-950 text-emerald-300 font-mono text-xs p-3 rounded-lg border border-zinc-800/80 focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed selection:bg-emerald-950"
          />
        </div>
      </div>
    </div>
  );
}
