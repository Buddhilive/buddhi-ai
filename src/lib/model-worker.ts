import { env, AutoModelForCausalLM, AutoTokenizer } from '@huggingface/transformers'

env.allowLocalModels = false

self.onmessage = async (event: MessageEvent) => {
  const { type, modelId, dtype } = event.data

  if (type === 'START') {
    try {
      const progressCallback = (progress: unknown) => {
        self.postMessage({ type: 'PROGRESS', file: progress })
      }

      // Load tokenizer
      await AutoTokenizer.from_pretrained(modelId, {
        progress_callback: progressCallback,
      })

      // Load model
      await AutoModelForCausalLM.from_pretrained(modelId, {
        dtype: dtype || 'q4f16',
        progress_callback: progressCallback,
      })

      self.postMessage({ type: 'COMPLETE' })
    } catch (error: unknown) {
      console.error("Worker Error:", error)
      const errMessage = error instanceof Error ? error.message : "An error occurred during download."
      self.postMessage({ type: 'ERROR', message: errMessage })
    }
  } else if (type === 'CHECK_CACHE') {
    try {
      let isCached = false
      if ('caches' in self) {
        const cache = await caches.open('transformers-cache')
        const keys = await cache.keys()
        // Simple heuristic: if we have multiple files matching the modelId in the cache
        const modelKeys = keys.filter(req => req.url.includes(modelId))
        
        // A typical model has at least a config.json, tokenizer.json, and the .onnx file
        isCached = modelKeys.length >= 3
      }
      self.postMessage({ type: 'CACHE_STATUS', isCached })
    } catch (error) {
      console.error("Cache Check Error:", error)
      self.postMessage({ type: 'CACHE_STATUS', isCached: false })
    }
  }
}
