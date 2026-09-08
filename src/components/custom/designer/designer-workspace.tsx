"use client";

import { ReactNode } from "react";
import { DesignerCanvas } from "./designer-canvas";
import { useDesignerCanvasStore } from "@/stores/designer-canvas-store";
import { useSkillStore } from "@/stores/skill-store";

interface DesignerWorkspaceProps {
    children: ReactNode;
}

export function DesignerWorkspace({ children }: DesignerWorkspaceProps) {
    const { isDesignerMode } = useSkillStore();
    const { isCanvasVisible } = useDesignerCanvasStore();

    const showSplitCanvas = isDesignerMode && isCanvasVisible;

    return (
        <div className="relative flex h-[calc(100vh-80px)] w-full overflow-hidden">
            <div
                className={`flex flex-col h-full overflow-hidden divide-y transition-all duration-200 ${showSplitCanvas
                        ? "w-full lg:w-[420px] xl:w-[480px] shrink-0 border-r"
                        : "flex-1 w-full"
                    }`}
            >
                {children}
            </div>

            {showSplitCanvas && (
                <div className="hidden lg:flex flex-1 h-full overflow-hidden">
                    <DesignerCanvas />
                </div>
            )}
        </div>
    );
}

export { DesignerCanvas };
