import { BUDDHI_TOOLS } from "@/tools/tools";
import { ChatCompletionRequest, ChatCompletionResponse } from "@/types/chat";


export const chatApi = {
  languageModel: (window as any).LanguageModel as LanguageModel,
  async getCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      const session = await this.languageModel.create({
        initialPrompts: request.initialMessages,
        tools: BUDDHI_TOOLS
      });

      const result = await session.prompt(request.prompt);
      return { message: result };
    } catch (error) {
      console.error("Error getting AI response:", error);
      throw new Error("Failed to get AI response");
    }
  },
};
