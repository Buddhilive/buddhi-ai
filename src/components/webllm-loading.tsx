import { WebLLMState } from "@/hooks/use-webllm";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Brain, RefreshCw } from "lucide-react";

interface WebLLMLoadingProps extends WebLLMState {
  onRetry?: () => void;
}

export const WebLLMLoading = ({
  onRetry,
  ...webLLMState
}: WebLLMLoadingProps) => {
  if (webLLMState.error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h3 className="text-lg font-medium">Failed to Load Buddhi AI</h3>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-left">
              {webLLMState.error}
            </AlertDescription>
          </Alert>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 h-screen w-screen">
      <div className="text-center space-y-4 max-w-md w-full">
        <div>
          <div className="flex flex-col items-center justify-center gap-4 animate-fade-in">
            <Brain className="h-12 w-12 text-primary animate-pulse" />
            <span className="text-xl font-bold">Buddhi AI</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            This may take some time on first load...
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {webLLMState.text}
          </p>
        </div>
        <div className="space-y-2">
          <Progress value={webLLMState.progress} className="w-full" />
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>{webLLMState.progress}%</span>
            {webLLMState.timeElapsed > 0 ? (
              <span>{webLLMState.timeElapsed.toFixed(1)}s</span>
            ) : (
              <span>Waiting...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
