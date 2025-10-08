import {
  ChatCompletionRequest,
  ChatCompletionResponse
} from "@/types/chat";

export const chatApi = {
  async getCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    return { message: 'Namo Buddhaya!' }
  },
};
