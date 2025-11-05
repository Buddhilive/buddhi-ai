type BAIAvailability = "unavailable" | "available" | "downloadable" | "downloading";
interface BAISummaryOptions {
  sharedContext: string;
  type: 'key-points' | 'tldr' | 'teaser' | 'headline';
  format: 'markdown' | 'plain-text';
  length: 'short' | 'medium' | 'long';
  monitor(m: { addEventListener: (event: string, listener: (e: any) => void) => void }): void;
}