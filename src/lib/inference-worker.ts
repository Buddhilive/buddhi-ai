import { env, AutoModelForCausalLM, AutoTokenizer, TextStreamer, PreTrainedModel, PreTrainedTokenizer } from '@huggingface/transformers'

env.allowLocalModels = false;

// We use browser cache as populated by the model worker
env.useBrowserCache = true;

// Define message interfaces
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

let model: PreTrainedModel | null = null;
let tokenizer: PreTrainedTokenizer | null = null;

self.onmessage = async (event: MessageEvent) => {
  const { type, messages, modelId, dtype } = event.data;

  if (type === 'GENERATE') {
    try {
      if (!model || !tokenizer) {
        console.log(`[Inference Worker] Loading tokenizer...`);
        tokenizer = await AutoTokenizer.from_pretrained(modelId);

        console.log(`[Inference Worker] Loading model (dtype: ${dtype || 'q4f16'})...`);
        model = await AutoModelForCausalLM.from_pretrained(modelId, {
          dtype: dtype || 'q4f16',
          device: 'webgpu',
        });
      }

      console.log(`[Inference Worker] Model ready. Applying chat template...`);
      
      const inputs = tokenizer.apply_chat_template(messages, {
        add_generation_prompt: true,
        return_dict: true,
      });

      const streamer = new TextStreamer(tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
          self.postMessage({ type: 'TOKEN', token: text });
        }
      });

      console.log(`[Inference Worker] Starting generation...`);
      // Perform generation
      await model.generate({
        ...inputs,
        max_new_tokens: 512,
        streamer: streamer,
      });

      self.postMessage({ type: 'GENERATION_COMPLETE' });
    } catch (error: unknown) {
      console.error("[Inference Worker] Error:", error);
      const errMessage = error instanceof Error ? error.message : "An error occurred during generation.";
      self.postMessage({ type: 'GENERATION_ERROR', message: errMessage });
    }
  }
};
