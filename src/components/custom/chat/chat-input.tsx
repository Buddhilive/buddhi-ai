import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    PromptInput,
    PromptInputBody,
    PromptInputButton,
    PromptInputFooter,
    PromptInputHeader,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
    type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import {
    Context,
    ContextContent,
    ContextContentHeader,
    ContextTrigger,
} from "@/components/ai-elements/context";
import {
    ModelSelector,
    ModelSelectorContent,
    ModelSelectorEmpty,
    ModelSelectorGroup,
    ModelSelectorInput,
    ModelSelectorList,
    ModelSelectorLogo,
    ModelSelectorName,
    ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { PromptInputAttachmentsDisplay } from "./chat-attachments";
import { ModelItem } from "./chat-model-item";
import { useAssetStore } from "@/lib/asset-manager";
import { useSkillStore } from "@/stores/skill-store";
import { ImageIcon } from "lucide-react";
import { MAX_CONTEXT_TOKENS } from "@/lib/memory";

interface ChatInputProps {
    text: string;
    handleTextChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleSubmit: (message: PromptInputMessage) => Promise<void>;
    isSubmitDisabled: boolean;
    stop: () => void;
    status: any;
    isReasoningOn: boolean;
    toggleReasoning: () => void;
    handleTranscriptionChange: (transcript: string) => void;
    tokenCount: number;
    selectedSystemPromptData: any;
    setOpen: (open: boolean) => void;
    open: boolean;
    chefs: string[];
    models: any[];
    handleModelSelect: (id: string) => void;
    selectedSystemPrompt: string;
}

export function ChatInput({
    text,
    handleTextChange,
    handleSubmit,
    isSubmitDisabled,
    stop,
    status,
    isReasoningOn,
    toggleReasoning,
    handleTranscriptionChange,
    tokenCount,
    selectedSystemPromptData,
    setOpen,
    open,
    chefs,
    models,
    handleModelSelect,
    selectedSystemPrompt,
}: ChatInputProps) {
    const { assets } = useAssetStore();
    const { isDesignerMode } = useSkillStore();

    return (
        <div className="grid shrink-0 gap-3 pt-4">
            <div className="w-full px-4 pb-4">
                <PromptInput globalDrop multiple onSubmit={handleSubmit}>
                    <PromptInputHeader>
                        <PromptInputAttachmentsDisplay />
                    </PromptInputHeader>

                    {isDesignerMode && assets.length > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto text-[11px] text-muted-foreground border-b border-border/40 bg-muted/20">
                            <ImageIcon className="size-3 text-indigo-400 shrink-0" />
                            <span className="shrink-0 font-medium text-foreground/70">Assets:</span>
                            {assets.map((a) => (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => {
                                        const addition = ` [Asset: ${a.name} (${a.url})] `;
                                        const evt = { target: { value: text + addition } } as any;
                                        handleTextChange(evt);
                                    }}
                                    className="px-2 py-0.5 rounded-md bg-muted hover:bg-accent text-foreground/80 hover:text-foreground text-[10px] shrink-0 transition-colors truncate max-w-[140px] border border-border/40"
                                    title={`Click to reference ${a.name}`}
                                >
                                    +{a.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <PromptInputBody>
                        <PromptInputTextarea
                            onChange={handleTextChange}
                            value={text}
                        />
                    </PromptInputBody>
                    <PromptInputFooter>
                        <PromptInputTools>
                            <SpeechInput
                                className="shrink-0"
                                onTranscriptionChange={handleTranscriptionChange}
                                size="icon-sm"
                                variant="ghost"
                            />
                            <PromptInputButton
                                onClick={toggleReasoning}
                                variant={isReasoningOn ? "default" : "ghost"}
                            >
                                <Brain size={16} />
                                <span>Reasoning</span>
                            </PromptInputButton>

                            <ModelSelector onOpenChange={setOpen} open={open}>
                                <ModelSelectorTrigger asChild>
                                    <Button className="justify-between" variant="secondary">
                                        {selectedSystemPromptData?.chefSlug && (
                                            <ModelSelectorLogo provider={selectedSystemPromptData.chefSlug} />
                                        )}
                                        {selectedSystemPromptData?.name && (
                                            <ModelSelectorName>{selectedSystemPromptData.name}</ModelSelectorName>
                                        )}
                                    </Button>
                                </ModelSelectorTrigger>
                                <ModelSelectorContent>
                                    <ModelSelectorInput placeholder="Search template..." />
                                    <ModelSelectorList>
                                        <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                                        {chefs.map((chef) => (
                                            <ModelSelectorGroup heading={chef} key={chef}>
                                                {models
                                                    .filter((model: any) => model.chef === chef)
                                                    .map((model: any) => (
                                                        <ModelItem
                                                            key={model.id}
                                                            model={model}
                                                            onSelect={handleModelSelect}
                                                            selectedModel={selectedSystemPrompt}
                                                        />
                                                    ))}
                                            </ModelSelectorGroup>
                                        ))}
                                    </ModelSelectorList>
                                </ModelSelectorContent>
                            </ModelSelector>
                        </PromptInputTools>

                        <div className="flex items-center gap-1">
                            {tokenCount > 0 && (
                                <Context
                                    usedTokens={tokenCount}
                                    maxTokens={MAX_CONTEXT_TOKENS}
                                >
                                    <ContextTrigger size="sm" />
                                    <ContextContent>
                                        <ContextContentHeader />
                                    </ContextContent>
                                </Context>
                            )}

                            <PromptInputSubmit
                                disabled={isSubmitDisabled}
                                onStop={stop}
                                status={status}
                            />
                        </div>
                    </PromptInputFooter>
                </PromptInput>
            </div>
            <span className="text-xs text-muted-foreground text-center">BuddiAI can make mistakes, so double-check the output.</span>
        </div>
    );
}
