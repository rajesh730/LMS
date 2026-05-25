"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useRealtimeChannel from "@/lib/useRealtimeChannel";

const DEFAULT_REFRESH_MS = 60000;

export default function useWorkIndicators({ enabled = true } = {}) {
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState("");
  const [indicators, setIndicators] = useState({});

  const loadIndicators = useCallback(
    async ({ silent = false } = {}) => {
      if (!enabled) return {};

      try {
        if (!silent) setLoading(true);
        setError("");

        const res = await fetch("/api/me/work-indicators", {
          cache: "no-store",
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload.message || "Failed to load work indicators");
        }

        const nextIndicators = payload.indicators || {};
        setIndicators(nextIndicators);
        return nextIndicators;
      } catch (loadError) {
        setError(loadError.message || "Failed to load work indicators");
        return {};
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [enabled]
  );

  useEffect(() => {
    void loadIndicators();
  }, [loadIndicators]);

  useEffect(() => {
    if (!enabled) return undefined;

    const intervalId = setInterval(() => {
      void loadIndicators({ silent: true });
    }, DEFAULT_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [enabled, loadIndicators]);

  useRealtimeChannel(
    [
      "work-indicators",
      "student-notifications",
      "school-notifications",
      "public-feed",
      "admin-diagnostics",
    ],
    useCallback(() => {
      void loadIndicators({ silent: true });
    }, [loadIndicators]),
    { enabled }
  );

  const getCount = useCallback(
    (key) => Number(indicators?.[key]?.count || 0),
    [indicators]
  );

  const getIndicator = useCallback(
    (key) => indicators?.[key] || { count: 0, tone: "action" },
    [indicators]
  );

  const markSurfaceSeen = useCallback(
    async (surface) => {
      if (!surface) return;

      await fetch("/api/me/work-indicators/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface }),
      }).catch(() => {});
      await loadIndicators({ silent: true });
    },
    [loadIndicators]
  );

  return useMemo(
    () => ({
      loading,
      error,
      indicators,
      getCount,
      getIndicator,
      loadIndicators,
      markSurfaceSeen,
    }),
    [error, getCount, getIndicator, indicators, loadIndicators, loading, markSurfaceSeen]
  );
}
