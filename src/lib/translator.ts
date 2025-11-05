import { BAIAvailability, BAIPogressMonitor, BAITranslationOptions } from "@/types/built-in-common";

const isLanguageDetectorAvailable = async (): Promise<boolean> => {
  try {
    // First check if the LanguageDetector object exists
    if (typeof window === 'undefined' || !(window as any).LanguageDetector) {
      return false;
    }

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
    // First check if the Translator object exists
    if (typeof window === 'undefined' || !(window as any).Translator) {
      return false;
    }

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
  const languageDetector = await (window as any).LanguageDetector.create(monitor);
  return languageDetector;
}

const getTranslator = async (options: BAITranslationOptions) => {
  const translator = await (window as any).Translator.create(options);
  return translator;
}

export {
  isLanguageDetectorAvailable,
  isTranslatorAvailable,
  getLanguageDetector,
  getTranslator,
};
