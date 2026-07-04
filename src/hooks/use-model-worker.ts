import { useEffect, useRef, useCallback } from 'react'
import { useModelStore } from '@/lib/model-state'

const MODEL_ID = 'onnx-community/gemma-4-E2B-it-ONNX'
const DTYPE = 'q4f16'

export function useModelWorker() {
  const workerRef = useRef<Worker | null>(null)
  const hasCheckedCache = useRef(false)
  const store = useModelStore()

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../lib/model-worker.ts', import.meta.url), {
        type: 'module'
      })

      workerRef.current.onmessage = (event) => {
        const { type, file, message, isCached } = event.data

        // Always read the freshest state inside this event listener
        const currentStatus = useModelStore.getState().status

        switch (type) {
          case 'PROGRESS':
            if (file.status === 'progress' || file.status === 'downloading' || file.status === 'loaded') {
              store.updateFileProgress({
                name: file.name || file.file,
                loaded: file.loaded || 0,
                total: file.total || 0,
                progress: file.progress || 0
              })
            } else if (file.status === 'done') {
              store.updateFileProgress({
                name: file.name || file.file,
                loaded: file.total || 0,
                total: file.total || 0,
                progress: 100
              })
            }
            break
          case 'COMPLETE':
            console.log('[useModelWorker] Download complete')
            store.setStatus('complete')
            break
          case 'ERROR':
            console.error('[useModelWorker] Worker error:', message)
            store.setError(message)
            break
          case 'CACHE_STATUS':
            console.log(`[useModelWorker] Cache check received: isCached=${isCached}, currentStatus=${currentStatus}`)
            if (isCached && (currentStatus === 'checking' || currentStatus === 'idle')) {
              store.setStatus('complete')
            } else if (!isCached && currentStatus === 'checking') {
              store.setStatus('idle')
            }
            break
        }
      }
    }
    return workerRef.current
  }, [store])

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    // Prevent infinite loop by checking cache only once per mount
    if (store.status === 'idle' && !hasCheckedCache.current) {
      console.log('[useModelWorker] Initiating cache check...')
      hasCheckedCache.current = true
      store.setStatus('checking')
      const worker = getWorker()
      worker.postMessage({ type: 'CHECK_CACHE', modelId: MODEL_ID })
    }
  }, [store.status, store, getWorker])

  const startDownload = useCallback(() => {
    console.log('[useModelWorker] Starting download...')
    if (store.status === 'error' || store.status === 'cancelled') {
      store.resetState()
    }
    store.setStatus('downloading')
    const worker = getWorker()
    worker.postMessage({ type: 'START', modelId: MODEL_ID, dtype: DTYPE })
  }, [getWorker, store])

  const cancelDownload = useCallback(() => {
    console.log('[useModelWorker] Cancelling download...')
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    store.setStatus('cancelled')
  }, [store])

  return {
    startDownload,
    cancelDownload,
    status: store.status,
    overallProgress: store.overallProgress,
    files: store.files,
    error: store.error
  }
}
