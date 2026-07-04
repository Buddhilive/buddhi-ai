import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type DownloadStatus = 'idle' | 'checking' | 'downloading' | 'complete' | 'error' | 'cancelled'

export interface FileProgress {
  name: string
  loaded: number
  total: number
  progress: number // 0-100
}

interface ModelState {
  status: DownloadStatus
  overallProgress: number
  files: FileProgress[]
  error: string | null
  
  setStatus: (status: DownloadStatus) => void
  updateFileProgress: (file: FileProgress) => void
  setError: (error: string) => void
  resetState: () => void
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      status: 'idle',
      overallProgress: 0,
      files: [],
      error: null,

      setStatus: (status) => set({ status }),
      
      updateFileProgress: (fileProgress) => set((state) => {
        const existingFileIndex = state.files.findIndex(f => f.name === fileProgress.name)
        const newFiles = [...state.files]
        
        if (existingFileIndex >= 0) {
          newFiles[existingFileIndex] = fileProgress
        } else {
          newFiles.push(fileProgress)
        }
        
        // Calculate overall progress across all tracked files
        const totalLoaded = newFiles.reduce((acc, f) => acc + f.loaded, 0)
        const totalSize = newFiles.reduce((acc, f) => acc + f.total, 0)
        const overallProgress = totalSize > 0 ? (totalLoaded / totalSize) * 100 : 0
        
        return {
          files: newFiles,
          overallProgress: isNaN(overallProgress) ? 0 : overallProgress
        }
      }),

      setError: (error) => set({ error, status: 'error' }),
      
      resetState: () => set({
        status: 'idle',
        overallProgress: 0,
        files: [],
        error: null
      })
    }),
    {
      name: 'model-download-storage',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('an error happened during hydration', error)
          } else {
            // If we rehydrate while it was "downloading", mark it cancelled
            // because the worker is gone and we need to restart/resume
            if (state?.status === 'downloading') {
              state.setStatus('cancelled')
            }
          }
        }
      }
    }
  )
)
