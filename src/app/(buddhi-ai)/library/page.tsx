"use client";

import React from "react";
import { PaperUploadZone } from "@/components/research/paper-upload-zone";
import { PaperLibrary } from "@/components/research/paper-library";

export default function LibraryPage() {
  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paper Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload, manage, and inspect your research paper collection.
        </p>
      </div>

      <PaperUploadZone />

      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-semibold tracking-tight">Your Papers</h2>
        <PaperLibrary />
      </div>
    </div>
  );
}
