"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useAssetStore, CanvasAsset } from "@/lib/asset-manager";
import { useDesignerCanvasStore } from "@/stores/designer-canvas-store";
import { UploadCloud, Trash2, Copy, Check, ImageIcon } from "lucide-react";

export function AssetDropzone() {
    const { isAssetDrawerOpen, setIsAssetDrawerOpen } = useDesignerCanvasStore();
    const { assets, addAsset, removeAsset } = useAssetStore();
    const [isDragging, setIsDragging] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        let count = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith("image/")) {
                addAsset(file);
                count++;
            }
        }
        if (count > 0) {
            toast.success(`Added ${count} asset${count > 1 ? "s" : ""}`);
        } else {
            toast.error("Please drop image files (PNG, SVG, JPG, WebP)");
        }
    };

    const handleCopyUrl = async (asset: CanvasAsset) => {
        try {
            await navigator.clipboard.writeText(asset.url);
            setCopiedId(asset.id);
            toast.success("Asset URL copied to clipboard");
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            toast.error("Failed to copy URL");
        }
    };

    return (
        <Sheet open={isAssetDrawerOpen} onOpenChange={setIsAssetDrawerOpen}>
            <SheetContent side="right" className="w-[360px] sm:w-[420px] flex flex-col p-6">
                <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2 text-base">
                        <ImageIcon className="size-4 text-indigo-400" />
                        Canvas Asset Manager
                    </SheetTitle>
                    <SheetDescription className="text-xs">
                        Upload local images or logos. Reference their URLs in chat so Gemma 4 E2B can place them in your design.
                    </SheetDescription>
                </SheetHeader>

                {/* Drop Area */}
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        handleFiles(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                        isDragging
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-muted-foreground/25 hover:border-indigo-400/50 hover:bg-muted/40"
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                    />
                    <UploadCloud className="size-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs font-medium text-foreground">
                        Drop images here or click to browse
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                        PNG, SVG, JPG, WebP (Runs 100% locally in browser memory)
                    </p>
                </div>

                {/* Asset List */}
                <div className="flex-1 overflow-y-auto mt-4 space-y-2.5">
                    {assets.length === 0 ? (
                        <div className="text-center py-10 text-xs text-muted-foreground">
                            No assets uploaded yet.
                        </div>
                    ) : (
                        assets.map((asset) => (
                            <div
                                key={asset.id}
                                className="flex items-center gap-3 p-2.5 rounded-lg border bg-card/60 hover:bg-card transition-colors"
                            >
                                <img
                                    src={asset.url}
                                    alt={asset.name}
                                    className="size-10 rounded object-cover border bg-zinc-900 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate text-foreground">
                                        {asset.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {(asset.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        size="icon-xs"
                                        variant="ghost"
                                        onClick={() => handleCopyUrl(asset)}
                                        title="Copy URL"
                                    >
                                        {copiedId === asset.id ? (
                                            <Check className="size-3.5 text-emerald-400" />
                                        ) : (
                                            <Copy className="size-3.5" />
                                        )}
                                    </Button>
                                    <Button
                                        size="icon-xs"
                                        variant="ghost"
                                        onClick={() => removeAsset(asset.id)}
                                        className="text-muted-foreground hover:text-destructive"
                                        title="Remove"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
