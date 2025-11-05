const isSummarizerAvailable = async (): Promise<boolean> => {
  try {
    const isAvailable: BAIAvailability = await (
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
  const summarizer = await (window as any).Summarizer.create(options);
  return summarizer;
};

export { isSummarizerAvailable, getSummarizer };
