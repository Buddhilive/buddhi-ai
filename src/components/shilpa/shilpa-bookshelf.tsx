"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  BookOpen,
  Layers,
  ArrowRight,
  Trash2,
  FileText,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  extractPdfOutlineAndChapters,
  slugify,
} from "@/lib/shilpa/pdf-extractor";
import {
  saveShilpaBook,
  deleteShilpaBook,
  cacheBookPdf,
} from "@/lib/shilpa/storage";
import { useShilpaStore } from "@/stores/shilpa-store";
import type { ShilpaBook } from "@/types/shilpa";

// Built-in Demo Book
const DEMO_BOOK: ShilpaBook = {
  id: "elementary-algebra",
  title: "Elementary Algebra",
  author: "OpenStax / Papermorph",
  pageCount: 68,
  createdAt: Date.now() - 86400000,
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

export function ShilpaBookshelf() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { books, loadBooks } = useShilpaStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  React.useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a PDF document.");
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStatus("Reading PDF file in browser...");

      const arrayBuffer = await file.arrayBuffer();
      setProcessingStatus("Extracting bookmarks and table of contents...");

      const outlineResult = await extractPdfOutlineAndChapters(
        arrayBuffer,
        file.name
      );

      const bookSlug = slugify(outlineResult.title) || `book-${Date.now()}`;

      const newBook: ShilpaBook = {
        id: bookSlug,
        title: outlineResult.title,
        fileName: file.name,
        fileSize: file.size,
        pageCount: outlineResult.pageCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "mapped",
        language: "en",
        coverPalette: ["#18181b", "#10b981", "#3b82f6"],
        sections: outlineResult.sections,
      };

      setProcessingStatus("Saving book project to IndexedDB...");
      await saveShilpaBook(newBook);
      await cacheBookPdf(bookSlug, arrayBuffer);
      await loadBooks();

      router.push(`/shilpa/${bookSlug}`);
    } catch (err) {
      console.error("[shilpa-bookshelf] Error parsing PDF:", err);
      alert("Failed to parse PDF. Please check the console for details.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleDeleteBook = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (confirm("Delete this book project from your browser storage?")) {
      await deleteShilpaBook(bookId);
      await loadBooks();
    }
  };

  const allBooks = [
    DEMO_BOOK,
    ...books.filter((b) => b.id !== "elementary-algebra"),
  ];

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Shilpa Studio
            </h1>
            <Badge variant="outline" className="text-[11px] text-emerald-400 border-emerald-500/30 bg-emerald-500/5">
              Browser-Native
            </Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Turn static PDF books into animated, interactive web books with synchronized narration and quick practice checks—running 100% in your browser.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-2 shadow-lg shadow-emerald-950"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            Upload PDF Book
          </Button>
        </div>
      </div>

      {/* Drag & Drop Hero Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFileUpload(file);
        }}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
          isDragging
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60"
        }`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
            <p className="text-sm font-medium text-zinc-200">{processingStatus}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400">
              <UploadCloud className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                Drop your PDF book here, or click to browse
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                PDF bookmarks are automatically extracted into chapters with zero server uploads
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bookshelf Grid */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-emerald-400" />
          Interactive Bookshelf
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allBooks.map((book) => {
            const isSample = Boolean(book.isSample);
            const readyCount = book.sections.filter((s) => s.status === "ready").length;

            return (
              <Card
                key={book.id}
                onClick={() => router.push(`/shilpa/${book.id}`)}
                className="group relative bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-all cursor-pointer overflow-hidden shadow-sm"
              >
                <div
                  className="h-2 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${book.coverPalette.join(", ")})`,
                  }}
                />
                <CardContent className="p-5 flex flex-col justify-between h-[210px]">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={
                          isSample
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px]"
                            : "bg-zinc-800 border-zinc-700 text-zinc-300 text-[10px]"
                        }
                      >
                        {isSample ? "Bundled Demo" : "Uploaded PDF"}
                      </Badge>

                      {!isSample && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => handleDeleteBook(e, book.id)}
                          className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          title="Delete Project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-zinc-100 group-hover:text-emerald-300 transition-colors line-clamp-1">
                      {book.title}
                    </h3>
                    <p className="text-xs text-zinc-500 line-clamp-1">
                      {book.author || "Document"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 pt-3 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-zinc-500" />
                        {book.sections.length} Chapters
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle className="h-3 w-3" />
                        {readyCount} Ready
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-medium text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                      <span>Open Studio</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
