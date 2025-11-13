import {
  CreateMLCEngine,
  InitProgressCallback,
  MLCEngine,
} from "@mlc-ai/web-llm";

const initWebLLMEngine = async (
  progressCallback?: InitProgressCallback
): Promise<MLCEngine> => {
  try {
    const engine = await CreateMLCEngine("Llama-3.2-3B-Instruct-q4f16_1-MLC", {
      initProgressCallback: ({ progress, text, timeElapsed }) => {
        progressCallback?.({ progress, text, timeElapsed });
        console.log(
          `Initialization Progress: ${(progress * 100).toFixed(
            2
          )}% - ${text} - Elapsed Time: ${timeElapsed.toFixed(2)}s`
        );
      },
    });
    return engine;
  } catch (error) {
    console.error("Error initializing WebLLM engine:", error);
    throw error;
  }
};

export { initWebLLMEngine };
