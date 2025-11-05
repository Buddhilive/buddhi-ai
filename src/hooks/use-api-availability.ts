"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { chatApi } from "@/lib/api";
import { isSummarizerAvailable } from "@/lib/summarizer";
import { isWriterAvailable } from "@/lib/writer";
import { isLanguageDetectorAvailable, isTranslatorAvailable } from "@/lib/translator";

interface ApiAvailabilityState {
  languageModel: boolean;
  summarizer: boolean;
  writer: boolean;
  languageDetector: boolean;
  translator: boolean;
  isChecking: boolean;
}

interface UseApiAvailabilityOptions {
  requiredApis: (keyof Omit<ApiAvailabilityState, 'isChecking'>)[];
  redirectOnUnavailable?: boolean;
  debug?: boolean;
}

export const useApiAvailability = ({ 
  requiredApis, 
  redirectOnUnavailable = true,
  debug = false 
}: UseApiAvailabilityOptions) => {
  const router = useRouter();
  const hasChecked = useRef(false);
  const [availability, setAvailability] = useState<ApiAvailabilityState>({
    languageModel: false,
    summarizer: false,
    writer: false,
    languageDetector: false,
    translator: false,
    isChecking: true,
  });

  const log = (...args: any[]) => {
    if (debug) console.log('[API Availability]', ...args);
  };

  const checkAvailability = async () => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    setAvailability(prev => ({ ...prev, isChecking: true }));

    try {
      log('Starting API availability check...');
      
      // Check if Chrome Built-in AI is available at all
      const hasWindow = typeof window !== 'undefined';
      if (!hasWindow) {
        log('No window object, server-side rendering');
        setAvailability({
          languageModel: false,
          summarizer: false,
          writer: false,
          languageDetector: false,
          translator: false,
          isChecking: false,
        });
        return false;
      }

      const hasLanguageModel = !!(window as any).LanguageModel;
      const hasSummarizer = !!(window as any).Summarizer;
      const hasWriter = !!(window as any).Writer;
      const hasLanguageDetector = !!(window as any).LanguageDetector;
      const hasTranslator = !!(window as any).Translator;

      log('Basic API objects present:', {
        hasLanguageModel,
        hasSummarizer,
        hasWriter,
        hasLanguageDetector,
        hasTranslator
      });

      // If none of the basic objects are present, redirect immediately
      if (!hasLanguageModel && !hasSummarizer && !hasWriter && !hasLanguageDetector && !hasTranslator) {
        log('No Chrome Built-in AI APIs detected, redirecting immediately');
        setAvailability({
          languageModel: false,
          summarizer: false,
          writer: false,
          languageDetector: false,
          translator: false,
          isChecking: false,
        });

        if (redirectOnUnavailable) {
          router.replace('/installation');
        }
        return false;
      }

      // If basic objects exist, do detailed checks (with timeout)
      const checkWithTimeout = async (checkFn: () => Promise<boolean>, timeout = 3000): Promise<boolean> => {
        return Promise.race([
          checkFn(),
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), timeout))
        ]);
      };

      const [
        languageModelAvailable,
        summarizerAvailable,
        writerAvailable,
        languageDetectorAvailable,
        translatorAvailable
      ] = await Promise.all([
        hasLanguageModel ? checkWithTimeout(() => chatApi.isLanguageModelAvvailable()) : Promise.resolve(false),
        hasSummarizer ? checkWithTimeout(() => isSummarizerAvailable()) : Promise.resolve(false),
        hasWriter ? checkWithTimeout(() => isWriterAvailable()) : Promise.resolve(false),
        hasLanguageDetector ? checkWithTimeout(() => isLanguageDetectorAvailable()) : Promise.resolve(false),
        hasTranslator ? checkWithTimeout(() => isTranslatorAvailable('en', 'es')) : Promise.resolve(false),
      ]);

      const newAvailability = {
        languageModel: languageModelAvailable,
        summarizer: summarizerAvailable,
        writer: writerAvailable,
        languageDetector: languageDetectorAvailable,
        translator: translatorAvailable,
        isChecking: false,
      };

      log('API availability results:', newAvailability);
      log('Required APIs:', requiredApis);

      // Check if all required APIs are available
      const allRequiredAvailable = requiredApis.every(api => newAvailability[api]);
      log('All required available:', allRequiredAvailable);

      setAvailability(newAvailability);

      if (!allRequiredAvailable && redirectOnUnavailable) {
        log('Redirecting to installation page...');
        router.replace('/installation');
      }

      return allRequiredAvailable;
    } catch (error) {
      console.error('Error checking API availability:', error);
      setAvailability({
        languageModel: false,
        summarizer: false,
        writer: false,
        languageDetector: false,
        translator: false,
        isChecking: false,
      });
      if (redirectOnUnavailable) {
        router.replace('/installation');
      }
      return false;
    }
  };

  useEffect(() => {
    // Add a small delay to ensure component is mounted
    const timer = setTimeout(() => {
      checkAvailability();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const isAllRequiredAvailable = requiredApis.every(api => availability[api]);

  return {
    availability,
    isAllRequiredAvailable,
    isChecking: availability.isChecking,
    recheckAvailability: () => {
      hasChecked.current = false;
      checkAvailability();
    },
  };
};