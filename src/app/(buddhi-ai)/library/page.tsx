"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PaperLibrary } from "@/components/research/paper-library";
import { Button } from "@/components/ui/button";

export default function LibraryPage() {
  return (
    <div className="flex-1 w-full min-w-0 space-y-8 p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paper Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage, search, and inspect your research paper collection.
          </p>
        </div>
        <Button asChild size="sm" className="gap-2 self-start sm:self-auto">
          <Link href="/add-doc">
            <Plus className="h-4 w-4" />
            Add Document
          </Link>
        </Button>
      </div>

      <PaperLibrary />
    </div>
  );
}
