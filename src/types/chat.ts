export interface Message {
  id?: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp?: Date;
}

export interface ChatCompletionRequest {
  initialMessages?: LanguageModelMessage[];
  prompt: string
}

export interface ChatCompletionResponse {
  message: string;
}

export interface ApiError {
  message: string;
  status?: number;
}