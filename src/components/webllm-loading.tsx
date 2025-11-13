import { WebLLMState } from "@/hooks/use-webllm";
import { Progress } from "@/components/ui/progress";

export const WebLLMLoading = (webLLMState: WebLLMState) => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex justify-between items-center gap-2">
          <Progress value={webLLMState.progress} />
          <p className="text-sm text-muted-foreground mt-1">
            {webLLMState.progress}%
          </p>
        </div>
        <div>
          <h3 className="text-lg font-medium">Loading Buddhi AI</h3>
          <p className="text-xs text-muted-foreground mt-2">
            This may take a few minutes on first load...
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {webLLMState.text} - Elapsed Time: {webLLMState.timeElapsed.toFixed(2)}s
          </p>
        </div>
      </div>
    </div>
  );
};
