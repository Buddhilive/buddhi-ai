"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Copy, Sparkles, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MediaPipeChatTransport } from "@/lib/buddhi-ai-core/chat-api";
import { useLiteRTModelStore } from "@/stores/litert-store";
import {
  PROMPT_CATEGORIES,
  TARGET_MODELS,
  PROMPT_TECHNIQUES,
} from "@/const/prompt-builder-data";

export function PromptBuilderSession() {
  const { liteRTModelInstance } = useLiteRTModelStore();

  const [selectedCategory, setSelectedCategory] = useState(
    PROMPT_CATEGORIES[0]
  );
  const [selectedModel, setSelectedModel] = useState(TARGET_MODELS[0]);
  const [selectedTechnique, setSelectedTechnique] = useState(
    PROMPT_TECHNIQUES[0]
  );
  const [userIntent, setUserIntent] = useState("");

  const [isCopied, setIsCopied] = useState(false);

  // Initialize transport when model is ready
  const transport = useMemo(() => {
    if (!liteRTModelInstance) return undefined;
    return new MediaPipeChatTransport(liteRTModelInstance, "gemma4");
  }, [liteRTModelInstance]);

  const { messages, setMessages, sendMessage, status, stop } = useChat({
    transport,
  });

  // Calculate generated prompt on the fly from the latest assistant message
  let generatedPrompt = "";
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "assistant") {
      const textPart = lastMessage.parts.find((p) => p.type === "text");
      if (textPart?.type === "text") {
        generatedPrompt = textPart.text;
      }
    }
  }

  const handleGenerate = async () => {
    if (!userIntent.trim() || status === "submitted" || status === "streaming")
      return;

    // Reset previous generation
    setMessages([]);

    const systemInstruction = `You are an expert prompt engineer.

Task: Transform the user's raw intent into an optimized, production-ready prompt.

Constraints:
- Output ONLY the final optimized prompt — no explanation, no preamble.
- Preserve the user's original intent exactly.
- Do not add tasks the user didn't ask for.

Context:
- Prompt category: ${selectedCategory.categoryHint}
- Target AI model: ${selectedModel.label}. Formatting guidance: ${selectedModel.formatGuide}
- Prompting technique: ${selectedTechnique.techniqueHint}

User's raw intent:
"""
${userIntent}
"""`;

    // Send the system instruction as the user message for a single turn
    sendMessage({ text: systemInstruction });
  };

  const handleCopy = async () => {
    if (!generatedPrompt) return;
    await navigator.clipboard.writeText(generatedPrompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Prompt Builder</h1>
        <p className="text-muted-foreground">
          Turn your ideas into optimized, production-ready prompts using
          proven prompt engineering techniques.
        </p>
      </div>

      {/* 1. Category Selection */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
            1
          </span>
          Select Use Case
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {PROMPT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory.id === cat.id;
            return (
              <Card
                key={cat.id}
                className={`cursor-pointer transition-all hover:bg-muted/50 ${
                  isSelected ? "ring-2 ring-[#e05d38] border-transparent" : ""
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                <CardHeader className="p-4 gap-2">
                  <Icon
                    className={`h-5 w-5 ${
                      isSelected ? "text-[#e05d38]" : "text-muted-foreground"
                    }`}
                  />
                  <div>
                    <CardTitle className="text-sm">{cat.label}</CardTitle>
                    <CardDescription className="text-xs mt-1 line-clamp-2">
                      {cat.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 2. Target Model & Technique */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
              2
            </span>
            Target AI App
          </h2>
          <div className="flex bg-muted/50 p-1 rounded-lg w-fit">
            {TARGET_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  selectedModel.id === model.id
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {model.badge}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-hidden">
          <h2 className="text-lg font-semibold flex items-center gap-2 shrink-0">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
              3
            </span>
            Prompting Technique
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
            {PROMPT_TECHNIQUES.map((tech) => (
              <button
                key={tech.id}
                onClick={() => setSelectedTechnique(tech)}
                className={`snap-start shrink-0 px-3 py-1.5 text-sm rounded-full border transition-all ${
                  selectedTechnique.id === tech.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {tech.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Raw Intent */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
            4
          </span>
          Your Intent
        </h2>
        <div className="relative">
          <Textarea
            value={userIntent}
            onChange={(e) => setUserIntent(e.target.value)}
            placeholder="Describe what you want the AI to do..."
            className="min-h-[120px] resize-y pb-8"
            maxLength={1000}
          />
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {userIntent.length}/1000
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={
              !userIntent.trim() ||
              status === "submitted" ||
              status === "streaming" ||
              !transport
            }
            className="w-full sm:w-auto bg-[#e05d38] hover:bg-[#c94b2a] text-white"
          >
            {(status === "submitted" || status === "streaming") ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Optimized Prompt
              </>
            )}
          </Button>
          {(status === "submitted" || status === "streaming") && (
            <Button
              variant="ghost"
              onClick={stop}
              className="ml-2 text-muted-foreground"
            >
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* 5. Generated Output */}
      <AnimatePresence mode="popLayout">
        {(generatedPrompt ||
          status === "submitted" ||
          status === "streaming") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col gap-4 mt-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Optimized Prompt</h2>
              {generatedPrompt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {isCopied ? "Copied!" : "Copy"}
                </Button>
              )}
            </div>

            <div className="relative">
              {status === "streaming" && !generatedPrompt && (
                <div className="absolute inset-0 bg-muted/20 animate-pulse rounded-md" />
              )}
              <Textarea
                readOnly
                value={generatedPrompt}
                className="min-h-[200px] font-mono text-sm resize-none bg-muted/30"
                placeholder={
                  status === "submitted" || status === "streaming"
                    ? "Generating prompt..."
                    : ""
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
