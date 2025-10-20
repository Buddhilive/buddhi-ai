import { BuddhiAILanguageModel } from './buddhi-ai-language-model';
import { BuddhiAIChatModelId, BuddhiAIChatSettings, BuddhiAIProvider, BuddhiAIProviderSettings } from '@/types/provider';
import { NoSuchModelError } from '@ai-sdk/provider';

export function createBuddhiAI(
  options: BuddhiAIProviderSettings = {},
): BuddhiAIProvider {
  const createChatModel = (
    modelId: BuddhiAIChatModelId,
    settings?: BuddhiAIChatSettings,
  ) => {
    return new BuddhiAILanguageModel(modelId, settings);
  };

  const provider = function (
    modelId: BuddhiAIChatModelId = "text",
    settings?: BuddhiAIChatSettings,
  ) {
    if (new.target) {
      throw new Error(
        "The BuiltInAI model function cannot be called with the new keyword.",
      );
    }

    return createChatModel(modelId, settings);
  };

  provider.languageModel = createChatModel;
  provider.chat = createChatModel;

  provider.imageModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: "imageModel" });
  };

  provider.speechModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: "speechModel" });
  };

  provider.transcriptionModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: "transcriptionModel" });
  };

  provider.textEmbeddingModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: "textEmbeddingModel" });
  };

  return provider;
}

// Export default provider instance
export const buddhiAIModel = createBuddhiAI();