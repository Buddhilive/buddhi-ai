"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Library,
  FileText,
  Sparkles,
  ArrowLeft,
  Search,
  BookOpen,
  Plus,
  Calendar,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { usePaperLibrary } from "@/hooks/use-paper-library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Paper } from "@/types/research";
import type { ChatMode } from "@/types/chat";

export interface SelectedModePayload {
  mode: ChatMode;
  paperId?: string;
  paperTitle?: string;
}

interface ChatModeSelectionProps {
  onSelectMode: (payload: SelectedModePayload) => void;
}

export function ChatModeSelection({ onSelectMode }: ChatModeSelectionProps) {
  const [step, setStep] = useState<"choose-mode" | "select-paper">("choose-mode");

  if (step === "select-paper") {
    return (
      <PaperSelectorStep
        onBack={() => setStep("choose-mode")}
        onSelectPaper={(paper) =>
          onSelectMode({
            mode: "paper",
            paperId: paper.id,
            paperTitle: paper.metadata.title || paper.fileName,
          })
        }
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-4xl mx-auto w-full min-h-[calc(100vh-64px)]">
      <div className="text-center space-y-3 mb-10 max-w-lg">
        <div className="inline-flex items-center justify-center p-2 rounded-full bg-primary/10 text-primary mb-2">
          <Sparkles className="size-5" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Start a New Chat
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Choose how your AI assistant should ground its research. You can query your entire collection or focus deeply on a single study.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Mode 1: Chat with Library */}
        <Card
          onClick={() => onSelectMode({ mode: "library" })}
          className="group relative cursor-pointer border border-border/60 hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden bg-card/60 backdrop-blur"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="size-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Library className="size-5" />
              </div>
              <Badge variant="secondary" className="text-[11px] font-medium tracking-wide">
                All Documents
              </Badge>
            </div>
            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
              Chat with Library
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              Ask questions across all documents in your research library. Enables broad synthesis and multi-paper comparative reasoning.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center text-xs font-medium text-primary gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Start library chat</span>
              <span>&rarr;</span>
            </div>
          </CardContent>
        </Card>

        {/* Mode 2: Chat with a Paper */}
        <Card
          onClick={() => setStep("select-paper")}
          className="group relative cursor-pointer border border-border/60 hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden bg-card/60 backdrop-blur"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="size-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="size-5" />
              </div>
              <Badge variant="secondary" className="text-[11px] font-medium tracking-wide">
                Single Paper
              </Badge>
            </div>
            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
              Chat with a Paper
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              Choose an individual study from your library. The AI assistant grounds its answers and citations strictly to that selected paper.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center text-xs font-medium text-primary gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Choose a paper</span>
              <span>&rarr;</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PaperSelectorStep({
  onBack,
  onSelectPaper,
}: {
  onBack: () => void;
  onSelectPaper: (paper: Paper) => void;
}) {
  const { papers, allPapersCount, isLoading, searchQuery, setSearchQuery } = usePaperLibrary();

  return (
    <div className="flex-1 flex flex-col p-6 md:p-10 max-w-4xl mx-auto w-full min-h-[calc(100vh-64px)]">
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Modes
        </Button>
        <span className="text-xs text-muted-foreground">
          {allPapersCount} {allPapersCount === 1 ? "paper" : "papers"} in library
        </span>
      </div>

      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Select a Research Paper
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose which paper to ground this conversation to. Answers and citations will be restricted to this document.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by paper title or author..."
          className="pl-9 h-10 text-sm bg-background/80"
          autoFocus
        />
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[60vh]">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 border rounded-xl space-y-2 bg-card/40">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : allPapersCount === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-muted/20">
            <BookOpen className="size-10 text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold text-base mb-1">Your library is empty</h3>
            <p className="text-xs text-muted-foreground max-w-sm mb-4">
              You haven&apos;t added any research papers yet. Upload a document to start chatting with it.
            </p>
            <Button asChild size="sm" className="gap-2">
              <Link href="/add-doc">
                <Plus className="size-4" />
                Add Document
              </Link>
            </Button>
          </div>
        ) : papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-muted/20">
            <Search className="size-8 text-muted-foreground/50 mb-2" />
            <h3 className="font-medium text-sm mb-1">No matching papers found</h3>
            <p className="text-xs text-muted-foreground">
              Try searching with different keywords or clear the search query.
            </p>
          </div>
        ) : (
          papers.map((paper) => {
            const title = paper.metadata.title || paper.fileName;
            const authors = paper.metadata.authors.length > 0 ? paper.metadata.authors.join(", ") : "Unknown Authors";
            const year = paper.metadata.year;

            return (
              <div
                key={paper.id}
                onClick={() => onSelectPaper(paper)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-all duration-150 bg-card/70"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {title}
                    </h4>
                    {paper.embeddingStatus === "completed" ? (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-1 font-normal bg-green-500/10 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="size-2.5" /> Indexed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal capitalize">
                        {paper.embeddingStatus}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="truncate max-w-xs">{authors}</span>
                    {year && (
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <Calendar className="size-3" /> {year}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <Layers className="size-3" /> {paper.pageCount} {paper.pageCount === 1 ? "pg" : "pgs"}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs gap-1 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
                >
                  <Sparkles className="size-3" />
                  Select
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
