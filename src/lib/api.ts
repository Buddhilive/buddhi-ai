import { ChatCompletionRequest, ChatCompletionResponse } from "@/types/chat";

export const chatApi = {
  async getCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const session = await (window as any).LanguageModel.create({
      initialPrompts: request.initialMessages,
    });

    const result = await session.prompt(request.prompt);
    return { message: result };
  },
};
