"use client";

import React, { useState, useEffect } from "react";
import { KeyRound, ExternalLink, Trash2, CheckCircle2, ShieldCheck, Cpu, Sparkles } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";

export function SettingsForm() {
  const { hfToken, isLoading, saveHfToken, removeHfToken } = useSettings();
  const { enableExtendedContext, setEnableExtendedContext } = useSettingsStore();
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              <CardTitle>Extended Context Window (RLM)</CardTitle>
            </div>
            <Badge variant="outline" className="font-mono text-[11px] gap-1 bg-primary/5 text-primary border-primary/20">
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              WASM Engine
            </Badge>
          </div>
          <CardDescription>
            Bypasses prompt truncation limits (arXiv:2512.24601) by ingesting complete 50KB–200KB+
            academic documents into in-browser WebAssembly linear memory and orchestrating recursive sub-calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
            <div className="space-y-0.5 pr-4">
              <label htmlFor="rlm-toggle" className="text-sm font-medium cursor-pointer">
                Enable Recursive Language Model (RLM) Context
              </label>
              <p className="text-xs text-muted-foreground">
                When enabled, synthesis and deep paper questions execute iterative REPL turns directly inside
                your browser sandbox rather than cutting text to a 16KB window.
              </p>
            </div>
            <Switch
              id="rlm-toggle"
              checked={enableExtendedContext}
              onCheckedChange={(val) => {
                setEnableExtendedContext(val);
                toast.success(
                  val
                    ? "Extended Context (RLM) enabled"
                    : "Extended Context disabled (Standard RAG active)"
                );
              }}
            />
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/20 px-6 py-3 text-xs text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>
            Zero remote servers. The WebAssembly sandbox operates entirely client-side using
            @buddhilive/sandbox and local LiteRT WebGPU/WASM model weights.
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}
