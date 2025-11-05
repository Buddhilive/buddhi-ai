"use client";

import { Button } from "@/components/ui/button";
import { Copy, FileText, Languages, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { getSummarizer, isSummarizerAvailable } from "@/lib/summarizer";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getLanguageDetector,
  getTranslator,
  isLanguageDetectorAvailable,
  isTranslatorAvailable,
} from "@/lib/translator";
import { LANGUAGE_CODE_MAP } from "@/const/language-code";
import { SettingsDialog, SettingsFormData } from "@/components/settings-dialog";
import { useApiAvailability } from "@/hooks/use-api-availability";

export default function SummarizerPage() {
  // Check API availability and redirect if not available
  const { isAllRequiredAvailable, isChecking } = useApiAvailability({
    requiredApis: ['summarizer', 'languageDetector'],
    redirectOnUnavailable: true,
  });
  const [originalText, setOriginalText] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [settings, setSettings] = useState<SettingsFormData>({
    originalTextContext: "",
    summaryContext: "",
    type: "key-points",
    format: "markdown",
    length: "medium",
  });

  const handleSummarize = async () => {
    setIsLoading(true);
    const isAvailable = await isSummarizerAvailable();
    if (!isAvailable) {
      toast.error("Summarizer is not available");
      setIsLoading(false);
      return;
    }

    try {
      const summarizer = await getSummarizer({
        sharedContext: settings.originalTextContext || "",
        type: settings.type || "key-points",
        format: settings.format || "markdown",
        length: settings.length || "medium",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        monitor(m: any) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          m.addEventListener("downloadprogress", (e: any) => {
            console.log("Summarization progress:", `${e.loaded * 100}%`);
          });
        },
      });

      const summary = await summarizer.summarize(originalText, {
        context: settings.summaryContext || "",
      });
      setSummaryText(summary);
      setIsLoading(false);
    } catch (error) {
      console.error("Error during summarization:", error);
      toast.error("An error occurred during summarization.");
      setIsLoading(false);
    }
  };

  const handleSourceTextChange = async (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setOriginalText(e.target.value);
    setSummaryText("");

    const isAvailable = await isLanguageDetectorAvailable();
    if (!isAvailable) {
      toast.error("Language detector is not available");
      return;
    }

    try {
      const detector = await getLanguageDetector({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        monitor(m: any) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          m.addEventListener("downloadprogress", (e: any) => {
            console.log(
              "Language detector download progress:",
              `${e.loaded * 100}%`
            );
          });
        },
      });
      const detectedLanguages = await detector.detect(e.target.value);
      console.log("Detected languages:", detectedLanguages);
      setDetectedLanguage(detectedLanguages[0].detectedLanguage);
      setTargetLanguage(detectedLanguages[0].detectedLanguage);
    } catch (error) {
      console.error("Error initializing language detector:", error);
      toast.error(
        "An error occurred while initializing the language detector."
      );
    }
  };

  const handleTranslate = async () => {
    console.log("Translating to:", targetLanguage);
    if (detectedLanguage === targetLanguage) {
      toast.info(
        "Source and target languages are the same. No translation needed."
      );
      return;
    }

    try {
      const isAvailable = await isTranslatorAvailable(
        detectedLanguage,
        targetLanguage
      );

      if (!isAvailable) {
        toast.error("Translator is not available for the selected languages");
        return;
      }

      setIsTranslating(true);

      const translator = await getTranslator({
        sourceLanguage: detectedLanguage,
        targetLanguage: targetLanguage,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        monitor(m: any) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          m.addEventListener("downloadprogress", (e: any) => {
            console.log("Translator download progress:", `${e.loaded * 100}%`);
          });
        },
      });

      const translatedText = await translator.translate(originalText);
      setSummaryText(translatedText);
      setIsTranslating(false);
    } catch (error) {
      console.error("Error checking translator availability:", error);
      setIsTranslating(false);
    }
  };

  const handleSettingsSave = (data: SettingsFormData) => {
    console.log("Settings saved:", data);
    setSettings(data);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-58px)] bg-background">
      {/* Show loading state while checking API availability */}
      {isChecking && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Checking API availability...</p>
          </div>
        </div>
      )}

      {/* Main content - only show when APIs are available and not checking */}
      {!isChecking && isAllRequiredAvailable && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-lg font-semibold text-foreground">
                Document Summarizer
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {summaryText && (
                <div className="border-r-2 px-2 flex items-center justify-between gap-2">
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LANGUAGE_CODE_MAP).map(([code, name]) => (
                        <SelectItem key={code} value={code}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    className="flex items-center gap-2"
                    onClick={handleTranslate}
                    disabled={isTranslating || isLoading}
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <Languages className="h-4 w-4" />
                        Translate
                      </>
                    )}
                  </Button>
                </div>
              )}
              <Button
                className="flex items-center gap-2"
                onClick={handleSummarize}
                disabled={isLoading || isTranslating}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Summarizing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Summarize
                  </>
                )}
              </Button>
              <SettingsDialog
                onSave={handleSettingsSave}
                defaultValues={settings}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex gap-4 p-4 min-h-0">
            {/* Left Section - Input Text */}
            <div className="flex-1 flex flex-col">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">
                Original Text
              </h2>
              <div className="flex-1 relative">
                <Textarea
                  disabled={isLoading}
                  value={originalText}
                  onInput={handleSourceTextChange}
                  placeholder="Paste or type your text here to summarize..."
                  className="h-full resize-none border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Section - Summarized Content */}
            <div className="flex-1 flex flex-col">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">
                AI Summary
              </h2>
              <div className="flex-1 relative">
                <Textarea
                  value={summaryText}
                  placeholder="Your AI-generated summary will appear here..."
                  className="h-full resize-none border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                  readOnly
                />
                {/* Floating Copy Button */}
                {summaryText && (
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Copy"
                    onClick={() => {
                      navigator.clipboard.writeText(summaryText);
                      toast.info("Content copied to clipboard");
                    }}
                    className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90 border border-border"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
