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
  GitFork,
  X,
  Check,
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
  paperIds?: string[];
  paperTitles?: string[];
}

interface ChatModeSelectionProps {
  onSelectMode: (payload: SelectedModePayload) => void;
}

export function ChatModeSelection({ onSelectMode }: ChatModeSelectionProps) {
  const [step, setStep] = useState<"choose-mode" | "select-paper" | "select-gap-papers">("choose-mode");

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

  if (step === "select-gap-papers") {
    return (
      <GapAnalysisPaperSelectorStep
        onBack={() => setStep("choose-mode")}
        onConfirmSelection={(selectedPapers) =>
          onSelectMode({
            mode: "gap-analysis",
            paperIds: selectedPapers.map((p) => p.id),
            paperTitles: selectedPapers.map((p) => p.metadata.title || p.fileName),
          })
        }
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-5xl mx-auto w-full min-h-[calc(100vh-64px)]">
      <div className="text-center space-y-3 mb-10 max-w-lg">
        <div className="inline-flex items-center justify-center p-2 rounded-full bg-primary/10 text-primary mb-2">
          <Sparkles className="size-5" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Start a New Chat
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Choose how your AI assistant should ground its research. You can query your entire collection, focus deeply on a single study, or perform cross-paper gap analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {/* Mode 1: Chat with Library */}
        <Card
          onClick={() => onSelectMode({ mode: "library" })}
          className="group relative cursor-pointer border border-border/60 hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden bg-card/60 backdrop-blur flex flex-col justify-between"
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
          className="group relative cursor-pointer border border-border/60 hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden bg-card/60 backdrop-blur flex flex-col justify-between"
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

        {/* Mode 3: Gap Analysis */}
        <Card
          onClick={() => setStep("select-gap-papers")}
          className="group relative cursor-pointer border border-border/60 hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden bg-card/60 backdrop-blur flex flex-col justify-between"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <GitFork className="size-5" />
              </div>
              <Badge variant="secondary" className="text-[11px] font-medium tracking-wide bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40">
                Multi-Paper
              </Badge>
            </div>
            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
              Gap Analysis
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              Select multiple papers to identify research gaps, compare methodologies, and formulate a clear Research Question and testable Hypothesis.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center text-xs font-medium text-primary gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Select papers & start</span>
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

function GapAnalysisPaperSelectorStep({
  onBack,
  onConfirmSelection,
}: {
  onBack: () => void;
  onConfirmSelection: (papers: Paper[]) => void;
}) {
  const { papers, allPapersCount, isLoading, searchQuery, setSearchQuery } = usePaperLibrary();
  const [selectedPapers, setSelectedPapers] = useState<Paper[]>([]);

  const isSelected = (paperId: string) => selectedPapers.some((p) => p.id === paperId);

  const togglePaper = (paper: Paper) => {
    setSelectedPapers((prev) =>
      prev.some((p) => p.id === paper.id)
        ? prev.filter((p) => p.id !== paper.id)
        : [...prev, paper]
    );
  };

  const removePaper = (paperId: string) => {
    setSelectedPapers((prev) => prev.filter((p) => p.id !== paperId));
  };

  const clearAll = () => {
    setSelectedPapers([]);
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full min-h-[calc(100vh-64px)]">
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Modes
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40">
            <GitFork className="size-3 mr-1" />
            Gap Analysis Setup
          </Badge>
        </div>
      </div>

      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Select Papers for Gap Analysis
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose 2 or more related research papers to synthesize contradictions, identify unaddressed gaps, and formulate your hypothesis.
        </p>
      </div>

      {/* Dual Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* Left Pane: Library Papers with Search (Col 7) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Library className="size-4 text-primary" />
              Library Papers
              <span className="text-xs font-normal text-muted-foreground">
                ({allPapersCount})
              </span>
            </h3>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library by title or author..."
              className="pl-9 h-10 text-sm bg-background/80"
              autoFocus
            />
          </div>

          {/* Scrollable Library List */}
          <div className="overflow-y-auto space-y-2.5 pr-1 max-h-[55vh]">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-xl space-y-2 bg-card/40">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : allPapersCount === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center border border-dashed rounded-xl bg-muted/20">
                <BookOpen className="size-10 text-muted-foreground/50 mb-3" />
                <h4 className="font-semibold text-sm mb-1">Your library is empty</h4>
                <p className="text-xs text-muted-foreground max-w-sm mb-4">
                  Add papers to your library before performing gap analysis.
                </p>
                <Button asChild size="sm" className="gap-2">
                  <Link href="/add-doc">
                    <Plus className="size-4" />
                    Add Document
                  </Link>
                </Button>
              </div>
            ) : papers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center border border-dashed rounded-xl bg-muted/20">
                <Search className="size-8 text-muted-foreground/50 mb-2" />
                <h4 className="font-medium text-sm mb-1">No matching papers</h4>
                <p className="text-xs text-muted-foreground">
                  Try searching with different keywords.
                </p>
              </div>
            ) : (
              papers.map((paper) => {
                const title = paper.metadata.title || paper.fileName;
                const authors = paper.metadata.authors.length > 0 ? paper.metadata.authors.join(", ") : "Unknown Authors";
                const year = paper.metadata.year;
                const checked = isSelected(paper.id);

                return (
                  <div
                    key={paper.id}
                    onClick={() => togglePaper(paper)}
                    className={`group flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                      checked
                        ? "border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-950/20"
                        : "border-border/70 hover:border-primary/50 hover:bg-muted/30 bg-card/70"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm font-medium line-clamp-1 transition-colors ${
                          checked ? "text-emerald-700 dark:text-emerald-300 font-semibold" : "text-foreground group-hover:text-primary"
                        }`}>
                          {title}
                        </h4>
                        {paper.embeddingStatus === "completed" && (
                          <Badge variant="secondary" className="text-[9px] h-3.5 px-1 gap-0.5 font-normal bg-green-500/10 text-green-700 dark:text-green-400">
                            <CheckCircle2 className="size-2.5" /> Indexed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
                        <span className="truncate max-w-xs">{authors}</span>
                        {year && (
                          <span className="inline-flex items-center gap-1 shrink-0">
                            <Calendar className="size-3" /> {year}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 shrink-0">
                          <Layers className="size-3" /> {paper.pageCount} pgs
                        </span>
                      </div>
                    </div>

                    <Button
                      variant={checked ? "secondary" : "outline"}
                      size="sm"
                      className={`shrink-0 text-xs gap-1 h-8 px-2.5 ${
                        checked
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30"
                          : "group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePaper(paper);
                      }}
                    >
                      {checked ? (
                        <>
                          <Check className="size-3" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <>
                          <Plus className="size-3" />
                          <span>Select</span>
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Selected Papers for Gap Analysis (Col 5) */}
        <div className="lg:col-span-5 flex flex-col p-5 rounded-2xl border border-border/80 bg-card/50 backdrop-blur shadow-sm space-y-4 sticky top-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Selected Papers
              </h3>
              <Badge variant="secondary" className={`text-xs px-2 py-0.5 ${
                selectedPapers.length > 0
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold"
                  : ""
              }`}>
                {selectedPapers.length}
              </Badge>
            </div>
            {selectedPapers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Selected List */}
          <div className="overflow-y-auto space-y-2.5 max-h-[42vh] min-h-[160px] pr-1">
            {selectedPapers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center border border-dashed rounded-xl p-4 bg-muted/10">
                <GitFork className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-medium text-foreground">No papers selected yet</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mt-1">
                  Select at least 1 paper from the library to start gap analysis.
                </p>
              </div>
            ) : (
              selectedPapers.map((paper, index) => {
                const title = paper.metadata.title || paper.fileName;
                const year = paper.metadata.year;

                return (
                  <div
                    key={paper.id}
                    className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-border/60 bg-background/80 hover:bg-background transition-colors text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground size-4 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <h5 className="font-medium text-foreground truncate" title={title}>
                          {title}
                        </h5>
                      </div>
                      <p className="text-[11px] text-muted-foreground pl-5.5">
                        {year ? `${year} · ` : ""}{paper.metadata.authors[0] || "Unknown author"}
                        {paper.metadata.authors.length > 1 ? ` et al.` : ""}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removePaper(paper.id)}
                      title="Remove from selection"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action & Prerequisite Hint */}
          <div className="pt-2 border-t space-y-2">
            <Button
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              size="default"
              disabled={selectedPapers.length === 0}
              onClick={() => onConfirmSelection(selectedPapers)}
            >
              <GitFork className="size-4" />
              <span>Start Gap Analysis Chat</span>
            </Button>

            <p className="text-[11px] text-center text-muted-foreground">
              {selectedPapers.length === 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Select at least 1 paper to continue
                </span>
              ) : selectedPapers.length === 1 ? (
                <span>Tip: Select 2 or more papers for optimal comparative analysis</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Ready to analyze {selectedPapers.length} papers
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
