import { BUDDHI_TOOLS } from "@/tools/tools";
import { ChatCompletionRequest, ChatCompletionResponse } from "@/types/chat";


export const chatApi = {
  async getCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      const languageModel: LanguageModel = (window as any).LanguageModel;
      const systemMessage: LanguageModelMessage = {
        role: "system" as LanguageModelMessageRole,
        content:
          "You are Buddhi, a helpful assistant. You can use tools to help the user.",
      };

      request.initialMessages?.unshift(systemMessage);
      const session = await languageModel.create({
        initialPrompts: request.initialMessages,
        tools: BUDDHI_TOOLS
      });

      console.log("Session created with initial messages:", session);

      const result = await session.prompt(request.prompt);
      return { message: result };
    } catch (error) {
      console.error("Error getting AI response:", error);
      throw new Error("Failed to get AI response");
    }
  },
};
