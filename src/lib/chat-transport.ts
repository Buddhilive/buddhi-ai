import {
    ChatTransport, UIMessageChunk, streamText,
    convertToModelMessages, ChatRequestOptions,
    createUIMessageStream, stepCountIs,
} from "ai";
import {
    TransformersJSLanguageModel,
    TransformersUIMessage,
    transformersJS,
} from "@browser-ai/transformers-js";
import { MODELS } from "./models";
import { createTools } from "./tools";

export class TransformersChatTransport
    implements ChatTransport<TransformersUIMessage> {
    private model: TransformersJSLanguageModel | null = null;
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

                const result = streamText({
                    model,
                    tools,
                    stopWhen: stepCountIs(5),
                    messages: prompt,
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