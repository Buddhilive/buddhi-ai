"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useDesignerCanvasStore } from "@/stores/designer-canvas-store";
import { Check, Copy, Download, Code } from "lucide-react";

export function CodeExportModal() {
    const { isExportOpen, setIsExportOpen, activeCode } = useDesignerCanvasStore();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(activeCode);
            setCopied(true);
            toast.success("Code copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy code");
        }
    };

    const handleDownload = () => {
        try {
            const blob = new Blob([activeCode], { type: "text/html;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `buddhi-design-${Date.now()}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("HTML file downloaded");
        } catch {
            toast.error("Failed to download HTML");
        }
    };

    return (
        <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
                <DialogHeader className="pb-2">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Code className="size-5 text-indigo-400" />
                        Inspect & Export Web Artifact
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Self-contained HTML5, CSS3, and JavaScript ready to embed, share, or open in any browser.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative flex-1 min-h-[300px] overflow-hidden rounded-lg border bg-zinc-950 font-mono text-xs text-zinc-300">
                    <pre className="h-full overflow-auto p-4 select-text leading-relaxed">
                        <code>{activeCode}</code>
                    </pre>
                </div>

                <DialogFooter className="pt-3 flex items-center justify-between sm:justify-between">
                    <span className="text-xs text-muted-foreground">
                        {activeCode.length.toLocaleString()} characters
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            className="gap-1.5 text-xs"
                        >
                            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                            {copied ? "Copied" : "Copy HTML"}
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleDownload}
                            className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                        >
                            <Download className="size-3.5" />
                            Download .html
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
