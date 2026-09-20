"use client";

import React from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { PaperUploadZone } from "@/components/research/paper-upload-zone";
import { IngestionPipelineCard } from "@/components/research/ingestion-pipeline-card";
import { Button } from "@/components/ui/button";

export default function AddDocPage() {
  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload PDF research papers to extract text, create hierarchical chunks, and build local vector embeddings.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-2 self-start sm:self-auto">
          <Link href="/library">
            <BookOpen className="h-4 w-4" />
            View Library
          </Link>
        </Button>
      </div>

      <PaperUploadZone />

      <IngestionPipelineCard />
    </div>
  );
}
