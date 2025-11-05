const isWriterAvailable = async (): Promise<boolean> => {
try {
    const isAvailable: BAIAvailability = await (
      window as any
    ).Writer.availability();
    return (
      isAvailable === "available" ||
      isAvailable === "downloadable" ||
      isAvailable === "downloading"
    );
  } catch (error) {
    console.warn("Error checking summarizer availability:", error);
    return false;
  }
}

const getWriter = async (monitor: BAIPogressMonitor) => {
  const writer = await (window as any).Writer.create(monitor);
  return writer;
}

export { isWriterAvailable, getWriter };