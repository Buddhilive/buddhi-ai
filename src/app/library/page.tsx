import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash } from "lucide-react";

export default function LibraryPage() {
  // Mock data for demonstration
  const documents = [
    { id: 1, name: "Document 1", date: "2023-05-15" },
    { id: 2, name: "Research Paper", date: "2023-06-20" },
    { id: 3, name: "Project Proposal", date: "2023-07-10" },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Library Page</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add a document
        </Button>
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
