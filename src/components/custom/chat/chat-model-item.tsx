import { memo, useCallback } from "react";
import { CheckIcon } from "lucide-react";
import {
    ModelSelectorItem,
    ModelSelectorLogo,
    ModelSelectorLogoGroup,
    ModelSelectorName,
} from "@/components/ai-elements/model-selector";

interface ModelItemProps {
    model: {
        chef: string;
        chefSlug: string;
        id: string;
        name: string;
        providers: string[];
        template: string;
    };
    selectedModel: string;
    onSelect: (id: string) => void;
}

export const ModelItem = memo(({ model, selectedModel, onSelect }: ModelItemProps) => {
    const handleSelect = useCallback(
        () => onSelect(model.id),
        [onSelect, model.id]
    );
    return (
        <ModelSelectorItem key={model.id} onSelect={handleSelect} value={model.id}>
            <ModelSelectorLogo provider={model.chefSlug} />
            <ModelSelectorName>{model.name}</ModelSelectorName>
            <ModelSelectorLogoGroup>
                {model.providers.map((provider) => (
                    <ModelSelectorLogo key={provider} provider={provider} />
                ))}
            </ModelSelectorLogoGroup>
            {selectedModel === model.id ? (
                <CheckIcon className="ml-auto size-4" />
            ) : (
                <div className="ml-auto size-4" />
            )}
        </ModelSelectorItem>
    );
});

ModelItem.displayName = "ModelItem";
