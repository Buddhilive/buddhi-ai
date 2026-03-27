"use client";

import { useEffect, useState } from "react";
import { modelsApi } from "@/lib/model-manager";
import { MODELS } from "@/const/models";
import { useModelStore } from "@/stores/model-store";
import { toast } from "sonner";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
    Trash2Icon,
    XCircleIcon,
    DownloadIcon,
    RefreshCcwIcon,
    AlertCircleIcon,
    CheckCircleIcon,
    BrainCircuitIcon,
    KeyRoundIcon,
    ExternalLinkIcon,
} from "lucide-react";

// ─── Root view ────────────────────────────────────────────────────────────────

export function ModelsView() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [availableModels] = useState(MODELS);
    const hydrated = useModelStore((state) => state.hydrated);
    const allModels = useModelStore((state) => state.models);

    const anyDownloading = Object.values(allModels).some(
        (m) => m.status === "downloading"
    );

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (anyDownloading) {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [anyDownloading]);

    const fetchModels = async () => {
        try {
            setLoading(true);
            setError(null);
            await modelsApi.listModels();
        } catch (err: unknown) {
            const msg = (err as Error).message || "Failed to load models";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hydrated) {
            fetchModels();
        }
    }, [hydrated]);

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Models</h1>
                    <p className="text-muted-foreground">
                        Install and manage AI models for use in Buddhi AI Studio.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchModels}
                    disabled={loading}
                >
                    <RefreshCcwIcon
                        className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                </Button>
            </div>

            {anyDownloading && (
                <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400">
                    <AlertCircleIcon className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
                    <AlertTitle>Download in Progress</AlertTitle>
                    <AlertDescription>
                        Please do not close or refresh this tab while a model is downloading. It will interrupt the process. Navigation within the app is fine.
                    </AlertDescription>
                </Alert>
            )}

            {error && (
                <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircleIcon className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableModels.map((m) => (
                        <Card key={m.id} className="animate-pulse opacity-60">
                            <CardHeader>
                                <div className="h-5 w-32 rounded bg-muted" />
                                <div className="h-4 w-48 rounded bg-muted" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-4 w-full rounded bg-muted" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableModels.map((model) => (
                        <ModelCard key={model.id} model={model} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Per-model card ───────────────────────────────────────────────────────────

interface ModelCardProps {
    model: typeof MODELS[number];
}

function ModelCard({ model }: ModelCardProps) {
    const [isInstalling, setIsInstalling] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
    const [accessToken, setAccessToken] = useState(process.env.NEXT_PUBLIC_HF_TOKEN || "");

    // Subscribe to the entire models map to detect any changes
    const allModels = useModelStore((state) => state.models);

    // Extract current model state with proper defaults
    const modelState = allModels[model.id];
    const status = modelState?.status || "not_installed";
    const progress = modelState?.progress || 0;
    const error = modelState?.error;

    const inProgress = status === "downloading";

    const startInstall = async (token?: string) => {
        try {
            setIsInstalling(true);
            await modelsApi.downloadModel({ model: model.id, accessToken: token });
            toast.success(`Download started for ${model.name}`);
        } catch (err: unknown) {
            const msg = (err as Error).message || "Failed to start download";
            toast.error(msg);
        } finally {
            setIsInstalling(false);
        }
    };

    const handleInstall = () => {
        setTokenDialogOpen(true);
    };

    const handleCancel = async () => {
        try {
            setIsCanceling(true);
            await modelsApi.cancelDownload(model.id);
            toast.success(`Cancelled download for ${model.name}`);
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to cancel download");
        } finally {
            setIsCanceling(false);
        }
    };

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await modelsApi.deleteModel(model.id);
            setDeleteDialogOpen(false);
            toast.success(`Deleted ${model.name}`);
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to delete model");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Card className="flex flex-col">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <BrainCircuitIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                            <CardTitle className="text-base leading-snug">
                                {model.name}
                            </CardTitle>
                        </div>
                        <StatusBadge status={status} />
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                        {model.id}
                    </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3">
                    <p className="text-sm text-muted-foreground">{model.description}</p>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">
                            {typeof model.dtype === "string" ? model.dtype : "auto"}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                            {model.type}
                        </Badge>
                    </div>

                    {inProgress && (
                        <div className="flex items-center gap-2">
                            <Progress value={progress} className="h-1.5" />
                            <p className="text-xs text-muted-foreground text-right whitespace-nowrap">
                                {progress}%
                            </p>
                        </div>
                    )}

                    {status === "failed" && (
                        <div className="flex items-center gap-2 text-xs text-destructive">
                            <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
                            <span>{error || "Download failed"}</span>
                        </div>
                    )}

                    {status === "unavailable" && (
                        <div className="flex items-center gap-2 text-xs text-destructive">
                            <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
                            <span>
                                {error || "Browser does not support this model"}
                            </span>
                        </div>
                    )}
                </CardContent>

                <CardFooter>
                    {status === "not_installed" || status === "failed" ? (
                        <Button
                            className="w-full"
                            size="sm"
                            onClick={handleInstall}
                            disabled={isInstalling}
                        >
                            {isInstalling ? (
                                <RefreshCcwIcon className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <DownloadIcon className="mr-2 h-4 w-4" />
                            )}
                            {status === "failed" ? "Retry Install" : "Install"}
                        </Button>
                    ) : inProgress ? (
                        <Button
                            className="w-full"
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            disabled={isCanceling}
                        >
                            {isCanceling ? (
                                <RefreshCcwIcon className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <XCircleIcon className="mr-2 h-4 w-4" />
                            )}
                            Cancel
                        </Button>
                    ) : status === "completed" ? (
                        <Button
                            className="w-full"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            <Trash2Icon className="mr-2 h-4 w-4 text-destructive" />
                            <span className="text-destructive">Uninstall</span>
                        </Button>
                    ) : null}
                </CardFooter>
            </Card>

            {/* Access token dialog — shown before download starts */}
            <Dialog open={tokenDialogOpen} onOpenChange={(open) => {
                setTokenDialogOpen(open);
                if (!open) setAccessToken("");
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRoundIcon className="h-4 w-4" />
                            Install {model.name}
                        </DialogTitle>
                        <DialogDescription>
                            This model is hosted on HuggingFace. Some models (e.g. Gemma family)
                            require you to accept their licence and provide an access token.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-1">
                        <div className="space-y-1.5">
                            <label htmlFor="hf-token" className="text-sm font-medium">HuggingFace Access Token <span className="text-muted-foreground">(optional)</span></label>
                            <Input
                                id="hf-token"
                                type="password"
                                placeholder="hf_..."
                                value={accessToken}
                                onChange={(e) => setAccessToken(e.target.value)}
                                autoComplete="off"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            If this model is gated, accept its licence on{" "}
                            <a
                                href={`https://huggingface.co/${model.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline inline-flex items-center gap-0.5"
                            >
                                huggingface.co <ExternalLinkIcon className="h-3 w-3" />
                            </a>{" "}
                            then paste your access token above. Leave blank for public models.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => { setTokenDialogOpen(false); setAccessToken(""); }}
                            disabled={isInstalling}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                setTokenDialogOpen(false);
                                startInstall(accessToken || undefined);
                                setAccessToken("");
                            }}
                            disabled={isInstalling}
                        >
                            {isInstalling ? (
                                <RefreshCcwIcon className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <DownloadIcon className="mr-2 h-4 w-4" />
                            )}
                            Download
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Uninstall {model.name}?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete the model files from the browser
                            cache. You can reinstall the model at any time.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <RefreshCcwIcon className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2Icon className="mr-2 h-4 w-4" />
                            )}
                            Uninstall
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({
    status,
}: {
    status: "not_installed" | "downloading" | "completed" | "failed" | "unavailable";
}) {
    switch (status) {
        case "completed":
            return (
                <Badge className="bg-green-600 text-white shrink-0 gap-1">
                    <CheckCircleIcon className="h-3 w-3" />
                    Installed
                </Badge>
            );
        case "downloading":
            return (
                <Badge variant="secondary" className="animate-pulse shrink-0">
                    Downloading
                </Badge>
            );
        case "failed":
            return (
                <Badge variant="destructive" className="shrink-0">
                    Failed
                </Badge>
            );
        case "unavailable":
            return (
                <Badge variant="destructive" className="shrink-0">
                    Unavailable
                </Badge>
            );
        case "not_installed":
        default:
            return (
                <Badge variant="outline" className="text-muted-foreground shrink-0">
                    Not Installed
                </Badge>
            );
    }
}