export interface ModelDownloadRequest {
  model: string;  // Ollama model name, e.g. "qwen3.5:3b"
}

export interface ModelInfo {
  id: string;
  model_id?: string;
  name: string;
  quantization: string;
  status: 'pending' | 'pulling' | 'completed' | 'failed';
  progress?: number;
  total_size?: number;
  downloaded_size?: number;
  error?: string;
}

export const modelsApi = {
  /**
   * List all models
   */
  async listModels(): Promise<ModelInfo[]> {
    // TODO: implement
  },

  /**
   * Start a model download
   */
  async downloadModel(data: ModelDownloadRequest): Promise<ModelInfo> {
    // TODO: implement
  },

  /**
   * Check download status by ID
   */
  async getModelStatus(id: string): Promise<ModelInfo> {
    // TODO: implement
  },

  /**
   * Delete a model record and its files, or cancel download
   */
  async deleteModel(id: string): Promise<void> {
    // TODO: implement
  },

  /**
   * Get model download progress tracking
   */
  getProgress(id: string): string {
    // TODO: implement
  }
};
