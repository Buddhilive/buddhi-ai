import {
    ChatTransport, UIMessageChunk, streamText,
    convertToModelMessages, ChatRequestOptions,
    createUIMessageStream, stepCountIs, embed,
} from "ai";
import {
    TransformersJSLanguageModel,
    TransformersUIMessage,
    transformersJS,
} from "@browser-ai/transformers-js";
import { MODELS } from "./models";
import { createTools } from "./tools";
import { retrieveSimilarChunks } from "./documents";

export class TransformersChatTransport
    implements ChatTransport<TransformersUIMessage> {
    private model: TransformersJSLanguageModel | null = null;
    private embeddingModel: any = null;
    private tools: ReturnType<typeof createTools> | null = null;

    private getModel(): TransformersJSLanguageModel {
        if (!this.model) {
            const config = MODELS[0];
            this.model = transformersJS(config.id, {
                device: config.device,
                dtype: config.dtype,
                ...(config.supportsWorker && typeof Worker !== "undefined"
                    ? {
                        worker: new Worker(new URL("@/lib/worker.ts", import.meta.url), {
                            type: "module",
                        }),
                    }
                    : {}),
            });
        }
        return this.model;
    }

    private getEmbeddingModel() {
        if (!this.embeddingModel) {
            const config = MODELS[1]; // onnx-community/embeddinggemma-300m-ONNX
            this.embeddingModel = transformersJS.embedding(config.id, {
                device: config.device,
                dtype: config.dtype,
            });
        }
        return this.embeddingModel;
    }

    private getTools(): ReturnType<typeof createTools> {
        if (!this.tools) {
            this.tools = createTools();
        }
        return this.tools;
    }

    async sendMessages(
        options: {
            chatId: string;
            messages: TransformersUIMessage[];
            abortSignal: AbortSignal | undefined;
        } & {
            trigger: "submit-message" | "submit-tool-result" | "regenerate-message";
            messageId: string | undefined;
        } & ChatRequestOptions,
    ): Promise<ReadableStream<UIMessageChunk>> {
        const { messages, abortSignal } = options;
        const prompt = await convertToModelMessages(messages);

        return createUIMessageStream<TransformersUIMessage>({
            execute: async ({ writer }) => {
                // Track download progress if the model hasn't been downloaded yet
                let downloadProgressId: string | undefined;
                const model = this.getModel();
                const tools = this.getTools();
                const availability = await model.availability();

                if (availability !== "available") {
                    await model.createSessionWithProgress(
                        (progress: number) => {
                            const percent = Math.round(progress * 100);

                            if (progress >= 1) {
                                if (downloadProgressId) {
                                    writer.write({
                                        type: "data-modelDownloadProgress",
                                        id: downloadProgressId,
                                        data: {
                                            status: "complete", progress: 100,
                                            message: "Model ready!",
                                        },
                                    });
                                }
                                return;
                            }

                            if (!downloadProgressId) {
                                downloadProgressId = `download-${Date.now()}`;
                            }

                            writer.write({
                                type: "data-modelDownloadProgress",
                                id: downloadProgressId,
                                data: {
                                    status: "downloading", progress: percent,
                                    message: `Downloading model... ${percent}%`,
                                },
                            });
                        },
                    );
                }

                // ─── RAG Retrieval ────────────────────────────────────────────────────
                let ragContext = "";
                const ragSources: Array<{ docId: number; originalName: string }> = [];

                // Extract the latest user message text
                const lastUserMsg = messages.findLast(m => m.role === "user");
                const textPart = lastUserMsg?.parts?.find(
                    (p: any) => p.type === "text"
                ) as any;
                const queryText = textPart?.text ?? "";

                if (queryText) {
                    try {
                        const embeddingModel = this.getEmbeddingModel();
                        const { embedding } = await embed({
                            model: embeddingModel,
                            value: queryText,
                        });

                        const chunks = await retrieveSimilarChunks(embedding, 5);
                        if (chunks.length > 0) {
                            ragContext = chunks
                                .map(
                                    (c, i) =>
                                        `[Context ${i + 1}] (from: ${c.original_name})\n${c.chunk_text}`
                                )
                                .join("\n\n");

                            // Deduplicate sources by doc_id
                            const seen = new Set<number>();
                            for (const c of chunks) {
                                if (!seen.has(c.doc_id)) {
                                    seen.add(c.doc_id);
                                    ragSources.push({
                                        docId: c.doc_id,
                                        originalName: c.original_name,
                                    });
                                }
                            }
                        }
                    } catch (err) {
                        console.warn("[RAG] Retrieval skipped:", err);
                    }
                }

                // Inject RAG context as a system message if we found relevant chunks
                const messagesWithContext = ragContext
                    ? [
                        {
                            role: "system" as const,
                            content: `Use the following document excerpts to answer the user's question:\n\n${ragContext}\n\nIf the documents don't contain relevant information, answer from your general knowledge.`,
                        },
                        ...prompt,
                    ]
                    : prompt;

                // Emit source-url chunks for each unique document
                for (const source of ragSources) {
                    writer.write({
                        type: "source-url",
                        id: `rag-source-${source.docId}`,
                        url: `#doc-${source.docId}`,
                        title: source.originalName,
                    } as any);
                }

                const result = streamText({
                    model,
                    tools,
                    stopWhen: stepCountIs(5),
                    messages: messagesWithContext,
                    abortSignal,
                });

                writer.merge(result.toUIMessageStream({ sendStart: false }));
            },
        });
    }

    async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
        return null;
    }
}