"use client"

import React, { useEffect, useState } from 'react'
import { useModelWorker } from '@/hooks/use-model-worker'
import { DownloadIcon, HardDriveIcon, Loader2Icon, PlayIcon, XIcon, CheckCircle2Icon, AlertTriangleIcon, CpuIcon, AlertCircleIcon, RotateCcwIcon } from 'lucide-react'
import Link from 'next/link'

export default function DownloadPage() {
  const { status, overallProgress, files, error, startDownload, cancelDownload } = useModelWorker()
  const [hasWebGPU, setHasWebGPU] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    if ('gpu' in navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).gpu.requestAdapter().then((adapter: any) => {
        if (active) setHasWebGPU(!!adapter)
      }).catch(() => {
        if (active) setHasWebGPU(false)
      })
    } else {
      setTimeout(() => {
        if (active) setHasWebGPU(false)
      }, 0)
    }
    return () => { active = false }
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const renderWebGPUWarning = () => {
    if (hasWebGPU === false && (status === 'idle' || status === 'error' || status === 'cancelled')) {
      return (
        <div className="mb-6 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
          <AlertTriangleIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200/90 leading-relaxed">
            <span className="font-semibold block mb-1 text-amber-500">Running on WASM (CPU)</span>
            Your browser doesn&apos;t support WebGPU. The model will run on CPU (WASM) — performance will be significantly slower.
          </div>
        </div>
      )
    }
    return null
  }

  const renderBadge = () => {
    if (hasWebGPU) {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500 border border-emerald-500/20">
          <CpuIcon className="w-3.5 h-3.5" />
          WebGPU Accelerated
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 min-h-[calc(100vh-4rem)] bg-background">
      <div className="w-full max-w-2xl">
        {renderWebGPUWarning()}

        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background/40 backdrop-blur-xl shadow-2xl p-8 before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none">
          
          <div className="relative z-10 flex flex-col items-center text-center">
            
            {/* Header Icon */}
            <div className="mb-6 rounded-full bg-primary/10 p-4 ring-1 ring-primary/20">
              {status === 'complete' ? (
                <CheckCircle2Icon className="w-8 h-8 text-primary" />
              ) : status === 'error' ? (
                <AlertCircleIcon className="w-8 h-8 text-destructive" />
              ) : (
                <HardDriveIcon className="w-8 h-8 text-primary" />
              )}
            </div>

            {/* Title & Desc */}
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
              Gemma 4 E2B (Q4F16)
            </h1>
            <p className="text-muted-foreground mb-6 max-w-md">
              A powerful open model by Google, quantized for local browser execution.
            </p>

            {/* Capability Badge */}
            {['idle', 'complete', 'error', 'cancelled'].includes(status) && (
              <div className="mb-8">
                {renderBadge()}
              </div>
            )}

            {/* STATES */}
            
            {status === 'checking' && (
              <div className="flex flex-col items-center gap-4 py-8 animate-in fade-in duration-300">
                <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Checking cache...</span>
              </div>
            )}

            {(status === 'idle' || status === 'cancelled') && (
              <div className="w-full max-w-sm flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
                <button
                  onClick={startDownload}
                  className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <DownloadIcon className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                  {status === 'cancelled' ? 'Resume Download' : 'Download Model'}
                </button>
                <div className="text-xs text-muted-foreground">
                  Approx ~1.5GB total download size.
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="w-full flex flex-col items-center gap-6 animate-in slide-in-from-bottom-4 duration-300">
                <div className="text-sm font-medium text-destructive bg-destructive/10 px-4 py-3 rounded-lg border border-destructive/20 w-full max-w-md break-words">
                  {error || "An unknown error occurred."}
                </div>
                <button
                  onClick={startDownload}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <RotateCcwIcon className="w-4 h-4" />
                  Retry Download
                </button>
              </div>
            )}

            {status === 'downloading' && (
              <div className="w-full flex flex-col gap-8 animate-in fade-in duration-500">
                
                {/* Overall Progress Ring & Stats */}
                <div className="flex items-center gap-6 px-4">
                  {/* CSS Circle Progress */}
                  <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="8" 
                        strokeDasharray={282.74}
                        strokeDashoffset={282.74 - (282.74 * overallProgress) / 100}
                        strokeLinecap="round"
                        className="text-primary transition-all duration-300 ease-out" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold">{Math.round(overallProgress)}%</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-start text-left flex-1">
                    <span className="font-medium text-foreground text-lg mb-1">Downloading Model</span>
                    {hasWebGPU ? (
                       <span className="text-[10px] font-medium tracking-wide uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">WebGPU Backend Active</span>
                    ) : (
                       <span className="text-[10px] font-medium tracking-wide uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">WASM Backend Active</span>
                    )}
                  </div>
                  
                  <button
                    onClick={cancelDownload}
                    className="p-2.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors group"
                    title="Cancel Download"
                  >
                    <XIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                </div>

                {/* Per-file Progress */}
                <div className="flex flex-col gap-3 bg-muted/30 rounded-xl p-4 max-h-[240px] overflow-y-auto">
                  {files.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">Initializing files...</div>
                  ) : (
                    files.map((file, i) => (
                      <div key={file.name + i} className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground truncate max-w-[200px]" title={file.name}>{file.name}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {formatBytes(file.loaded)} / {formatBytes(file.total)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
                          <div 
                            className="h-full bg-primary/80 transition-all duration-300 ease-out"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {status === 'complete' && (
              <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
                <div className="text-sm text-muted-foreground">
                  Model is safely cached in your browser.
                </div>
                <Link
                  href="/app"
                  className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <PlayIcon className="w-4 h-4" />
                  Start Chat
                </Link>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
