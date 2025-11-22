import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import Image from "next/image";
import { mediaPipeState } from "@/hooks/use-mediapipe";
import { useState, useEffect } from "react";

interface WebLLMLoadingProps extends mediaPipeState {
  onRetry?: () => void;
}

export const WebLLMLoading = ({
  onRetry,
  ...webLLMState
}: WebLLMLoadingProps) => {
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (webLLMState.error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 h-[calc(100vh-56px)]">
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

  const secondsToHms = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    const format = (num: number) => num.toString().padStart(2, "0");

    return `${format(h)}:${format(m)}:${format(s)}`;
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 h-screen w-screen">
      <div className="text-center space-y-4 max-w-md w-full">
        <div>
          <div className="flex flex-col items-center justify-center gap-1 animate-pulse">
            <Image
              src="/icons/android/android-launchericon-144-144.png"
              alt="Buddhi AI Logo"
              width={144}
              height={144}
            />
            <span className="text-4xl font-extralight leading-none">
              <strong className="font-bold">Buddhi</strong>AI
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            {webLLMState.text}
          </p>
        </div>
        <div className="space-y-2">
          <Progress
            value={Number((webLLMState.progress).toFixed(2))}
            className="w-full"
          />
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>{(webLLMState.progress).toFixed(2)}%</span>
            {timeElapsed > 0 ? (
              <span>{secondsToHms(timeElapsed)}</span>
            ) : (
              <span>Waiting...</span>
            )}
          </div>
          <Alert variant="default" className="mt-4">
            <Info />
            <AlertDescription>
              This may take some time on first load.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};
