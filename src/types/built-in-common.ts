type BAIAvailability =
  | "unavailable"
  | "available"
  | "downloadable"
  | "downloading";

interface BAIPogressMonitor {
  monitor(m: {
    addEventListener: (event: string, listener: (e: any) => void) => void;
  }): void;
}

interface BAISummaryOptions extends BAIPogressMonitor {
  sharedContext: string;
  type: "key-points" | "tldr" | "teaser" | "headline";
  format: "markdown" | "plain-text";
  length: "short" | "medium" | "long";
}

interface BAITranslationOptions extends BAIPogressMonitor {
  sourceLanguage: string;
  targetLanguage: string;
}
