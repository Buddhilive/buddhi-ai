"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Trash2,
  BookOpen,
  ArrowRight,
  Clock,
  Hash,
  AlertTriangle,
  Loader2,
  Database,
  Layers,
} from "lucide-react";
import { usePaperLibrary } from "@/hooks/use-paper-library";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function PaperLibrary() {
  const router = useRouter();
  const { papers, allPapersCount, isLoading, searchQuery, setSearchQuery, deletePaper } =
    usePaperLibrary();

  const [paperToDelete, setPaperToDelete] = useState<Paper | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!paperToDelete) return;
    setIsDeleting(true);
    await deletePaper(paperToDelete.id);
    setIsDeleting(false);
    setPaperToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <span className="text-xs text-muted-foreground self-end sm:self-center">
          Showing {papers.length} of {allPapersCount} documents
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse opacity-60">
              <CardHeader>
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : papers.length === 0 ? (
        <Card className="border-dashed p-10 text-center bg-transparent">
          <div className="flex flex-col items-center justify-center gap-2">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No matching papers found</p>
            <p className="text-xs text-muted-foreground">
              {searchQuery
                ? "Try a different search term or clear the filter."
                : "Upload a PDF above to begin building your research library."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {papers.map((paper) => (
            <Card
              key={paper.id}
              className="hover:border-primary/50 transition-all flex flex-col justify-between group relative"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={
                        paper.embeddingStatus === "completed"
                          ? "default"
                          : paper.embeddingStatus === "embedding"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px] capitalize"
                    >
                      {paper.embeddingStatus}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaperToDelete(paper);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <CardTitle
                  className="text-base line-clamp-2 mt-2 group-hover:text-primary transition-colors cursor-pointer"
                  onClick={() => router.push(`/reader/${paper.id}`)}
                >
                  {paper.metadata.title || paper.fileName}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-1">
                  {paper.metadata.authors.join(", ")}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 text-xs text-muted-foreground space-y-3">
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {paper.totalChunks} chunks
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(paper.uploadedAt).toLocaleDateString()}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs group-hover:bg-primary/10 group-hover:text-primary"
                  onClick={() => router.push(`/reader/${paper.id}`)}
                >
                  Open in Reader
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation alert dialog */}
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
