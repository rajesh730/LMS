"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  subscribeWorkIndicators,
  getWorkIndicatorsSnapshot,
  getServerWorkIndicatorsSnapshot,
  reloadWorkIndicators,
  markWorkSurfaceSeen,
} from "@/lib/workIndicatorsStore";

const NOOP_UNSUBSCRIBE = () => {};
const DISABLED_SNAPSHOT = { indicators: {}, loading: false, error: "" };

// All instances read from one shared store (single fetch + poll + realtime
// subscription for the whole tab), so mounting this hook in many components no
// longer multiplies the network traffic.
export default function useWorkIndicators({ enabled = true } = {}) {
  const subscribe = enabled ? subscribeWorkIndicators : () => NOOP_UNSUBSCRIBE;
  const getSnapshot = enabled
    ? getWorkIndicatorsSnapshot
    : () => DISABLED_SNAPSHOT;

  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerWorkIndicatorsSnapshot
  );

  const { indicators, loading, error } = state;

  const loadIndicators = useCallback(
    (options) => (enabled ? reloadWorkIndicators(options) : Promise.resolve({})),
    [enabled]
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
    (surface) => (enabled ? markWorkSurfaceSeen(surface) : Promise.resolve()),
    [enabled]
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
