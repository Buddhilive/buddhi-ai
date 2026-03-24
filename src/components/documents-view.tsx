"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { documentsApi, DocumentInfo } from "@/lib/documents";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  DatabaseIcon,
  FileTextIcon,
  RefreshCcwIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DocumentInfo["status"] }) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-600 text-white shrink-0 gap-1">
          <CheckCircleIcon className="h-3 w-3" />
          Ready
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary" className="animate-pulse shrink-0">
          Processing
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="animate-pulse shrink-0">
          Queued
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="shrink-0">
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline" className="shrink-0">Unknown</Badge>;
  }
}

// ─── Step description text ────────────────────────────────────────────────────

function stepText(doc: DocumentInfo): string {
  switch (doc.status) {
    case "pending":
      return "Queued for processing…";
    case "processing":
      return "Chunking & generating embeddings…";
    case "completed":
      return `Ready — ${doc.chunk_count ?? 0} chunk${doc.chunk_count === 1 ? "" : "s"} indexed`;
    case "failed":
      return doc.error_msg ? `Failed: ${doc.error_msg}` : "Processing failed";
    default:
      return "";
  }
}

// ─── Active upload row (with SSE) ────────────────────────────────────────────

interface UploadRowProps {
  doc: DocumentInfo;
  onUpdate: (doc: DocumentInfo) => void;
}

function UploadRow({ doc, onUpdate }: UploadRowProps) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; });

  // Open SSE stream for in-progress docs
  useEffect(() => {
    if (doc.status !== "pending" && doc.status !== "processing") return;

    const sse = new EventSource(documentsApi.getProgress(doc.id));

    sse.onmessage = (e) => {
      try {
        const data: DocumentInfo = JSON.parse(e.data);
        onUpdateRef.current(data);
        if (data.status === "completed" || data.status === "failed") {
          sse.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    sse.onerror = () => {
      sse.close();
      // Try one final REST fetch to pick up terminal state
      documentsApi.getDocument(doc.id).then(onUpdateRef.current).catch(() => { });
    };

    return () => sse.close();
  }, [doc.id, doc.status]);

  const isActive = doc.status === "pending" || doc.status === "processing";

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${isActive ? "bg-muted/40" : ""
        }`}
    >
      <FileTextIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{doc.original_name}</span>
          <StatusBadge status={doc.status} />
        </div>
        <p className={`text-xs ${doc.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
          {stepText(doc)}
        </p>
        {isActive && <Progress value={doc.status === "processing" ? 60 : 20} className="h-1" />}
      </div>
    </div>
  );
}

// ─── Upload tab ───────────────────────────────────────────────────────────────

interface UploadTabProps {
  onDocumentReady: (doc: DocumentInfo) => void;
}

function UploadTab({ onDocumentReady }: UploadTabProps) {
  const [uploads, setUploads] = useState<DocumentInfo[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpdate = useCallback((updated: DocumentInfo) => {
    setUploads((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d))
    );
    if (updated.status === "completed") {
      onDocumentReady(updated);
    }
  }, [onDocumentReady]);

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    setIsUploading(true);

    for (const file of files) {
      try {
        const doc = await documentsApi.uploadDocument(file);
        setUploads((prev) => [doc, ...prev]);
        toast.success(`"${file.name}" uploaded — processing started`);
      } catch (err: unknown) {
        toast.error((err as Error).message || `Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    uploadFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${isDragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
          }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <UploadCloudIcon className="h-10 w-10 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">
            {isDragOver ? "Drop files here" : "Drag & drop files or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, TXT, MD — up to 50 MB each
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.pdf"
          multiple
          className="sr-only"
          onChange={handleFileChange}
        />
      </label>

      <Button
        className="w-full"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <RefreshCcwIcon className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UploadCloudIcon className="mr-2 h-4 w-4" />
        )}
        {isUploading ? "Uploading…" : "Upload Files"}
      </Button>

      {/* Active uploads */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">This session</h3>
          <div className="space-y-2">
            {uploads.map((doc) => (
              <UploadRow key={doc.id} doc={doc} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Knowledge base tab ───────────────────────────────────────────────────────

function KnowledgeBaseTab() {
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setBackendError(null);
      const data = await documentsApi.listDocuments();
      setDocs(data);
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to load documents";
      setBackendError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await documentsApi.deleteDocument(deleteTarget.id);
      setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      toast.success(`"${deleteTarget.original_name}" removed from knowledge base`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {docs.length} document{docs.length !== 1 ? "s" : ""} in knowledge base
        </p>
        <Button variant="outline" size="sm" onClick={fetchDocs} disabled={loading}>
          <RefreshCcwIcon className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {backendError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircleIcon className="h-4 w-4 shrink-0" />
          <span>Backend unavailable: {backendError}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/20 py-16 text-center">
          <DatabaseIcon className="h-10 w-10 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">No documents yet</p>
            <p className="text-xs text-muted-foreground">
              Upload files in the Upload tab to populate the knowledge base.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Chunks</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="max-w-[240px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">{doc.original_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={doc.status} />
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {doc.chunk_count ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(doc)}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove document?</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              <span className="font-medium">{deleteTarget?.original_name}</span> and all its indexed
              chunks from the knowledge base. The original file on disk is kept for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <RefreshCcwIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2Icon className="mr-2 h-4 w-4" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Root view ────────────────────────────────────────────────────────────────

export function DocumentsView() {
  const handleDocumentReady = useCallback((doc: DocumentInfo) => {
    toast.success(`"${doc.original_name}" is ready — ${doc.chunk_count} chunks indexed`);
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Upload documents for RAG retrieval and manage the knowledge base.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <UploadTab onDocumentReady={handleDocumentReady} />
        </TabsContent>

        <TabsContent value="knowledge-base" className="mt-6">
          <KnowledgeBaseTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
