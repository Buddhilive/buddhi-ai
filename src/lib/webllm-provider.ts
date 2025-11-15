import {
  CreateWebWorkerMLCEngine,
  InitProgressCallback,
  MLCEngineInterface,
} from "@mlc-ai/web-llm";

// Check if WebLLM is supported in the current environment
const isWebLLMSupported = async (): Promise<boolean> => {
  if (!(navigator as any).gpu) {
    console.log("WebGPU is not supported in this browser.");
    return false;
  }

  const adapter = await (navigator as any).gpu.requestAdapter();
  if (!adapter) {
    console.log("Couldn't find a suitable WebGPU adapter.");
    return false;
  }

  console.log("WebGPU is supported and an adapter was found.");
  return true;
};

const initWebLLMEngine = async (
  progressCallback?: InitProgressCallback
): Promise<MLCEngineInterface> => {
  // Check browser support first
  if (!isWebLLMSupported()) {
    throw new Error(
      "WebLLM is not supported in this environment. Please ensure you're using a modern browser with WebGPU support."
    );
  }

  try {
    // Use a smaller model or different configuration to avoid memory issues
    const engine = await CreateWebWorkerMLCEngine(
      new Worker(new URL("@/workers/webllm-worker.ts", import.meta.url), {
        type: "module",
      }),
      "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      {
        initProgressCallback: ({ progress, text, timeElapsed }) => {
          progressCallback?.({ progress, text, timeElapsed });
          // Only log in development
          if (process.env.NODE_ENV === "development") {
            console.log(
              `Initialization Progress: ${(progress * 100).toFixed(
                2
              )}% - ${text} - Elapsed Time: ${timeElapsed.toFixed(2)}s`
            );
          }
        },
      }
    );

    return engine;
  } catch (error) {
    console.error("Error initializing WebLLM engine:", error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("memory access out of bounds")) {
        throw new Error(
          "WebLLM initialization failed due to insufficient memory. Please try refreshing the page or using a device with more available memory."
        );
      }
      if (error.message.includes("WebGPU")) {
        throw new Error(
          "WebGPU is not available or supported in your browser. Please use Chrome, Edge, or another WebGPU-compatible browser."
        );
      }
    }

    throw error;
  }
};

export { initWebLLMEngine, isWebLLMSupported };
