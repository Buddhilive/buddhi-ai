"use client";

import { useState, useEffect, useCallback } from "react";
import { getSetting, setSetting, deleteSetting } from "@/lib/paper-storage";
import { useSettingsStore } from "@/stores/settings-store";

export const HF_TOKEN_KEY = "buddhi.hf_token";

export function useSettings() {
  const [hfToken, setHfTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const setHasConfiguredHFToken = useSettingsStore(
    (state) => state.setHasConfiguredHFToken
  );

  const loadToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stored = await getSetting(HF_TOKEN_KEY);
      setHfTokenState(stored);
      setHasConfiguredHFToken(Boolean(stored && stored.trim().length > 0));
    } catch (err) {
      console.error("Failed to load HF token:", err);
      setError("Unable to read settings from storage");
    } finally {
      setIsLoading(false);
    }
  }, [setHasConfiguredHFToken]);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  const saveHfToken = async (token: string): Promise<boolean> => {
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Token cannot be empty");
      return false;
    }
    try {
      await setSetting(HF_TOKEN_KEY, trimmed);
      setHfTokenState(trimmed);
      setHasConfiguredHFToken(true);
      setError(null);
      return true;
    } catch (err) {
      console.error("Failed to save HF token:", err);
      setError("Failed to persist token to storage");
      return false;
    }
  };

  const removeHfToken = async (): Promise<boolean> => {
    try {
      await deleteSetting(HF_TOKEN_KEY);
      setHfTokenState(null);
      setHasConfiguredHFToken(false);
      setError(null);
      return true;
    } catch (err) {
      console.error("Failed to delete HF token:", err);
      setError("Failed to remove token from storage");
      return false;
    }
  };

  return {
    hfToken,
    isLoading,
    error,
    saveHfToken,
    removeHfToken,
    reload: loadToken,
  };
}
