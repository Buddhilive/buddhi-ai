import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ApiUnavailableProps {
  apiName: string;
  onRetry?: () => void;
  onGoToInstallation?: () => void;
}

export function ApiUnavailable({ apiName, onRetry, onGoToInstallation }: ApiUnavailableProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
          <CardTitle>{apiName} Not Available</CardTitle>
          <CardDescription>
            The {apiName} is not available on this browser. Please ensure Chrome Built-in AI is properly configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
          {onGoToInstallation && (
            <Button onClick={onGoToInstallation} className="w-full">
              Setup Instructions
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}