"use client";

import { useCallback, useEffect, useState } from "react";
import useRealtimeChannel from "@/lib/useRealtimeChannel";
import useWorkIndicators from "@/lib/useWorkIndicators";

export default function useStudentReadingSurface({ endpoint, surface }) {
  const { markSurfaceSeen } = useWorkIndicators();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        setError("");
        const response = await fetch(endpoint, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || "Unable to load this page");
        }
        setData(payload);
      } catch (loadError) {
        setError(loadError.message || "Unable to load this page");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [endpoint]
  );

  useEffect(() => {
    void markSurfaceSeen(surface);
    void load();
  }, [load, markSurfaceSeen, surface]);

  useRealtimeChannel(
    ["student-notifications", "work-indicators"],
    useCallback(() => {
      void load({ silent: true });
    }, [load])
  );

  return { data, loading, error, reload: load };
}
