import type { BAIAvailability, BAIPogressMonitor } from "@/types/built-in-common";

const isWriterAvailable = async (): Promise<boolean> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window === 'undefined' || !(window as any).Writer) {
      return false;
    }

    const isAvailable: BAIAvailability = await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window as any
    ).Writer.availability();
    return (
      isAvailable === "available" ||
      isAvailable === "downloadable" ||
      isAvailable === "downloading"
    );
  } catch (error) {
    console.warn("Error checking writer availability:", error);
    return false;
  }
}

const getWriter = async (monitor: BAIPogressMonitor) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const writer = await (window as any).Writer.create(monitor);
  return writer;
}

export { isWriterAvailable, getWriter };