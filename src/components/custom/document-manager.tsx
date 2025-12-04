"use client";

import { useState } from "react";
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
import { FileText, Trash2, Upload } from "lucide-react";

// Sample document data for UI demonstration
const sampleDocuments = [
  { id: "1", name: "Project Proposal.pdf" },
  { id: "2", name: "Meeting Notes.docx" },
  { id: "3", name: "Budget Report.xlsx" },
  { id: "4", name: "Design Mockups.fig" },
  { id: "5", name: "Technical Specification.md" },
  { id: "6", name: "User Research.pdf" },
  { id: "7", name: "Marketing Plan.pptx" },
  { id: "8", name: "Contract Agreement.pdf" },
];

export default function DocumentManager() {
  const [documents] = useState(sampleDocuments);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const handleDeleteClick = (docId: string) => {
    setDocumentToDelete(docId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    // Delete functionality will be implemented later
    console.log("Deleting document:", documentToDelete);
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Manage Documents
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground">
              Document Manager
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
              Upload and manage your documents
            </DialogDescription>
          </DialogHeader>

          {/* Add Documents Button */}
          <div className="py-2">
            <Button
              variant="default"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
            >
              <Upload className="mr-2 h-4 w-4" />
              Add Documents
              <input
                type="file"
                multiple
                className="hidden"
                aria-label="Upload documents"
              />
            </Button>
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
                  <div className="space-y-1">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-md hover:bg-accent dark:hover:bg-accent/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground dark:text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium text-foreground dark:text-foreground truncate">
                            {doc.name}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteClick(doc.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 dark:text-destructive dark:hover:text-destructive dark:hover:bg-destructive/20"
                          aria-label={`Delete ${doc.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
