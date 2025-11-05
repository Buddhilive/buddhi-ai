export type BAIAvailability =
  | "unavailable"
  | "available"
  | "downloadable"
  | "downloading";

export interface BAIPogressMonitor {
  monitor(m: {
    addEventListener: (event: string, listener: (e: any) => void) => void;
  }): void;
}

export interface BAISummaryOptions extends BAIPogressMonitor {
  sharedContext: string;
  type: "key-points" | "tldr" | "teaser" | "headline";
  format: "markdown" | "plain-text";
  length: "short" | "medium" | "long";
}

export interface BAITranslationOptions extends BAIPogressMonitor {
  sourceLanguage: string;
  targetLanguage: string;
}

export interface BAIWriterContentConfig {
  tone?: 'formal' | 'neutral' | 'casual';
  format?: 'markdown' | 'plain-text';
  length?: 'short' | 'medium' | 'long';
  sharedContext?: string;
}
