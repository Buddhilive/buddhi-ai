"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  BookOpen,
  AlertCircle,
  Cpu,
  StopCircle,
} from "lucide-react";
import { embeddingManager } from "@/lib/embedding-manager";
import { searchChunks } from "@/lib/vector-store";
import { usePaperStore } from "@/stores/paper-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useLiteRTModelStore } from "@/stores/litert-store";
import { rlmService } from "@/lib/rlm-service";
import { ExtendedContextBadge } from "@/components/research/extended-context-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  const [rlmStatus, setRlmStatus] = useState<string | null>(null);
  const [lowConfidenceWarning, setLowConfidenceWarning] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { currentPaper, setSelectedChunkId, setActiveCitations } = usePaperStore();
  const { enableExtendedContext, setEnableExtendedContext } = useSettingsStore();
  const liteRTModelInstance = useLiteRTModelStore((s) => s.liteRTModelInstance);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setRlmStatus(null);
    }
  };

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
    setRlmStatus(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Check whether Extended Context (RLM) is viable
    const hasPaperText = Boolean(currentPaper?.rawText && currentPaper.rawText.length > 500);
    const canRunRlm = Boolean(enableExtendedContext && hasPaperText && liteRTModelInstance);

    if (canRunRlm && currentPaper?.rawText && liteRTModelInstance) {
      try {
        setRlmStatus("Initializing in-browser WASM RLM engine...");
        const rlmResult = await rlmService.analyzeDocument(
          {
            query,
            documentText: currentPaper.rawText,
            documentTitle: currentPaper.metadata.title || currentPaper.fileName,
            maxDepth: 5,
            signal: abortController.signal,
            onProgress: (prog) => {
              setRlmStatus(`Step ${prog.iteration}: ${prog.message}`);
            },
          },
          liteRTModelInstance
        );

        const assistantMsg: AssistantMessage = {
          id: nanoid(),
          role: "assistant",
          content: rlmResult.answer,
          rlmMetadata: rlmResult.metadata,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setIsLoading(false);
        setRlmStatus(null);
        abortControllerRef.current = null;
        return;
      } catch (err: any) {
        if (abortController.signal.aborted) {
          setIsLoading(false);
          setRlmStatus(null);
          return;
        }
        console.warn("[AiAssistantPanel] RLM failed or fell back, attempting standard RAG:", err);
      }
    }

    // Standard Vector RAG Fallback
    try {
      setRlmStatus(null);
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
          "Unable to perform query. Please ensure EmbeddingGemma or LiteRT models are ready.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      setRlmStatus(null);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 border-l bg-card w-80 md:w-96 shrink-0 overflow-hidden">
      <div className="p-3 border-b flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Paper Q&A Assistant</h3>
          </div>
          <Badge
            variant={enableExtendedContext ? "default" : "outline"}
            className="text-[10px] font-mono gap-1"
          >
            {enableExtendedContext ? (
              <>
                <Cpu className="h-3 w-3" />
                RLM Active
              </>
            ) : (
              "LiteRT RAG"
            )}
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Cpu className="h-3.5 w-3.5" />
            <span>Extended Context (RLM)</span>
          </div>
          <Switch
            size="sm"
            checked={enableExtendedContext}
            onCheckedChange={setEnableExtendedContext}
            title="Toggle Recursive Language Model full document context ingestion"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
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

              {/* RLM Metadata Badge */}
              {msg.rlmMetadata && (
                <div className="mt-2.5 pt-2 border-t border-border/40">
                  <ExtendedContextBadge metadata={msg.rlmMetadata} />
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
          <div className="flex items-center justify-between text-xs text-muted-foreground p-3 rounded-lg bg-muted/40 border">
            <div className="flex items-center gap-2 overflow-hidden">
              {rlmStatus ? (
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary shrink-0" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
              )}
              <span className="truncate">
                {rlmStatus || "Embedding query & searching paper vectors..."}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-6 px-1.5 text-xs text-destructive hover:bg-destructive/10 shrink-0"
            >
              <StopCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {lowConfidenceWarning && (
          <div className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Low confidence match. Consider rephrasing your inquiry.</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t flex gap-2 bg-background shrink-0">
        <Input
          placeholder={
            enableExtendedContext
              ? "Ask full paper question (RLM enabled)..."
              : "Ask a question about this paper..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          className="text-xs font-sans h-9"
        />
        <Button
          type="submit"
          size="sm"
          disabled={isLoading || !input.trim()}
          className="h-9 px-3"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
