"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { useApiAvailability } from "@/hooks/use-api-availability";
import { useRouter } from "next/navigation";

export default function InstallationPage() {
  const router = useRouter();
  const requiredApis: ('languageModel' | 'summarizer' | 'writer' | 'languageDetector')[] = ['languageModel', 'summarizer', 'writer', 'languageDetector'];
  const { availability, isChecking, recheckAvailability } = useApiAvailability({
    requiredApis,
    redirectOnUnavailable: false,
  });

  const handleRecheck = async () => {
    await recheckAvailability();
    // Check if all APIs are now available after recheck
    const allAvailable = requiredApis.every(api => availability[api]);
    if (allAvailable) {
      // Redirect to dashboard if all APIs become available
      router.push('/dashboard');
    }
  };

  const handleDocsRedirect = () => {
    window.open('https://www.buddhilive.com/docs/chrome-ai', '_blank');
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
        </div>
        <h1 className="mb-4 text-3xl font-bold">Chrome AI Setup Required</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Buddhilive AI requires Chrome's Built-in AI APIs to function. Manual installation and API enabling is needed to use all features.
        </p>
      </div>

      <Card className="w-full max-w-2xl mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            API Availability Status
          </CardTitle>
          <CardDescription>
            Current status of Chrome Built-in AI APIs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { key: 'languageModel', label: 'Language Model API' },
              { key: 'summarizer', label: 'Summarizer API' },
              { key: 'writer', label: 'Writer API' },
              { key: 'languageDetector', label: 'Language Detector API' },
              { key: 'translator', label: 'Translator API' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="font-medium">{label}</span>
                <div className="flex items-center gap-2">
                  {isChecking ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      Checking...
                    </div>
                  ) : availability[key as keyof typeof availability] ? (
                    <span className="text-green-600 font-medium">✓ Available</span>
                  ) : (
                    <span className="text-red-600 font-medium">✗ Not Available</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex gap-3">
            <Button onClick={handleRecheck} disabled={isChecking} className="flex-1">
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recheck APIs
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDocsRedirect}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Setup Guide
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Follow these steps to enable Chrome Built-in AI APIs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h3 className="font-medium mb-1">Update Chrome Browser</h3>
                <p className="text-sm text-muted-foreground">
                  Ensure you're using Chrome Canary or Dev channel with version 127 or higher.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h3 className="font-medium mb-1">Enable Experimental Features</h3>
                <p className="text-sm text-muted-foreground">
                  Enable the required flags in chrome://flags for Built-in AI APIs.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h3 className="font-medium mb-1">Download AI Models</h3>
                <p className="text-sm text-muted-foreground">
                  Allow Chrome to download the necessary AI models for local processing.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              For detailed setup instructions and troubleshooting, visit our comprehensive documentation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}