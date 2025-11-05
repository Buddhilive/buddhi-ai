import { BAIAvailability, BAISummaryOptions } from "@/types/built-in-common";

const isSummarizerAvailable = async (): Promise<boolean> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window === 'undefined' || !(window as any).Summarizer) {
      return false;
    }

    const isAvailable: BAIAvailability = await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window as any
    ).Summarizer.availability();
    return (
      isAvailable === "available" ||
      isAvailable === "downloadable" ||
      isAvailable === "downloading"
    );
  } catch (error) {
    console.warn("Error checking summarizer availability:", error);
    return false;
  }
};

const getSummarizer = async (options: BAISummaryOptions) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summarizer = await (window as any).Summarizer.create(options);
  return summarizer;
};

export { isSummarizerAvailable, getSummarizer };
