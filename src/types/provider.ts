import { BuddhiAILanguageModel } from "@/lib/buddhi-ai-language-model";
import { ProviderV2 } from "@ai-sdk/provider";

export interface BuddhiAIProviderSettings {
  generateId?: string;
}

export interface BuddhiAIChatSettings extends LanguageModelCreateOptions {
  /**
   * Expected input types for the session, for multimodal inputs.
   */
  expectedInputs?: Array<{
    type: LanguageModelMessageType;
    languages?: string[];
  }>;
}

export interface BuddhiAIProvider extends ProviderV2 {
  (modelId: string, settings?: BuddhiAIChatSettings): BuddhiAILanguageModel;

  // Add specific methods for different model types
  languageModel(
    modelId: string,
    settings?: BuddhiAIChatSettings,
  ): BuddhiAILanguageModel;
}

export type BuddhiAIChatModelId = string;

export type BuiltInAIConfig = {
  provider: string;
  modelId: BuddhiAIChatModelId;
  options: BuddhiAIChatSettings;
};