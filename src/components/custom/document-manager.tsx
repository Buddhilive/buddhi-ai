"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Trash2,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { DocumentItem, WorkerMessage } from "@/types/document-types";
import { processDocument } from "@/lib/text-embeddings";
import {
  deleteDocumentEmbeddings,
  getDocumentList,
} from "@/lib/llamaindex-provider";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface DocumentManagerProps {
  chatId?: string;
}

export default function DocumentManager({ chatId }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if any document is processing
  const isProcessing = documents.some(
    (doc) => doc.status !== "ready" && doc.status !== "error"
  );

  // Load existing documents when dialog opens
  useEffect(() => {
    if (isDialogOpen && chatId) {
      loadDocuments();
    }
  }, [isDialogOpen, chatId]);

  const loadDocuments = async () => {
    if (!chatId) return;

    try {
      const docList = await getDocumentList(chatId);
      const loadedDocs: DocumentItem[] = docList.map((doc) => ({
        id: doc.documentId,
        fileName: doc.fileName,
        status: "ready",
        progress: 100,
      }));
      setDocuments(loadedDocs);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents");
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!chatId) {
      toast.error("No active chat session. Please start a chat first.");
      return;
    }

    // Validate file types
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension === "pdf" || extension === "txt") {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      toast.error(
        `Invalid file types: ${invalidFiles.join(
          ", "
        )}. Only PDF and TXT files are supported.`
      );
    }

    if (validFiles.length === 0) return;

    // Process each file
    for (const file of validFiles) {
      const documentId = `doc_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Add document to list with uploading status
      const newDoc: DocumentItem = {
        id: documentId,
        fileName: file.name,
        status: "uploading",
        progress: 0,
        fileSize: file.size,
      };

      setDocuments((prev) => [...prev, newDoc]);

      try {
        await processDocument(
          file,
          chatId,
          documentId,
          (message: WorkerMessage) => {
            handleWorkerMessage(documentId, message);
          }
        );

        // Mark as ready
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === documentId
              ? { ...doc, status: "ready", progress: 100 }
              : doc
          )
        );

        toast.success(`Successfully processed ${file.name}`);
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === documentId
              ? {
                  ...doc,
                  status: "error",
                  error:
                    error instanceof Error
                      ? error.message
                      : "Processing failed",
                }
              : doc
          )
        );
        toast.error(`Failed to process ${file.name}`);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleWorkerMessage = (documentId: string, message: WorkerMessage) => {
    if (message.type === "progress" && message.progress) {
      const { stage, progress, total } = message.progress;

      let status: DocumentItem["status"] = "uploading";
      let progressPercent = 0;

      switch (stage) {
        case "reading":
          status = "uploading";
          progressPercent = (progress / total) * 25;
          break;
        case "chunking":
          status = "chunking";
          progressPercent = 25 + (progress / total) * 25;
          break;
        case "embedding":
          status = "embedding";
          progressPercent = 50 + (progress / total) * 40;
          break;
        case "saving":
          status = "saving";
          progressPercent = 90 + (progress / total) * 10;
          break;
      }

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === documentId
            ? { ...doc, status, progress: Math.round(progressPercent) }
            : doc
        )
      );
    }
  };

  const handleDeleteClick = (docId: string) => {
    setDocumentToDelete(docId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    try {
      await deleteDocumentEmbeddings(documentToDelete);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentToDelete));
      toast.success("Document deleted successfully");
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    // Prevent closing if processing
    if (!open && isProcessing) {
      toast.warning("Please wait for document processing to complete");
      return;
    }
    setIsDialogOpen(open);
  };

  const getStatusIcon = (status: DocumentItem["status"]) => {
    switch (status) {
      case "ready":
        return (
          <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
        );
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
  };

  const getStatusText = (doc: DocumentItem) => {
    switch (doc.status) {
      case "uploading":
        return "Reading file...";
      case "chunking":
        return "Chunking text...";
      case "embedding":
        return "Generating embeddings...";
      case "saving":
        return "Saving to database...";
      case "ready":
        return "Ready";
      case "error":
        return doc.error || "Error";
    }
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" className="relative">
            <FileText className="mr-2 h-4 w-4" />
            Manage Documents
            {documents.filter((d) => d.status === "ready").length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 min-w-5 px-1 text-xs bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
              >
                {documents.filter((d) => d.status === "ready").length}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground">
              Document Manager
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
              Upload and manage your documents (PDF, TXT)
            </DialogDescription>
          </DialogHeader>

          {/* Add Documents Button */}
          <div className="py-2">
            <Button
              variant="default"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
              onClick={() => fileInputRef.current?.click()}
              disabled={!chatId}
            >
              <Upload className="mr-2 h-4 w-4" />
              Add Documents
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt"
              className="hidden"
              onChange={handleFileSelect}
              aria-label="Upload documents"
            />
            {!chatId && (
              <p className="mt-2 text-xs text-muted-foreground text-center">
                Start a chat to upload documents
              </p>
            )}
          </div>

          {/* Document List */}
          <div className="border rounded-md bg-background dark:bg-background/50 border-border dark:border-border">
            <ScrollArea className="h-[300px] w-full">
              <div className="p-2">
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground dark:text-muted-foreground">
                    <FileText className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-sm">No documents uploaded</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col p-3 rounded-md hover:bg-accent dark:hover:bg-accent/50 transition-colors border border-transparent hover:border-border dark:hover:border-border"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getStatusIcon(doc.status)}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground dark:text-foreground truncate block">
                                {doc.fileName}
                              </span>
                              <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                                {getStatusText(doc)}
                              </span>
                            </div>
                          </div>
                          {doc.status === "ready" && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteClick(doc.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 dark:text-destructive dark:hover:text-destructive dark:hover:bg-destructive/20"
                              aria-label={`Delete ${doc.fileName}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {doc.status !== "ready" && doc.status !== "error" && (
                          <Progress value={doc.progress} className="mt-2 h-1" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground">
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
              Are you sure you want to delete this document? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              className="bg-background dark:bg-input/30 border-border dark:border-input hover:bg-accent dark:hover:bg-input/50"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive/60"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
