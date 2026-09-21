"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Search,
  Trash2,
  BookOpen,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Database,
  Layers,
  UploadCloud,
  X,
} from "lucide-react";
import { usePaperLibrary } from "@/hooks/use-paper-library";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Paper } from "@/types/research";

const PAGE_SIZE = 10;

export function PaperLibrary() {
  const router = useRouter();
  const {
    papers,
    allPapersCount,
    isLoading,
    searchQuery,
    setSearchQuery,
    deletePaper,
  } = usePaperLibrary();

  const [currentPage, setCurrentPage] = useState(1);
  const [paperToDelete, setPaperToDelete] = useState<Paper | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(papers.length / PAGE_SIZE));

  // Ensure current page stays within valid bounds if papers change
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedPapers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return papers.slice(start, start + PAGE_SIZE);
  }, [papers, currentPage]);

  const confirmDelete = async () => {
    if (!paperToDelete) return;
    setIsDeleting(true);
    await deletePaper(paperToDelete.id);
    setIsDeleting(false);
    setPaperToDelete(null);
  };

  const renderPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
        <PaginationItem key={pageNum}>
          <PaginationLink
            isActive={currentPage === pageNum}
            onClick={() => setCurrentPage(pageNum)}
            className="cursor-pointer"
          >
            {pageNum}
          </PaginationLink>
        </PaginationItem>
      ));
    }

    const items: React.ReactNode[] = [];
    // Page 1
    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          isActive={currentPage === 1}
          onClick={() => setCurrentPage(1)}
          className="cursor-pointer"
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    if (currentPage > 3) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={currentPage === i}
            onClick={() => setCurrentPage(i)}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (currentPage < totalPages - 2) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Last page
    items.push(
      <PaginationItem key={totalPages}>
        <PaginationLink
          isActive={currentPage === totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className="cursor-pointer"
        >
          {totalPages}
        </PaginationLink>
      </PaginationItem>
    );

    return items;
  };

  return (
    <div className="space-y-4">
      {/* Search Header Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search papers by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
        <span className="text-xs text-muted-foreground self-start sm:self-center">
          Showing{" "}
          {papers.length === 0
            ? 0
            : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                currentPage * PAGE_SIZE,
                papers.length
              )}`}{" "}
          of {papers.length} documents
          {allPapersCount !== papers.length && ` (filtered from ${allPapersCount})`}
        </span>
      </div>

      {/* Table Container */}
      <div className="rounded-lg border border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[45%]">Document</TableHead>
              <TableHead className="w-[15%]">Status</TableHead>
              <TableHead className="w-[10%] text-center">Chunks</TableHead>
              <TableHead className="w-[15%]">Uploaded</TableHead>
              <TableHead className="w-[15%] text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx} className="hover:bg-transparent">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="h-4 w-4 rounded-xs shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Skeleton className="h-7 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : papers.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    {searchQuery ? (
                      <>
                        <Search className="h-7 w-7 text-muted-foreground/50" />
                        <p className="text-sm font-medium">No matching papers found</p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          No papers matched your search for &quot;{searchQuery}&quot;. Try adjusting your keywords or clearing the filter.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchQuery("")}
                          className="mt-2 text-xs"
                        >
                          Clear Search
                        </Button>
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm font-medium">No papers in library yet</p>
                        <p className="text-xs text-muted-foreground">
                          Upload PDF documents to parse text, build embeddings, and start researching.
                        </p>
                        <Button size="sm" asChild className="mt-3 gap-1.5">
                          <Link href="/add-doc">
                            <UploadCloud className="h-4 w-4" />
                            Add Document
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedPapers.map((paper) => (
                <TableRow
                  key={paper.id}
                  className="cursor-pointer transition-colors hover:bg-muted/40 group"
                  onClick={() => router.push(`/reader/${paper.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-start gap-2.5">
                      <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {paper.metadata.title || paper.fileName}
                        </div>
                        {paper.metadata.authors && paper.metadata.authors.length > 0 && (
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {paper.metadata.authors.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        paper.embeddingStatus === "completed"
                          ? "default"
                          : paper.embeddingStatus === "embedding"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px] capitalize font-medium"
                    >
                      {paper.embeddingStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {paper.totalChunks}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(paper.uploadedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => router.push(`/reader/${paper.id}`)}
                      >
                        <span className="hidden sm:inline">Open</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setPaperToDelete(paper)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={
                    currentPage <= 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
              {renderPageNumbers()}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={
                    currentPage >= totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(paperToDelete)}
        onOpenChange={(open) => !open && setPaperToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>Delete Paper & Vector Data?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2 pt-1 text-left">
              <span>
                Are you sure you want to permanently delete{" "}
                <strong className="text-foreground">
                  &quot;{paperToDelete?.metadata.title || paperToDelete?.fileName}&quot;
                </strong>
                ?
              </span>
              <div className="rounded-md border border-border/60 bg-muted/30 p-2.5 space-y-1.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>{paperToDelete?.totalChunks ?? 0} text chunks in IndexedDB</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-primary" />
                  <span>All corresponding embedding vectors in PGlite (pgvector)</span>
                </div>
              </div>
              <span className="block text-[11px] text-muted-foreground/80">
                This action cannot be undone. All indexed embeddings will be completely cleared.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                "Delete Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
