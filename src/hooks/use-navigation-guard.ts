import { useEffect, useState, useCallback } from 'react'
import { useModelStore } from '@/lib/model-state'
import { useRouter } from 'next/navigation'

export function useNavigationGuard() {
  const status = useModelStore(state => state.status)
  const isGuardActive = status === 'downloading'
  const router = useRouter()
  
  const [showModal, setShowModal] = useState(false)
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isGuardActive) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = '' // Required by Chrome
      return '' // Required by older browsers
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Monkey patch history methods to intercept Next.js router transitions
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type HistoryArgs = [data: any, unused: string, url?: string | URL | null | undefined]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptNavigation = (url: string | URL | null | undefined, originalMethod: (data: any, unused: string, url?: string | URL | null | undefined) => void, args: HistoryArgs) => {
      const targetUrl = typeof url === 'string' ? url : url?.toString() || ''
      const currentUrl = window.location.pathname + window.location.search

      // Allow hash changes or same URL
      if (targetUrl === currentUrl || targetUrl.startsWith('#') || !targetUrl) {
        originalMethod.apply(window.history, args)
        return
      }

      setShowModal(true)
      setPendingUrl(targetUrl)
    }

    window.history.pushState = function(...args: HistoryArgs) {
      interceptNavigation(args[2], originalPushState, args)
    }
    
    window.history.replaceState = function(...args: HistoryArgs) {
      interceptNavigation(args[2], originalReplaceState, args)
    }

    // Attempt to handle back/forward buttons (not perfect, but covers the UI)
    const handlePopState = () => {
      setShowModal(true)
      // Push state back immediately to "cancel" the pop and trap the user
      originalPushState.call(window.history, null, '', window.location.href)
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isGuardActive])

  const confirmNavigation = useCallback(() => {
    setShowModal(false)
    useModelStore.getState().setStatus('cancelled')
    
    if (pendingUrl) {
      router.push(pendingUrl)
    } else {
      router.back()
    }
  }, [pendingUrl, router])

  const cancelNavigation = useCallback(() => {
    setShowModal(false)
    setPendingUrl(null)
  }, [])

  return { showModal, confirmNavigation, cancelNavigation }
}
