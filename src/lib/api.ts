import { ChatCompletionRequest, ChatCompletionResponse } from "@/types/chat";
import { buddhiAIModel } from "@/lib/provider";
import { generateText } from "ai";

export const chatApi = {
  async getCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      const systemMessage: LanguageModelMessage = {
        role: "system" as LanguageModelMessageRole,
        content: `You are Buddhi AI, a helpful assistant developed by Buddhi LIVE Labs.`
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
