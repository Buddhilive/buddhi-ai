import { env, AutoModelForCausalLM, AutoTokenizer } from '@huggingface/transformers'

env.allowLocalModels = false

self.onmessage = async (event: MessageEvent) => {
  const { type, modelId, dtype } = event.data

  if (type === 'START') {
    try {
      console.log(`[Worker] Starting model download for: ${modelId} (${dtype})`)
      const progressCallback = (progress: unknown) => {
        self.postMessage({ type: 'PROGRESS', file: progress })
      }

      console.log(`[Worker] Loading tokenizer...`)
      await AutoTokenizer.from_pretrained(modelId, {
        progress_callback: progressCallback,
      })

      console.log(`[Worker] Loading model (dtype: ${dtype || 'q4f16'})...`)
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
      console.log(`[Worker] Checking cache for model: ${modelId}...`)
      let isCached = false
      if ('caches' in self) {
        const cache = await caches.open('transformers-cache')
        const keys = await cache.keys()
        
        const modelKeys = keys.filter(req => req.url.includes(modelId))
        
        isCached = modelKeys.length >= 3
        console.log(`[Worker] Cache check result: ${isCached} (found ${modelKeys.length} matching files in transformers-cache)`)
      } else {
        console.warn(`[Worker] Cache API not available in this browser environment.`)
      }
      self.postMessage({ type: 'CACHE_STATUS', isCached })
    } catch (error) {
      console.error("Cache Check Error:", error)
      self.postMessage({ type: 'CACHE_STATUS', isCached: false })
    }
  }
}
