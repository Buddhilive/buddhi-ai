"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  BookOpen,
  Hash,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { embeddingManager } from "@/lib/embedding-manager";
import { searchChunks } from "@/lib/vector-store";
import { usePaperStore } from "@/stores/paper-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { AssistantMessage, RAGCitation, SearchResultChunk } from "@/types/research";
import { nanoid } from "nanoid";

interface AiAssistantPanelProps {
  paperId: string;
}

export function AiAssistantPanel({ paperId }: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content:
        "Hello! I am your AI academic research assistant. Ask any question about this paper, and I will cite the exact page and section from the text.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lowConfidenceWarning, setLowConfidenceWarning] = useState(false);

  const { setSelectedChunkId, setActiveCitations } = usePaperStore();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    setInput("");
    const userMsg: AssistantMessage = {
      id: nanoid(),
      role: "user",
      content: query,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setLowConfidenceWarning(false);

    try {
      // 1. Generate query embedding
      const queryVector = await embeddingManager.generateEmbedding(query);

      // 2. Vector search over paper chunks
      const topChunks: SearchResultChunk[] = await searchChunks(
        queryVector,
        paperId,
        5,
        0.25
      );

      if (topChunks.length === 0 || topChunks[0].similarity < 0.35) {
        setLowConfidenceWarning(true);
      }

      // Convert matches to citations
      const citations: RAGCitation[] = topChunks.map((c) => ({
        chunkId: c.id,
        paperId: c.paperId,
        pageNumber: c.pageNumber,
        textSnippet: c.text.slice(0, 150) + "...",
      }));

      // Highlight retrieved chunks in reader
      setActiveCitations(citations);
      if (topChunks.length > 0) {
        setSelectedChunkId(topChunks[0].id);
      }

      // 3. Synthesize structured answer
      let answerText = "";
      if (topChunks.length === 0) {
        answerText =
          "No highly relevant sections were found in this paper for your query. Consider rephrasing or checking if the paper covers this topic.";
      } else {
        const topChunk = topChunks[0];
        answerText = `Based on page ${topChunk.pageNumber} of this paper:\n\n"${topChunk.text.slice(0, 320)}..."\n\nThis section addresses your question directly. Click the citation below to inspect the full context in the reader.`;
      }

      const assistantMsg: AssistantMessage = {
        id: nanoid(),
        role: "assistant",
        content: answerText,
        citations,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("[AiAssistantPanel] Q&A error:", err);
      const errMsg: AssistantMessage = {
        id: nanoid(),
        role: "assistant",
        content:
          "Unable to perform semantic query. Please ensure EmbeddingGemma is installed and this paper has been embedded.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-card w-80 md:w-96 shrink-0">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Paper Q&A Assistant</h3>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">
          LiteRT RAG
        </Badge>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-4">
        <div className="space-y-4 pb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col text-xs leading-relaxed ${
                msg.role === "user"
                  ? "items-end"
                  : "items-start"
              }`}
            >
              <div
                className={`p-3 rounded-xl max-w-[90%] whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground font-sans"
                    : "bg-muted text-foreground border"
                }`}
              >
                {msg.content}

                {/* Inline Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/50 space-y-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Sources & Citations:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((cite, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedChunkId(cite.chunkId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-background/80 hover:bg-background border text-[11px] font-medium text-primary hover:underline transition-colors"
                        >
                          <BookOpen className="h-3 w-3" />
                          <span>p.{cite.pageNumber}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-muted-foreground mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/40 border">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Embedding query & searching paper vectors...</span>
            </div>
          )}

          {lowConfidenceWarning && (
            <div className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Low confidence match. Consider rephrasing your inquiry.</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSend} className="p-3 border-t flex gap-2 bg-background">
        <Input
          placeholder="Ask a question about this paper..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          className="text-xs font-sans h-9"
        />
        <Button type="submit" size="sm" disabled={isLoading || !input.trim()} className="h-9 px-3">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
