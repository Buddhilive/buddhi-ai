"use client";

import React, { use } from "react";
import { ShilpaStudio } from "@/components/shilpa/shilpa-studio";

export default function ShilpaStudioPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const resolvedParams = use(params);
  const bookId = resolvedParams.bookId;

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full">
      <ShilpaStudio bookId={bookId} />
    </div>
  );
}
