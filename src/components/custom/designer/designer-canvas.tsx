"use client";

import { useMemo } from "react";
import { ViewportToolbar } from "./viewport-toolbar";
import { CodeExportModal } from "./code-export-modal";
import { AssetDropzone } from "./asset-dropzone";
import {
    useDesignerCanvasStore,
    VIEWPORT_DIMENSIONS,
} from "@/stores/designer-canvas-store";
import {
    WebPreview,
    WebPreviewBody,
} from "@/components/ai-elements/web-preview";

export function DesignerCanvas() {
    const { activeCode, viewport, zoom } = useDesignerCanvasStore();

    const targetWidth = useMemo(() => {
        return VIEWPORT_DIMENSIONS[viewport].width;
    }, [viewport]);

    return (
        <div className="flex h-full w-full flex-col bg-zinc-950/40 select-none overflow-hidden">
            {/* Top Toolbar */}
            <ViewportToolbar />

            {/* Canvas Stage with Grid Background */}
            <div className="relative flex-1 overflow-auto p-4 md:p-6 flex items-start justify-center bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]">
                <div
                    style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: "top center",
                        transition: "transform 0.15s ease-out, width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        width: viewport === "desktop" ? "100%" : `${targetWidth}px`,
                        maxWidth: viewport === "desktop" ? "1440px" : `${targetWidth}px`,
                        height: "100%",
                        minHeight: "780px",
                    }}
                    className="relative flex flex-col rounded-xl border border-white/10 bg-background shadow-2xl overflow-hidden ring-1 ring-black/5"
                >
                    {/* Device Header Bar */}
                    <div className="flex h-7 items-center justify-between border-b bg-muted/70 px-3 text-[11px] text-muted-foreground select-none shrink-0">
                        <div className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-red-500/80"></span>
                            <span className="size-2.5 rounded-full bg-yellow-500/80"></span>
                            <span className="size-2.5 rounded-full bg-emerald-500/80"></span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground/80 truncate">
                            {VIEWPORT_DIMENSIONS[viewport].label}
                        </span>
                        <div className="w-10"></div>
                    </div>

                    {/* Live Sandboxed WebPreview */}
                    <WebPreview className="flex-1 border-0 rounded-none bg-transparent">
                        <WebPreviewBody
                            srcDoc={activeCode}
                            className="size-full border-0 bg-background"
                        />
                    </WebPreview>
                </div>
            </div>

            {/* Modals & Drawers */}
            <CodeExportModal />
            <AssetDropzone />
        </div>
    );
}
