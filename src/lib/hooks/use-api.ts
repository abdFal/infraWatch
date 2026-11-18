"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface ApiState<T> {
  data: T | undefined;
  error: { status: number; message: string } | undefined;
  /** True only while there is nothing to show yet: render skeletons. */
  isLoading: boolean;
  /** True while a background refresh runs: keep showing the current data. */
  isRefreshing: boolean;
  lastUpdated: Date | undefined;
  refetch: () => void;
}

interface Result<T> {
  url: string;
  data?: T;
  error?: { status: number; message: string };
  lastUpdated?: Date;
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" }, cache: "no-store" });
  if (response.status === 401) {
    // Session expired: full page load to the login page, discarding client state.
    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set("callbackUrl", window.location.pathname);
    window.location.replace(loginUrl.href);
    throw Object.assign(new Error("Your session has expired."), { status: 401 });
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.message ?? "The server returned an unexpected response.";
    throw Object.assign(new Error(message), { status: response.status });
  }
  return body.data as T;
}

/**
 * Fetches JSON from one of this app's own /api routes, with optional
 * auto-refresh. Auto-refresh pauses while the browser tab is hidden.
 */
export function useApi<T>(url: string | null, options: { refreshIntervalSec?: number } = {}): ApiState<T> {
  const { refreshIntervalSec = 0 } = options;
  const [result, setResult] = useState<Result<T> | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);
  const loadedUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const background = loadedUrl.current === url;

    fetchJson<T>(url, controller.signal)
      .then((data) => {
        loadedUrl.current = url;
        setResult({ url, data, lastUpdated: new Date() });
      })
      .catch((error: Error & { status?: number }) => {
        if (controller.signal.aborted) return;
        const err = {
          status: error.status ?? 0,
          message: error.status ? error.message : "Network error. Check your connection and try again.",
        };
        if (background) {
          // Keep the last good data on screen; notify once per URL.
          toast.error("Refresh failed", { description: err.message, id: `refresh:${url}` });
        } else {
          setResult({ url, error: err });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsRefreshing(false);
      });

    return () => controller.abort();
  }, [url, nonce]);

  useEffect(() => {
    if (!url || refreshIntervalSec <= 0) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setIsRefreshing(true);
      setNonce((n) => n + 1);
    }, refreshIntervalSec * 1000);
    return () => window.clearInterval(id);
  }, [url, refreshIntervalSec]);

  const refetch = useCallback(() => {
    setIsRefreshing(true);
    setNonce((n) => n + 1);
  }, []);

  const current = result && result.url === url ? result : undefined;
  return {
    data: current?.data,
    error: current?.error,
    isLoading: Boolean(url) && !current,
    isRefreshing: isRefreshing && Boolean(current?.data),
    lastUpdated: current?.lastUpdated,
    refetch,
  };
}
