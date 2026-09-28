"use client";

import React, { useEffect, useState } from "react";
import { HardDrive, AlertTriangle } from "lucide-react";

export function StorageQuotaIndicator() {
  const [usageMB, setUsageMB] = useState<number | null>(null);
  const [quotaMB, setQuotaMB] = useState<number | null>(null);
  const [isNearLimit, setIsNearLimit] = useState(false);

  useEffect(() => {
    async function checkQuota() {
      if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          if (estimate.usage !== undefined && estimate.quota !== undefined) {
            const uMB = Math.round(estimate.usage / (1024 * 1024));
            const qMB = Math.round(estimate.quota / (1024 * 1024));
            setUsageMB(uMB);
            setQuotaMB(qMB);
            // Alert if usage > 80% of quota or > 1GB
            if (uMB > 1024 || (qMB > 0 && uMB / qMB > 0.8)) {
              setIsNearLimit(true);
            }
          }
        } catch (err) {
          console.warn("[StorageQuotaIndicator] Could not read estimate:", err);
        }
      }
    }
    checkQuota();
  }, []);

  if (usageMB === null) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border font-mono transition-colors ${
        isNearLimit
          ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
          : "border-border bg-muted/40 text-muted-foreground"
      }`}
    >
      {isNearLimit ? (
        <AlertTriangle className="h-3 w-3 shrink-0" />
      ) : (
        <HardDrive className="h-3 w-3 shrink-0" />
      )}
      <span>
        {usageMB} MB {quotaMB ? `/ ${Math.round(quotaMB / 1024)} GB` : "used"}
      </span>
    </div>
  );
}
