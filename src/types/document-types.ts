export type DocumentStatus =
  | "uploading"
  | "chunking"
  | "embedding"
  | "saving"
  | "ready"
  | "error";

export interface DocumentItem {
  id: string;
  fileName: string;
  status: DocumentStatus;
  progress: number;
  error?: string;
  fileSize?: number;
}

export interface ProcessingProgress {
  stage: "reading" | "chunking" | "embedding" | "saving";
  progress: number;
  total: number;
  documentId: string;
}

export interface WorkerMessage {
  type: "progress" | "complete" | "error";
  documentId: string;
  progress?: ProcessingProgress;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  index?: any;
}

export interface WorkerRequest {
  type: "process";
  documentId: string;
  fileName: string;
  text: string;
  chatId: string;
}
