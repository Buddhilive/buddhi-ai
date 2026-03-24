export interface DocumentInfo {
  id: number;
  filename: string;
  original_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count: number | null;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
}

export const documentsApi = {
  /**
   * Upload a documents to Indexeddb for RAG ingestion.
   */
  async uploadDocument(file: File): Promise<DocumentInfo> {
    // TODO: implement
  },

  /**
   * List all uploaded documents ordered by creation time (newest first).
   */
  async listDocuments(): Promise<DocumentInfo[]> {
    // TODO: implement
  },

  /**
   * Get a single document record by ID.
   */
  async getDocument(id: number): Promise<DocumentInfo> {
    // TODO: implement
  },

  /**
   * Delete a document record and remove its chunks from PGlite.
   */
  async deleteDocument(id: number): Promise<void> {
    // TODO: implement
  },

  /**
   * get document processing progress tracking.
   */
  getProgress(id: number): string {
    // TODO: implement
  },
};
