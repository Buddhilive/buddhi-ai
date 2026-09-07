"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDesignerCanvasStore, CanvasViewportPreset } from "@/stores/designer-canvas-store";
import { useSkillStore } from "@/stores/skill-store";
import {
    Monitor,
    Tablet,
    Smartphone,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Code2,
    ImageIcon,
    Sparkles,
} from "lucide-react";

export function ViewportToolbar() {
    const {
        viewport,
        setViewport,
        zoom,
        setZoom,
        setIsExportOpen,
        setIsAssetDrawerOpen,
    } = useDesignerCanvasStore();

    const { activeRecipe, activeSkill } = useSkillStore();

    const presets: { id: CanvasViewportPreset; icon: React.ReactNode; label: string }[] = [
        { id: "desktop", icon: <Monitor className="size-4" />, label: "Desktop (1440px)" },
        { id: "tablet", icon: <Tablet className="size-4" />, label: "Tablet (768px)" },
        { id: "mobile", icon: <Smartphone className="size-4" />, label: "Mobile (375px)" },
    ];

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex h-11 items-center justify-between border-b bg-card/60 backdrop-blur px-3 gap-2">
                {/* Left: Viewport Presets */}
                <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border">
                    {presets.map((p) => (
                        <Tooltip key={p.id}>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon-xs"
                                    variant={viewport === p.id ? "default" : "ghost"}
                                    onClick={() => setViewport(p.id)}
                                    className="h-7 w-7"
                                >
                                    {p.icon}
                                    <span className="sr-only">{p.label}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                {p.label}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>

                {/* Center: Active Recipe / Skill Indicator */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate max-w-[200px]">
                    <Sparkles className="size-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate font-medium text-foreground/80">
                        {activeRecipe?.name || activeSkill?.name || "Web Designer"}
                    </span>
                </div>

                {/* Right: Zoom & Export Controls */}
                <div className="flex items-center gap-1">
                    <div className="flex items-center gap-0.5 bg-muted/50 px-1 py-0.5 rounded-lg border text-xs">
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => setZoom(Math.max(50, zoom - 10))}
                            className="h-6 w-6"
                            disabled={zoom <= 50}
                        >
                            <ZoomOut className="size-3" />
                        </Button>
                        <span className="w-10 text-center font-mono text-[11px] select-none">
                            {zoom}%
                        </span>
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => setZoom(Math.min(150, zoom + 10))}
                            className="h-6 w-6"
                            disabled={zoom >= 150}
                        >
                            <ZoomIn className="size-3" />
                        </Button>
                        {zoom !== 100 && (
                            <Button
                                size="icon-xs"
                                variant="ghost"
                                onClick={() => setZoom(100)}
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            >
                                <RotateCcw className="size-3" />
                            </Button>
                        )}
                    </div>

                    {/* Assets */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsAssetDrawerOpen(true)}
                                className="h-7 px-2 text-xs gap-1.5"
                            >
                                <ImageIcon className="size-3.5 text-muted-foreground" />
                                <span className="hidden sm:inline">Assets</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                            Manage Canvas Assets
                        </TooltipContent>
                    </Tooltip>

                    {/* Export / Inspect Code */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsExportOpen(true)}
                                className="h-7 px-2.5 text-xs gap-1.5 font-medium shadow-xs"
                            >
                                <Code2 className="size-3.5 text-indigo-400" />
                                <span>Code</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                            Inspect & Export HTML
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    );
}
