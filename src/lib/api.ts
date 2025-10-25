import { ChatCompletionRequest, ChatCompletionResponse } from "@/types/chat";
import { buddhiAIModel } from "@/lib/provider";
import { generateText, tool } from "ai";
import { z } from "zod";
import { webSearch } from "@/tools/web-search";

export const chatApi = {
  async getCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      const systemMessage: LanguageModelMessage = {
        role: "system" as LanguageModelMessageRole,
        content: `You are Buddhi AI, a helpful assistant developed by Buddhi LIVE Labs.`,
      };

      request.initialMessages?.unshift(systemMessage);

      // Convert LanguageModelMessage[] to the plain message shape expected by the external `ai` library
      const mappedMessages: any[] = (request.initialMessages || []).map((m) => {
        // Normalize role to common string literals; default to 'user' if unknown
        const role =
          m.role === "system" || m.role === "user" || m.role === "assistant"
            ? m.role
            : "user";
        return { role, content: m.content };
      });

      const result = await generateText({
        model: buddhiAIModel(""),
        messages: mappedMessages,
        tools: {
          addResource: tool({
            description: `Search information from the web to answer user's questions.
          If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
            inputSchema: z.object({
              query: z
                .string()
                .describe(
                  "the search query"
                ),
            }),
            execute: async ({ query }) => {
              console.log("Executing web search with query:", query);
              const res = await webSearch({ query });
              return JSON.stringify(res);
            },
          }),
        },
      });

      /* for await (const chunk of result.textStream) {
        console.log(chunk);
      } */

      return { message: result.text };
    } catch (error) {
      console.error("Error getting AI response:", error);
      throw new Error("Failed to get AI response");
    }
  },
};
