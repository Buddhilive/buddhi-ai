"use client";

import { useRef, useState, useEffect } from "react";
import { Loader2, Pen, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ForwardRefEditor } from "@/components/ForwardRefEditor";
import { type MDXEditorMethods } from "@mdxeditor/editor";
import { getWriter, isWriterAvailable } from "@/lib/writer";
import { type BAIWriterContentConfig } from "@/types/built-in-common";
import { toast } from "sonner";

export default function WriterPage() {
  const editorRef = useRef<MDXEditorMethods>(null);
  const [config, setConfig] = useState<BAIWriterContentConfig>({
    tone: "neutral",
    format: "markdown",
    length: "medium",
    sharedContext: "",
  });
  const [isWriting, setIsWriting] = useState(false);
  const [output, setOutput] = useState("");

  // Update editor content when output changes
  useEffect(() => {
    if (editorRef.current && output) {
      editorRef.current.setMarkdown(output);
    }
  }, [output]);

  const handleWrite = async () => {
    setIsWriting(true);

    try {
      const isAvailable = await isWriterAvailable();
      if (!isAvailable) {
        toast.error("AI Writer is not available");
        setIsWriting(false);
        return;
      }

      const writer = await getWriter({
        monitor(m) {
          m.addEventListener("downloadprogress", (e: any) => {
            console.log(
              "Language detector download progress:",
              `${e.loaded * 100}%`
            );
          });
        },
      });

      // Get current editor content as input context
      const currentContent = editorRef.current?.getMarkdown() || "";

      const content = await writer.write(currentContent);

      setOutput(content);
      setIsWriting(false);
    } catch (error) {
      console.error("Error with AI Writer:", error);
      toast.error("Error generating content with AI Writer");
      setIsWriting(false);
    }
  };

  const updateConfig = <K extends keyof BAIWriterContentConfig>(
    key: K,
    value: BAIWriterContentConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-76px)] bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-foreground">AI Writer</h1>
        </div>
        <Button onClick={handleWrite} className="flex items-center gap-2" disabled={isWriting}>
          {isWriting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Writing...
            </>
          ) : (
            <>
              <PenTool className="h-4 w-4" />
              Write
            </>
          )}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 writer-layout md:flex-row flex-col">
        {/* Editor Section - 70% on desktop, full width on mobile */}
        <div className="writer-editor flex-1 md:w-[70%] w-[70%] md:border-r border-border h-[calc(100vh-118px)] overflow-hidden">
          <div className="h-[calc(100vh-122px)] p-4 overflow-hidden">
            <div className="h-[calc(100vh-160px)] rounded-lg border border-border overflow-hidden bg-card">
              {
                <ForwardRefEditor
                  ref={editorRef}
                  placeholder="What's on your mind?"
                  markdown="# Start writing your content here..."
                  onChange={setOutput}
                  className="[&_.mdxeditor]:h-[calc(100vh-224px)] [&_.mdxeditor-editor]:h-[calc(100vh-224px)] [&_.mdxeditor-editor]:overflow-hidden"
                  contentEditableClassName="prose prose-neutral dark:prose-invert max-w-none p-4 h-[calc(100vh-224px)] overflow-y-auto focus:outline-none"
                />
              }
            </div>
          </div>
        </div>

        {/* Settings Section - 30% on desktop, full width on mobile */}
        <div className="writer-settings h-[calc(100vh-118px)] md:w-[30%] overflow-y-auto w-full bg-card md:max-h-none max-h-[300px]">
          <div className="p-4">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Writing Settings
                </h2>
              </div>

              {/* Shared Context Setting */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Context
                </label>
                <Textarea
                  placeholder="Provide additional context or instructions for the AI writer..."
                  value={config.sharedContext}
                  onChange={(e) =>
                    updateConfig("sharedContext", e.target.value)
                  }
                  className="min-h-[220px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Add any specific context, style guidelines, or requirements
                  for the AI to consider while writing.
                </p>
              </div>

              {/* Tone Setting */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Tone
                </label>
                <Select
                  value={config.tone}
                  onValueChange={(value: "formal" | "neutral" | "casual") =>
                    updateConfig("tone", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Format Setting */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Format
                </label>
                <Select
                  value={config.format}
                  onValueChange={(value: "markdown" | "plain-text") =>
                    updateConfig("format", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markdown">Markdown</SelectItem>
                    <SelectItem value="plain-text">Plain Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Length Setting */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Length
                </label>
                <Select
                  value={config.length}
                  onValueChange={(value: "short" | "medium" | "long") =>
                    updateConfig("length", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
