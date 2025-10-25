"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash, Upload } from "lucide-react";
import { processPDFDocuments } from "@/lib/embeddings";

export default function LibraryPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Mock data for demonstration
  const documents = [
    { id: 1, name: "Document 1", date: "2023-05-15" },
    { id: 2, name: "Research Paper", date: "2023-06-20" },
    { id: 3, name: "Project Proposal", date: "2023-07-10" },
  ];

    const [isDragActive, setIsDragActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(file => file.type === "application/pdf");
    
    if (pdfFiles.length > 0) {
      setIsProcessing(true);
      try {
        await processPDFDocuments(pdfFiles);
      } catch (error) {
        console.error("Error processing PDF files:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const pdfFiles = Array.from(files).filter(file => file.type === "application/pdf");
      
      if (pdfFiles.length > 0) {
        setIsProcessing(true);
        try {
          await processPDFDocuments(pdfFiles);
        } catch (error) {
          console.error("Error processing PDF files:", error);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Library Page</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add a document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div 
                className={`border-2 ${isDragActive ? 'border-primary bg-primary/5' : 'border-dashed border-gray-300'} rounded-lg p-8 text-center ${!isDragActive && !isProcessing ? 'cursor-pointer hover:bg-accent hover:border-gray-400' : ''} transition-colors`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={!isProcessing ? () => document.getElementById('file-upload')?.click() : undefined}
              >
                {isProcessing ? (
                  <div className="py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-lg font-medium">Processing documents...</p>
                    <p className="text-sm text-muted-foreground">This may take a few moments</p>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-1">Drag and drop your PDF files here</p>
                    <p className="text-sm text-muted-foreground mb-4">or</p>
                    <Button variant="outline" type="button">
                      <Upload className="mr-2 h-4 w-4" /> Browse files
                    </Button>
                    <p className="text-xs text-muted-foreground mt-3">Supports PDF files only</p>
                  </>
                )}
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  id="file-upload"
                  onChange={handleFileInput}
                  disabled={isProcessing}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => setIsDialogOpen(false)}
                disabled={isProcessing}
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document name</TableHead>
              <TableHead>Date uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell className="font-medium">{document.name}</TableCell>
                <TableCell>{document.date}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <Trash className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
