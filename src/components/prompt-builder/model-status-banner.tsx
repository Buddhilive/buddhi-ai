import Link from "next/link";
import { DownloadStatus } from "@/lib/model-state";
import { AlertCircle, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModelStatusBannerProps {
  status: DownloadStatus;
  overallProgress?: number;
}

export function ModelStatusBanner({ status, overallProgress = 0 }: ModelStatusBannerProps) {
  if (status === "complete") {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="max-w-md w-full space-y-6">
        {status === "checking" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Checking Model Status</h2>
            <p className="text-muted-foreground">Verifying local model cache...</p>
          </div>
        )}
        
        {status === "downloading" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Downloading Model</h2>
            <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-muted-foreground">{overallProgress.toFixed(1)}%</p>
            <p className="text-muted-foreground">Please wait while the model downloads...</p>
            <Link href="/app/download" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
              View Download Details
            </Link>
          </div>
        )}

        {(status === "idle" || status === "error" || status === "cancelled") && (
          <div className="space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Model Not Ready</h2>
            <p className="text-muted-foreground">
              {status === "error" 
                ? "An error occurred during model download." 
                : "You need to download the local AI model to use the Prompt Builder."}
            </p>
            <Link href="/app/download" className={cn(buttonVariants(), "w-full mt-4")}>
              Go to Download Page
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
