"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Sandbox, ProcessHandle } from "@buddhilive/sandbox";
import { VibeCodingFile } from "@/types/sandbox";
import { useSandboxStore } from "@/stores/sandbox-store";
import { NEXTJS_STARTER_FILES, DEV_SERVER_SCRIPT } from "@/const/nextjs-starter-template";
import {
  saveSandboxFiles,
  loadSandboxFiles,
  isIgnoredPath,
} from "@/lib/sandbox-storage";
import { SandboxLoading } from "./sandbox-loading";
import {
  Terminal as TerminalIcon,
  Play,
  RotateCw,
  ExternalLink,
  FolderTree,
  Eye,
  AlertCircle,
  Loader2,
  FileCode,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SandboxPreviewProps {
  files: VibeCodingFile[];
  chatId?: string | null;
  className?: string;
}

export function SandboxPreview({
  files,
  chatId = null,
  className = "",
}: SandboxPreviewProps) {
  const {
    status,
    initStage,
    initProgressText,
    previewUrl,
    activePort,
    logs,
    activeTab,
    errorMessage,
    setStatus,
    setInitStage,
    setPreviewUrl,
    setActivePort,
    appendLog,
    clearLogs,
    setFiles: setStoreFiles,
    setActiveTab,
    setErrorMessage,
  } = useSandboxStore();

  const [hasSab, setHasSab] = useState<boolean>(true);
  const [vfsTree, setVfsTree] = useState<string[]>([]);
  const [selectedFileContent, setSelectedFileContent] = useState<{
    path: string;
    content: string;
  } | null>(null);
  const [iframeKey, setIframeKey] = useState<number>(0);

  const sandboxRef = useRef<Sandbox | null>(null);
  const procRef = useRef<ProcessHandle | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const lastWrittenFilesRef = useRef<Map<string, string>>(new Map());
  const currentChatIdRef = useRef<string | null>(chatId);
  const prevChatIdRef = useRef<string | null>(chatId);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeFsRef = useRef<(() => void) | null>(null);

  // Sync currentChatIdRef
  useEffect(() => {
    currentChatIdRef.current = chatId;
  }, [chatId]);

  // Check SharedArrayBuffer availability
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sabAvailable = typeof window.SharedArrayBuffer !== "undefined";
      setHasSab(sabAvailable);
      if (!sabAvailable) {
        setErrorMessage(
          "SharedArrayBuffer is not available. Please ensure COOP/COEP headers are set."
        );
      }
    }
  }, [setErrorMessage]);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (activeTab === "terminal" && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, activeTab]);

  // Write file safely creating parent directories
  const writeSafeFile = async (
    sb: Sandbox,
    targetPath: string,
    content: string
  ) => {
    const parts = targetPath.split("/").slice(0, -1);
    let currentDir = "";
    for (const part of parts) {
      if (!part) continue;
      currentDir += `/${part}`;
      try {
        await sb.fs.mkdir(currentDir, { recursive: true });
      } catch {
        // Directory may already exist
      }
    }
    await sb.fs.writeFile(targetPath, content);
  };

  // Scan workspace files excluding ignored directories
  const scanWorkspaceFiles = useCallback(
    async (sb: Sandbox): Promise<Record<string, string>> => {
      const result: Record<string, string> = {};

      const scan = async (dir: string) => {
        try {
          const entries = await sb.fs.readdir(dir);
          for (const item of entries) {
            if (item === "." || item === "..") continue;
            const full = `${dir}/${item}`.replace(/\/+/g, "/");
            const relative = full.replace(/^\/workspace\/?/, "");

            if (isIgnoredPath(relative)) {
              continue;
            }

            try {
              const stat = await sb.fs.stat(full);
              if (stat.isDirectory) {
                await scan(full);
              } else {
                const content = await sb.fs.readFile(full, "utf-8");
                result[relative] = content;
              }
            } catch {
              // Skip unreadable files
            }
          }
        } catch (err) {
          console.warn("[Sandbox] Readdir error in", dir, err);
        }
      };

      await scan("/workspace");
      return result;
    },
    []
  );

  // Trigger debounced auto-save to IndexedDB
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      const sb = sandboxRef.current;
      const targetId = currentChatIdRef.current;
      if (!sb || !targetId) return;

      try {
        const filesMap = await scanWorkspaceFiles(sb);
        if (Object.keys(filesMap).length > 0) {
          await saveSandboxFiles(targetId, filesMap);
          appendLog(
            `💾 Auto-saved ${Object.keys(filesMap).length} source files to IndexedDB`
          );
        }
      } catch (err) {
        console.warn("[Sandbox] Auto-save error:", err);
      }
    }, 800);
  }, [appendLog, scanWorkspaceFiles]);

  // Refresh VFS file list
  const refreshVfsTree = useCallback(async () => {
    const sb = sandboxRef.current;
    if (!sb) return;

    try {
      const listRecursive = async (dir: string): Promise<string[]> => {
        const entries = await sb.fs.readdir(dir);
        let result: string[] = [];
        for (const item of entries) {
          if (item === "." || item === "..") continue;
          const full = `${dir}/${item}`.replace(/\/+/g, "/");
          const relative = full.replace(/^\/workspace\/?/, "");

          if (isIgnoredPath(relative)) {
            continue;
          }

          try {
            const stat = await sb.fs.stat(full);
            if (stat.isDirectory) {
              const sub = await listRecursive(full);
              result = [...result, ...sub];
            } else {
              result.push(full);
            }
          } catch {
            result.push(full);
          }
        }
        return result;
      };

      const paths = await listRecursive("/workspace");
      const relative = paths.map((p) => p.replace(/^\/workspace\/?/, ""));
      setVfsTree(relative);
      setStoreFiles(relative);
    } catch (err) {
      console.warn("[Sandbox] Error reading directory:", err);
    }
  }, [setStoreFiles]);

  // Run npm install inside sandbox
  const runNpmInstall = useCallback(
    async (sb: Sandbox): Promise<boolean> => {
      setInitStage("installing", "Installing dependencies (npm install)...");
      appendLog("📦 Executing: npm install");

      try {
        const proc = await sb.process.spawn("npm", ["install"], {
          cwd: "/workspace",
          env: {
            NODE_ENV: "development",
          },
        });

        // Pipe stdout
        (async () => {
          const reader = proc.stdout.getReader();
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) {
                const text = decoder.decode(value);
                const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
                lines.forEach((l) => appendLog(`[stdout] ${l}`));
              }
            }
          } catch {}
        })();

        // Pipe stderr
        (async () => {
          const reader = proc.stderr.getReader();
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) {
                const text = decoder.decode(value);
                const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
                lines.forEach((l) => appendLog(`[stderr] ${l}`));
              }
            }
          } catch {}
        })();

        const code = await proc.exit;
        appendLog(`ℹ npm install finished with code ${code}`);
        return true;
      } catch (err: any) {
        appendLog(`❌ npm install process error: ${err?.message || err}`);
        return false;
      }
    },
    [appendLog, setInitStage]
  );

  // Spawn Next.js server inside sandbox
  const runNextDev = useCallback(
    async (sb: Sandbox) => {
      try {
        if (procRef.current) {
          appendLog("🔄 Terminating previous server process...");
          await procRef.current.kill();
          procRef.current = null;
        }

        setInitStage("starting", "Booting Next.js dev server on port 3000...");
        appendLog("🚀 Starting Next.js development server (port 3000)...");

        // Ensure dev-server.js is written into /workspace
        await writeSafeFile(sb, "/workspace/dev-server.js", DEV_SERVER_SCRIPT);

        const proc = await sb.process.spawn("node", ["/workspace/dev-server.js"], {
          cwd: "/workspace",
          env: {
            NODE_ENV: "development",
            PORT: "3000",
          },
        });

        procRef.current = proc;

        // Pipe stdout
        (async () => {
          const reader = proc.stdout.getReader();
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) {
                const text = decoder.decode(value);
                const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
                lines.forEach((l) => appendLog(`[stdout] ${l}`));
              }
            }
          } catch {}
        })();

        // Pipe stderr
        (async () => {
          const reader = proc.stderr.getReader();
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) {
                const text = decoder.decode(value);
                const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
                lines.forEach((l) => appendLog(`[stderr] ${l}`));
              }
            }
          } catch {}
        })();

        // Wait for process exit
        proc.exit.then((code) => {
          appendLog(`ℹ Dev server process exited with code ${code}`);
          if (useSandboxStore.getState().status !== "running") {
            setStatus("error");
            setInitStage("error", `Dev server process exited prematurely with code ${code}`);
            setErrorMessage(`Dev server process exited with code ${code}`);
          }
        });
      } catch (err: any) {
        console.error("[Sandbox] Error spawning next dev:", err);
        setStatus("error");
        setInitStage("error", err?.message || "Failed to start Next.js dev server");
        setErrorMessage(err?.message || "Failed to start Next.js dev server");
        appendLog(`❌ Spawn error: ${err?.message || err}`);
      }
    },
    [appendLog, setInitStage, setStatus, setErrorMessage, status]
  );

  // Initialize sandbox and workspace project
  const initializeWorkspace = useCallback(
    async (sb: Sandbox) => {
      try {
        const targetId = currentChatIdRef.current;
        let savedFiles: Record<string, string> | null = null;

        if (targetId) {
          setInitStage("scaffolding", "Checking IndexedDB for saved files...");
          savedFiles = await loadSandboxFiles(targetId);
        }

        if (savedFiles && Object.keys(savedFiles).length > 0) {
          const count = Object.keys(savedFiles).length;
          setInitStage("scaffolding", `Restoring ${count} files from IndexedDB...`);
          appendLog(
            `📂 Restoring ${count} saved files from IndexedDB for chat "${targetId}"...`
          );

          for (const [relPath, content] of Object.entries(savedFiles)) {
            await writeSafeFile(sb, `/workspace/${relPath}`, content);
            lastWrittenFilesRef.current.set(relPath, content);
          }
        } else {
          setInitStage(
            "scaffolding",
            "Scaffolding Next.js 16 App Router starter files..."
          );
          appendLog("✨ Scaffolding Next.js App Router starter into /workspace...");

          for (const file of NEXTJS_STARTER_FILES) {
            await writeSafeFile(sb, `/workspace/${file.path}`, file.content);
            lastWrittenFilesRef.current.set(file.path, file.content);
          }
        }

        await refreshVfsTree();

        // Run npm install
        await runNpmInstall(sb);

        // Run next dev
        await runNextDev(sb);
      } catch (err: any) {
        console.error("[Sandbox] Workspace init error:", err);
        setInitStage("error", err?.message || "Workspace initialization failed");
        setStatus("error");
        setErrorMessage(err?.message || "Failed to initialize workspace");
        appendLog(`❌ Initialization error: ${err?.message || err}`);
      }
    },
    [
      appendLog,
      refreshVfsTree,
      runNextDev,
      runNpmInstall,
      setErrorMessage,
      setInitStage,
      setStatus,
    ]
  );

  // Initialize Sandbox instance once
  const ensureSandbox = useCallback(async (): Promise<Sandbox | null> => {
    if (sandboxRef.current) return sandboxRef.current;
    if (isInitializingRef.current) return null;

    try {
      isInitializingRef.current = true;
      setStatus("booting");
      setInitStage("booting", "Booting WebAssembly POSIX Sandbox (1024MB Quota)...");
      appendLog("⚡ Initializing WebAssembly POSIX Sandbox (1024MB Quota)...");

      const sb = await Sandbox.create({
        maxMemoryMb: 1024,
        commandTimeoutMs: 120000,
      });

      // Listen to virtual HTTP port events
      sb.ports.on("listen", ({ port, url }) => {
        appendLog(`✓ Server listening on virtual port ${port} -> ${url}`);
        setActivePort(port);
        setStatus("running");

        // Register virtual port with @buddhilive/sandbox-sw so iframe requests route to sandbox HTTP server
        const registerWithServiceWorker = () => {
          if (typeof navigator === "undefined" || !navigator.serviceWorker) {
            setPreviewUrl(url);
            setInitStage("ready", "Next.js dev server ready");
            return;
          }

          const sw = navigator.serviceWorker.controller;
          if (!sw) {
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => registerWithServiceWorker(),
              { once: true }
            );
            return;
          }

          const channel = new MessageChannel();

          // Wait for confirmation from SW before mounting iframe to prevent 503 race condition
          let confirmed = false;
          const onSwMessage = (e: MessageEvent) => {
            if (e.data?.type === "port:registered" && e.data?.port === port) {
              confirmed = true;
              navigator.serviceWorker.removeEventListener("message", onSwMessage);
              setPreviewUrl(url);
              setInitStage("ready", "Next.js dev server ready");
            }
          };
          navigator.serviceWorker.addEventListener("message", onSwMessage);

          sw.postMessage({ type: "port:register", port }, [channel.port1]);

          // Fallback timeout in case service worker does not echo back
          setTimeout(() => {
            if (!confirmed) {
              setPreviewUrl(url);
              setInitStage("ready", "Next.js dev server ready");
            }
          }, 150);

          channel.port2.onmessage = (event) => {
            const msg = event.data;
            if (msg && msg.type === "http:request") {
              (sb as any).bridge?.postMessage(msg, [msg.replyPort]);
            }
          };
        };

        registerWithServiceWorker();
      });

      sb.ports.on("close", ({ port }) => {
        appendLog(`ℹ Port ${port} closed`);
        if (activePort === port) {
          setActivePort(null);
          setPreviewUrl(null);
        }
        if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "port:unregister",
            port,
          });
        }
      });

      // Subscribe to sandbox filesystem changes
      if (typeof sb.fs.on === "function") {
        unsubscribeFsRef.current = sb.fs.on("change", () => {
          triggerAutoSave();
        });
        appendLog("✓ Registered real-time filesystem change listener.");
      }

      sandboxRef.current = sb;
      appendLog("✓ WebAssembly Sandbox kernel online.");

      // Initialize project workspace
      await initializeWorkspace(sb);

      return sb;
    } catch (err: any) {
      console.error("[Sandbox] Failed to initialize:", err);
      const msg = err?.message || String(err);
      setStatus("error");
      setInitStage("error", msg);
      setErrorMessage(`Sandbox Init Error: ${msg}`);
      appendLog(`❌ Initialization error: ${msg}`);
      return null;
    } finally {
      isInitializingRef.current = false;
    }
  }, [
    activePort,
    appendLog,
    initializeWorkspace,
    setActivePort,
    setErrorMessage,
    setInitStage,
    setPreviewUrl,
    setStatus,
    triggerAutoSave,
  ]);

  // Initial mount trigger
  useEffect(() => {
    if (hasSab && !sandboxRef.current && !isInitializingRef.current) {
      ensureSandbox();
    }
  }, [ensureSandbox, hasSab]);

  // Handle chatId transition (e.g. from null to newly created chatId on first prompt save)
  useEffect(() => {
    if (chatId && chatId !== prevChatIdRef.current) {
      prevChatIdRef.current = chatId;
      currentChatIdRef.current = chatId;
      if (sandboxRef.current) {
        triggerAutoSave();
      }
    }
  }, [chatId, triggerAutoSave]);

  // Handle incoming files from AI stream
  useEffect(() => {
    if (!files.length || !hasSab) return;

    // Filter to completed files
    const completeFiles = files.filter((f) => f.isComplete);
    if (!completeFiles.length) return;

    // Check if any file content actually changed
    let hasChanges = false;
    for (const f of completeFiles) {
      if (lastWrittenFilesRef.current.get(f.path) !== f.content) {
        hasChanges = true;
        break;
      }
    }

    if (!hasChanges) return;

    let isMounted = true;

    (async () => {
      const sb = await ensureSandbox();
      if (!sb || !isMounted) return;

      appendLog(`📦 Writing ${completeFiles.length} project files into /workspace...`);

      for (const file of completeFiles) {
        const targetPath = `/workspace/${file.path}`.replace(/\/+/g, "/");
        await writeSafeFile(sb, targetPath, file.content);
        lastWrittenFilesRef.current.set(file.path, file.content);
      }

      await refreshVfsTree();
      triggerAutoSave();

      // If server is not yet running, start it
      if (!procRef.current) {
        await runNextDev(sb);
      } else {
        appendLog("✓ Updated files synchronized to VirtualFS.");
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [
    files,
    hasSab,
    ensureSandbox,
    appendLog,
    refreshVfsTree,
    runNextDev,
    triggerAutoSave,
  ]);

  // Restart server manually
  const handleRestartServer = async () => {
    const sb = sandboxRef.current;
    if (sb) {
      clearLogs();
      await runNextDev(sb);
    }
  };

  // Retry initialization on error
  const handleRetryInit = async () => {
    clearLogs();
    setStatus("booting");
    setInitStage("booting", "Retrying initialization...");
    if (sandboxRef.current) {
      await initializeWorkspace(sandboxRef.current);
    } else {
      await ensureSandbox();
    }
  };

  // Reload preview iframe
  const handleReloadIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  // Inspect file content in files tab
  const handleInspectFile = async (filePath: string) => {
    const sb = sandboxRef.current;
    if (!sb) return;

    try {
      const fullPath = `/workspace/${filePath}`.replace(/\/+/g, "/");
      const content = await sb.fs.readFile(fullPath, "utf-8");
      setSelectedFileContent({ path: filePath, content });
    } catch (err: any) {
      setSelectedFileContent({
        path: filePath,
        content: `Error reading file: ${err?.message || err}`,
      });
    }
  };

  // Cleanup sandbox on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeFsRef.current) {
        unsubscribeFsRef.current();
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (procRef.current) {
        procRef.current.kill().catch(() => {});
      }
      if (sandboxRef.current) {
        sandboxRef.current.dispose().catch(() => {});
        sandboxRef.current = null;
      }
    };
  }, []);

  if (!hasSab) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-card border rounded-lg m-4 space-y-4">
        <AlertCircle className="size-12 text-destructive" />
        <h3 className="text-lg font-semibold">SharedArrayBuffer Not Available</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Buddhi Vibe Sandbox requires <code>SharedArrayBuffer</code> support for
          in-browser POSIX ring buffer streaming. Ensure
          Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers are
          configured properly.
        </p>
      </div>
    );
  }

  const isInitializing = initStage !== "ready" || !previewUrl;

  return (
    <div
      className={`flex flex-col h-full bg-background border-l border-border ${className}`}
    >
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40 shrink-0 gap-2">
        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          {status === "booting" || initStage !== "ready" ? (
            <Badge
              variant="outline"
              className="flex items-center gap-1.5 py-0.5 text-amber-400 border-amber-400/40 bg-amber-400/10 font-mono text-xs"
            >
              <Loader2 className="size-3 animate-spin" />
              <span className="capitalize">{initStage}...</span>
            </Badge>
          ) : status === "running" ? (
            <Badge
              variant="outline"
              className="flex items-center gap-1.5 py-0.5 text-emerald-400 border-emerald-400/40 bg-emerald-400/10 font-mono text-xs"
            >
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{activePort ? `Port ${activePort}` : "Running"}</span>
            </Badge>
          ) : status === "error" ? (
            <Badge variant="destructive" className="flex items-center gap-1.5 py-0.5 text-xs">
              <AlertCircle className="size-3" />
              <span>Error</span>
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="flex items-center gap-1.5 py-0.5 text-muted-foreground text-xs"
            >
              <span>Ready</span>
            </Badge>
          )}
        </div>

        {/* View Switcher Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="w-auto"
        >
          <TabsList className="h-8 p-0.5 bg-muted/60">
            <TabsTrigger value="preview" className="h-7 text-xs px-2.5 gap-1.5">
              <Eye className="size-3.5" />
              <span>Preview</span>
            </TabsTrigger>
            <TabsTrigger value="terminal" className="h-7 text-xs px-2.5 gap-1.5">
              <TerminalIcon className="size-3.5" />
              <span>Terminal</span>
              {logs.length > 0 && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({logs.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="files" className="h-7 text-xs px-2.5 gap-1.5">
              <FolderTree className="size-3.5" />
              <span>Files</span>
              {vfsTree.length > 0 && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({vfsTree.length})
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={handleReloadIframe}
            title="Reload Preview"
            disabled={!previewUrl}
          >
            <RotateCw className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={handleRestartServer}
            title="Restart Next.js Server"
            disabled={isInitializing}
          >
            <Play className="size-3.5" />
          </Button>
          {previewUrl && (
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              asChild
              title="Open in new window"
            >
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-zinc-950">
        {/* Preview Tab */}
        {activeTab === "preview" && (
          <div className="relative w-full h-full">
            {isInitializing ? (
              <SandboxLoading
                stage={initStage}
                progressText={initProgressText}
                logs={logs}
                errorMessage={errorMessage}
                onRetry={handleRetryInit}
                onClearLogs={clearLogs}
              />
            ) : previewUrl ? (
              <iframe
                key={iframeKey}
                src={previewUrl}
                className="w-full h-full border-0 bg-white dark:bg-zinc-900"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                title="Next.js App Preview"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                <FileCode className="size-10 text-muted-foreground/60" />
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">Waiting for Vibe Code...</h4>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Prompt the AI to build components or pages. The project runs live here.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terminal Tab */}
        {activeTab === "terminal" && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
              <span>virtual stdout / stderr stream</span>
              <Button
                size="icon"
                variant="ghost"
                className="size-6 text-zinc-400 hover:text-zinc-200"
                onClick={clearLogs}
                title="Clear Logs"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-3 font-mono text-xs text-zinc-300">
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`leading-relaxed whitespace-pre-wrap break-all ${
                      log.includes("[stderr]") || log.includes("❌")
                        ? "text-red-400"
                        : log.includes("✓") || log.includes("🚀")
                        ? "text-emerald-400"
                        : log.includes("⚡") || log.includes("📦") || log.includes("💾")
                        ? "text-sky-400"
                        : "text-zinc-300"
                    }`}
                  >
                    {log}
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-zinc-600 italic">
                    No output yet. Server logs will appear here when spawned.
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === "files" && (
          <div className="flex h-full divide-x divide-zinc-800">
            {/* File List */}
            <div className="w-1/3 min-w-[180px] h-full flex flex-col bg-zinc-900/50">
              <div className="px-3 py-1.5 border-b border-zinc-800 text-xs font-semibold text-zinc-400 flex items-center justify-between">
                <span>/workspace</span>
                <Badge variant="outline" className="text-[10px] py-0">
                  {vfsTree.length} files
                </Badge>
              </div>
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-0.5">
                  {vfsTree.map((f) => (
                    <button
                      key={f}
                      onClick={() => handleInspectFile(f)}
                      className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-1.5 truncate transition-colors ${
                        selectedFileContent?.path === f
                          ? "bg-primary/20 text-primary font-medium"
                          : "text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      <FileCode className="size-3.5 shrink-0 text-zinc-500" />
                      <span className="truncate">{f}</span>
                    </button>
                  ))}
                  {vfsTree.length === 0 && (
                    <div className="p-3 text-xs text-zinc-500 italic">
                      VirtualFS is empty.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* File Viewer */}
            <div className="flex-1 h-full flex flex-col bg-zinc-950">
              {selectedFileContent ? (
                <>
                  <div className="px-3 py-1.5 border-b border-zinc-800 text-xs font-mono text-zinc-400 flex items-center justify-between">
                    <span>{selectedFileContent.path}</span>
                    <span className="text-[10px] text-zinc-500">VirtualFS</span>
                  </div>
                  <ScrollArea className="flex-1 p-3">
                    <pre className="font-mono text-xs text-zinc-200 whitespace-pre-wrap">
                      {selectedFileContent.content}
                    </pre>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-zinc-600">
                  Select a file from the tree to view its content.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
