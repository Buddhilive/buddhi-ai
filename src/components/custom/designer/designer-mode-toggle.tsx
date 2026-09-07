"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSkillStore } from "@/stores/skill-store";
import { useDesignerCanvasStore } from "@/stores/designer-canvas-store";
import { Palette, MessageSquare, ChevronDown, Check, Sparkles, Layout } from "lucide-react";

export function DesignerModeToggle() {
    const {
        isDesignerMode,
        setDesignerMode,
        activeRecipe,
        activateRecipe,
        activeSkill,
        loadIndex,
    } = useSkillStore();

    const { isCanvasVisible, setIsCanvasVisible } = useDesignerCanvasStore();

    useEffect(() => {
        loadIndex();
    }, [loadIndex]);

    return (
        <div className="flex items-center gap-1.5">
            {/* Mode Selector */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant={isDesignerMode ? "default" : "outline"}
                        size="sm"
                        className="h-8 gap-1.5 text-xs font-medium"
                    >
                        {isDesignerMode ? (
                            <Palette className="size-3.5 text-indigo-200" />
                        ) : (
                            <MessageSquare className="size-3.5" />
                        )}
                        <span>{isDesignerMode ? "UI Designer Mode" : "Chat Assistant"}</span>
                        <ChevronDown className="size-3 opacity-60 ml-0.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 text-xs">
                    <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase font-semibold">
                        AI Operational Mode
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => {
                            setDesignerMode(true);
                            setIsCanvasVisible(true);
                        }}
                        className="flex items-center justify-between cursor-pointer py-2"
                    >
                        <div className="flex items-center gap-2">
                            <Palette className="size-4 text-indigo-400" />
                            <div>
                                <p className="font-medium text-foreground">UI & Web Designer</p>
                                <p className="text-[10px] text-muted-foreground">Figma alternative canvas</p>
                            </div>
                        </div>
                        {isDesignerMode && <Check className="size-3.5 text-indigo-400" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => {
                            setDesignerMode(false);
                            setIsCanvasVisible(false);
                        }}
                        className="flex items-center justify-between cursor-pointer py-2"
                    >
                        <div className="flex items-center gap-2">
                            <MessageSquare className="size-4 text-muted-foreground" />
                            <div>
                                <p className="font-medium text-foreground">General Chat</p>
                                <p className="text-[10px] text-muted-foreground">Conversational assistant</p>
                            </div>
                        </div>
                        {!isDesignerMode && <Check className="size-3.5 text-indigo-400" />}
                    </DropdownMenuItem>

                    {isDesignerMode && activeSkill?.recipes && activeSkill.recipes.length > 0 && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase font-semibold">
                                Aesthetic Recipes
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => activateRecipe(null)}
                                className="flex items-center justify-between cursor-pointer"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Sparkles className="size-3 text-muted-foreground" />
                                    Auto / Default
                                </span>
                                {!activeRecipe && <Check className="size-3.5 text-indigo-400" />}
                            </DropdownMenuItem>
                            {activeSkill.recipes.map((r) => (
                                <DropdownMenuItem
                                    key={r.id}
                                    onClick={() => activateRecipe(r.id)}
                                    className="flex items-center justify-between cursor-pointer"
                                >
                                    <span>{r.name}</span>
                                    {activeRecipe?.id === r.id && <Check className="size-3.5 text-indigo-400" />}
                                </DropdownMenuItem>
                            ))}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Toggle Canvas Button */}
            {isDesignerMode && (
                <Button
                    variant={isCanvasVisible ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => setIsCanvasVisible(!isCanvasVisible)}
                    title={isCanvasVisible ? "Hide Canvas" : "Show Canvas"}
                    className="h-8 w-8"
                >
                    <Layout className="size-4" />
                </Button>
            )}
        </div>
    );
}
