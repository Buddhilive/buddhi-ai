import {
  generateId
} from '@ai-sdk/provider-utils';
import { BuddhiAILanguageModel } from './buddhi-ai-language-model';
import { BuddhiAIChatSettings, BuddhiAIProvider, BuddhiAIProviderSettings } from '@/types/provider';

// Factory function to create provider instance
function createCustom(options: BuddhiAIProviderSettings = {}): BuddhiAIProvider {
  const createChatModel = (
    modelId: string,
    settings: BuddhiAIChatSettings = {},
  ) =>
    new BuddhiAILanguageModel(modelId, settings);

  const provider = function (modelId: string, settings?: BuddhiAIChatSettings) {
    if (new.target) {
      throw new Error(
        'The model factory function cannot be called with the new keyword.',
      );
    }

    return createChatModel(modelId, settings);
  };

  provider.languageModel = createChatModel;

  return provider as BuddhiAIProvider;
}

// Export default provider instance
const custom = createCustom();