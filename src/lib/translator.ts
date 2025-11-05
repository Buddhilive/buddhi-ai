import { BAIAvailability, BAIPogressMonitor, BAITranslationOptions } from "@/types/built-in-common";

const isLanguageDetectorAvailable = async (): Promise<boolean> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window === 'undefined' || !(window as any).LanguageDetector) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isAvailable: BAIAvailability = await (window as any).LanguageDetector.availability();
    
    return (
      isAvailable === "available" ||
      isAvailable === "downloadable" ||
      isAvailable === "downloading"
    );
  } catch (error) {
    console.error("Error checking language detector availability:", error);
    return false;
  }
};

const isTranslatorAvailable = async (sourceLanguage: string, targetLanguage: string): Promise<boolean> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window === 'undefined' || !(window as any).Translator) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isAvailable: BAIAvailability = await (window as any).Translator.availability({
      sourceLanguage,
      targetLanguage,
    });

    return (
      isAvailable === "available" ||
      isAvailable === "downloadable" ||
      isAvailable === "downloading"
    );
  } catch (error) {
    console.error("Error checking translator availability:", error);
    return false;
  }
};

const getLanguageDetector = async (monitor: BAIPogressMonitor) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const languageDetector = await (window as any).LanguageDetector.create(monitor);
  return languageDetector;
}

const getTranslator = async (options: BAITranslationOptions) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const translator = await (window as any).Translator.create(options);
  return translator;
}

export {
  isLanguageDetectorAvailable,
  isTranslatorAvailable,
  getLanguageDetector,
  getTranslator,
};
