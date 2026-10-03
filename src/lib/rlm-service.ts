import {
  Sandbox,
  RlmSession,
  RlmError,
  RlmResult,
  RlmConfig,
} from "@buddhilive/sandbox";
import type { Engine } from "@litert-lm/core";
import type { RlmAnalysisOptions, RlmMetadata } from "@/types/research";
import { inferenceQueue } from "@/lib/inference-queue";

export class RlmService {
  private sandboxPromise: Promise<Sandbox> | null = null;

  /**
   * Lazily bootstraps the singleton WebAssembly Sandbox instance.
   */
  public async getSandbox(): Promise<Sandbox> {
    if (typeof window === "undefined") {
      throw new Error("RlmService is only available in browser environments.");
    }

    if (!this.sandboxPromise) {
      this.sandboxPromise = Sandbox.create({
        maxMemoryMb: 512,
      }).catch((err) => {
        // Reset on failure so subsequent attempts can retry
        this.sandboxPromise = null;
        throw new RlmError(
          `Failed to initialize WebAssembly sandbox for RLM: ${err?.message || String(err)}`,
          "ERR_SANDBOX_INIT"
        );
      });
    }

    return this.sandboxPromise;
  }

  /**
   * Executes deep recursive analysis over single or multi-paper academic documents
   * using the in-WASM RLM engine without truncating to standard RAG context limits.
   */
  public async analyzeDocument(
    options: RlmAnalysisOptions,
    engine: Engine
  ): Promise<{ answer: string; metadata: RlmMetadata }> {
    const {
      query,
      documentText,
      documentTitle = "Academic Paper",
      papers,
      maxDepth = 5,
      chunkSize,
      mode = "auto",
      maxTurns,
      maxSubQueries,
      maxObservationChars,
      opfsPath,
      signal,
      onProgress,
    } = options;

    if (!query || query.trim().length === 0) {
      throw new RlmError("Query cannot be empty for RLM analysis", "ERR_INVALID_QUERY");
    }

    // Assemble text payload from single document or multi-paper array
    let fullContext = "";
    const titles: string[] = [];

    if (papers && papers.length > 0) {
      for (const p of papers) {
        titles.push(p.title);
        fullContext += `=== PAPER: ${p.title} ===\n\n${p.text}\n\n`;
      }
    } else {
      titles.push(documentTitle);
      fullContext = documentText;
    }

    if (!fullContext || fullContext.trim().length === 0) {
      throw new RlmError(
        "No document content provided to RLM context store",
        "ERR_EMPTY_CONTEXT"
      );
    }

    onProgress?.({
      iteration: 0,
      phase: "initializing",
      message: "Bootstrapping WebAssembly RLM environment...",
    });

    const sandbox = await this.getSandbox();

    const config: RlmConfig = {
      maxDepth,
      chunkSize,
      mode: mode as any,
      maxTurns,
      maxSubQueries,
      maxObservationChars,
      chunkStrategy: { type: "paragraph" },
    };

    const session: RlmSession = sandbox.createRlmSession(config);

    // Wire up cooperative abort signal
    if (signal) {
      if (signal.aborted) {
        await session.dispose();
        throw new RlmError("RLM analysis was aborted before start", "ERR_ABORTED");
      }
      signal.addEventListener(
        "abort",
        () => {
          session.cancel().catch(() => {});
        },
        { once: true }
      );
    }

    try {
      // If OPFS path provided or file is > 1MB and OPFS is available, write to OPFS
      let usedOpfs = false;
      const OPFS_THRESHOLD_BYTES = 1024 * 1024; // 1MB

      if (
        (opfsPath || fullContext.length > OPFS_THRESHOLD_BYTES) &&
        typeof navigator !== "undefined" &&
        navigator.storage?.getDirectory
      ) {
        try {
          onProgress?.({
            iteration: 0,
            phase: "indexing",
            message: `Writing document to OPFS and constructing out-of-core index (~${Math.round(fullContext.length / 1024)}KB)...`,
          });

          const root = await navigator.storage.getDirectory();
          const targetFileName = opfsPath ? opfsPath.split("/").filter(Boolean).pop()! : `rlm_doc_${Date.now()}.txt`;
          const fileHandle = await root.getFileHandle(targetFileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(fullContext);
          await writable.close();

          await session.addContextFromOpfs(targetFileName);
          usedOpfs = true;
        } catch (opfsErr) {
          console.warn("[RlmService] OPFS ingestion fell back to in-memory:", opfsErr);
          usedOpfs = false;
        }
      }

      if (!usedOpfs) {
        onProgress?.({
          iteration: 0,
          phase: "ingesting",
          message: `Ingesting ${Math.round(fullContext.length / 1024)}KB into WASM linear memory...`,
        });
        await session.addContext(fullContext);
      }

      let currentIteration = 0;

      // Inverted LLM callback bridge using Google's LiteRT-LM Engine via InferenceQueue
      const llmFn = async (
        prompt: string,
        ctx?: { role?: "root" | "sub"; subId?: string; signal?: AbortSignal }
      ): Promise<string> => {
        if (signal?.aborted) {
          throw new RlmError("Analysis aborted by caller", "ERR_ABORTED");
        }

        currentIteration++;
        const role = ctx?.role || "root";
        const phase = role === "sub" ? "sub_query" : "exploring";

        onProgress?.({
          iteration: currentIteration,
          phase,
          message:
            role === "sub"
              ? `Executing subquery ${ctx?.subId || currentIteration}...`
              : `Evaluating exploration step ${currentIteration}...`,
          subId: ctx?.subId,
        });

        // Enqueue inference through serialized inferenceQueue
        return inferenceQueue.enqueue(async () => {
          const conversation = await engine.createConversation({
            preface: { messages: [] },
          });

          try {
            const stream = conversation.sendMessageStreaming(prompt);
            const reader = stream.getReader();
            let responseText = "";
            try {
              while (true) {
                const { done, value: chunk } = await reader.read();
                if (done || !chunk) break;
                if (signal?.aborted) {
                  conversation.cancel();
                  throw new RlmError("Inference aborted by caller", "ERR_ABORTED");
                }
                if (typeof chunk.content === "string") {
                  responseText += chunk.content;
                } else if (Array.isArray(chunk.content)) {
                  for (const part of chunk.content) {
                    if (typeof part === "string") {
                      responseText += part;
                    } else if ((part as any)?.text) {
                      responseText += (part as any).text;
                    }
                  }
                } else if (typeof chunk === "string") {
                  responseText += chunk;
                }
              }
            } finally {
              reader.releaseLock();
            }
            return responseText;
          } finally {
            await conversation.delete().catch(() => {});
          }
        }, signal);
      };

      onProgress?.({
        iteration: 1,
        phase: "orchestrating",
        message: "Starting in-browser Recursive Language Model loop...",
      });

      const result: RlmResult = await session.run(query, llmFn);

      if (!result.answer || result.answer.trim().toLowerCase() === "buffer") {
        throw new RlmError(
          "RLM synthesized an empty or placeholder response ('buffer')",
          "ERR_INVALID_ANSWER"
        );
      }

      onProgress?.({
        iteration: result.iterations,
        phase: "completed",
        message: `Analysis completed in ${result.iterations} iterations.`,
      });

      // Rough chunk estimate based on paragraph breaks
      const estimatedChunks = fullContext.split(/\n\s*\n/).filter(Boolean).length;

      return {
        answer: result.answer,
        metadata: {
          isRlm: true,
          iterations: result.iterations,
          terminatedBy: result.terminated_by,
          costEstimateTokens: result.cost_estimate_tokens,
          totalChunksAnalyzed: estimatedChunks,
          paperTitles: titles,
        },
      };
    } finally {
      await session.dispose().catch(() => {});
    }
  }

  /**
   * Disposes the singleton sandbox instance if running.
   */
  public async dispose(): Promise<void> {
    if (this.sandboxPromise) {
      const sb = await this.sandboxPromise.catch(() => null);
      this.sandboxPromise = null;
      if (sb) {
        await sb.dispose().catch(() => {});
      }
    }
  }
}

export const rlmService = new RlmService();
