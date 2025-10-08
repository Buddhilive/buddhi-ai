export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
}

export interface Message {
  id?: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp?: Date;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
}

export interface ChatCompletionResponse {
  message: string;
}

export interface ApiError {
  message: string;
  status?: number;
}