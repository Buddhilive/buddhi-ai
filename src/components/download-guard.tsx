"use client"

import React from 'react'
import { useNavigationGuard } from '@/hooks/use-navigation-guard'

export function DownloadGuard({ children }: { children: React.ReactNode }) {
  const { showModal, confirmNavigation, cancelNavigation } = useNavigationGuard()

  return (
    <>
      {children}
      
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-2xl border border-border/50 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-semibold text-foreground mb-2">Cancel Download?</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              A model download is currently in progress. Navigating away will cancel the ongoing download. 
              Are you sure you want to leave?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelNavigation}
                className="px-4 py-2 text-sm font-medium rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors"
              >
                Stay on Page
              </button>
              <button
                onClick={confirmNavigation}
                className="px-4 py-2 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Leave & Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
