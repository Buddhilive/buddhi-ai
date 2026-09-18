"use client";

import React, { useState, useEffect } from "react";
import { KeyRound, ExternalLink, Trash2, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";

export function SettingsForm() {
  const { hfToken, isLoading, saveHfToken, removeHfToken } = useSettings();
  const [tokenInput, setTokenInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (hfToken) {
      setTokenInput(hfToken);
      setIsEditing(false);
    } else {
      setTokenInput("");
      setIsEditing(true);
    }
  }, [hfToken]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      toast.error("Token cannot be empty.");
      return;
    }
    setIsSaving(true);
    const success = await saveHfToken(tokenInput);
    setIsSaving(false);
    if (success) {
      toast.success("Hugging Face token saved to browser storage");
      setIsEditing(false);
    } else {
      toast.error("Failed to save token");
    }
  };

  const handleRemove = async () => {
    const success = await removeHfToken();
    if (success) {
      setTokenInput("");
      setIsEditing(true);
      toast.info("Hugging Face token removed");
    } else {
      toast.error("Failed to remove token");
    }
  };

  const maskToken = (tok: string) => {
    if (tok.length <= 8) return "••••••••";
    return tok.slice(0, 4) + "••••••••••••••••" + tok.slice(-4);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <CardTitle>Hugging Face Access Token</CardTitle>
          </div>
          <CardDescription>
            Required to download gated embedding and language models (like{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              litert-community/embeddinggemma-300m
            </code>
            ) directly into your browser cache.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="hf-token-input" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                User Access Token (Read Scope)
              </label>

              {isLoading ? (
                <div className="h-10 w-full animate-pulse bg-muted rounded-md" />
              ) : !isEditing && hfToken ? (
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/40 font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>{maskToken(hfToken)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      Change
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemove}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="hf-token-input"
                    type="password"
                    placeholder="hf_..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="font-mono"
                    autoComplete="off"
                  />
                  <Button type="submit" disabled={isSaving || !tokenInput.trim()}>
                    {isSaving ? "Saving..." : "Save Token"}
                  </Button>
                  {hfToken && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setTokenInput(hfToken);
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <span>Need a token?</span>
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                Generate one on Hugging Face
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-muted-foreground/60">
                (Only &quot;Read&quot; permissions needed)
              </span>
            </div>
          </form>
        </CardContent>
        <CardFooter className="border-t bg-muted/20 px-6 py-3 text-xs text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>
            Your token never leaves this device. It is stored securely in your browser&apos;s
            IndexedDB database and sent exclusively to Hugging Face CDN endpoints during model download.
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}
