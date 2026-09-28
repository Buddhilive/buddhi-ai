"use client";

import { useEffect } from "react";

export function SandboxServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sandbox-sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[SandboxSW] Registered successfully with scope:", registration.scope);
        })
        .catch((err) => {
          console.warn("[SandboxSW] Registration failed:", err);
        });
    }
  }, []);

  return null;
}
