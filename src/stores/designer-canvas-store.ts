import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type CanvasViewportPreset = "desktop" | "tablet" | "mobile";

export const VIEWPORT_DIMENSIONS: Record<CanvasViewportPreset, { width: number; label: string }> = {
    desktop: { width: 1440, label: "Desktop (1440px)" },
    tablet: { width: 768, label: "Tablet (768px)" },
    mobile: { width: 375, label: "Mobile (375px)" },
};

interface DesignerCanvasState {
    activeCode: string;
    viewport: CanvasViewportPreset;
    zoom: number;
    isExportOpen: boolean;
    isAssetDrawerOpen: boolean;
    isCanvasVisible: boolean;

    setActiveCode: (code: string) => void;
    setViewport: (viewport: CanvasViewportPreset) => void;
    setZoom: (zoom: number) => void;
    setIsExportOpen: (open: boolean) => void;
    setIsAssetDrawerOpen: (open: boolean) => void;
    setIsCanvasVisible: (visible: boolean) => void;
    reset: () => void;
}

const DEFAULT_STARTER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buddhi Design Canvas</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen flex items-center justify-center p-8 selection:bg-indigo-500 selection:text-white">
  <div class="max-w-md w-full p-8 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-2xl text-center space-y-4">
    <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
    </div>
    <h1 class="text-2xl font-semibold tracking-tight">Client-Side AI Designer Ready</h1>
    <p class="text-sm text-zinc-400 leading-relaxed">
      Ask Buddhi to design a landing page, hero section, or component. Your generated design will render live on this canvas in real time.
    </p>
    <div class="pt-2 flex items-center justify-center gap-2 text-xs text-zinc-500">
      <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      Gemma 4 E2B WebGPU Powered
    </div>
  </div>
</body>
</html>`;

export const useDesignerCanvasStore = create<DesignerCanvasState>()(
    devtools((set) => ({
        activeCode: DEFAULT_STARTER_HTML,
        viewport: "desktop",
        zoom: 100,
        isExportOpen: false,
        isAssetDrawerOpen: false,
        isCanvasVisible: true,

        setActiveCode: (code: string) => set({ activeCode: code }),
        setViewport: (viewport: CanvasViewportPreset) => set({ viewport }),
        setZoom: (zoom: number) => set({ zoom }),
        setIsExportOpen: (open: boolean) => set({ isExportOpen: open }),
        setIsAssetDrawerOpen: (open: boolean) => set({ isAssetDrawerOpen: open }),
        setIsCanvasVisible: (visible: boolean) => set({ isCanvasVisible: visible }),
        reset: () => set({ activeCode: DEFAULT_STARTER_HTML, viewport: "desktop", zoom: 100 }),
    }))
);
