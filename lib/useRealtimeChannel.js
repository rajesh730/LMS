"use client";

import { useEffect, useMemo, useRef } from "react";
import { subscribeRealtime } from "@/lib/realtimeClient";

function normalizeChannels(channel) {
  return Array.isArray(channel)
    ? channel.map((item) => String(item || "").trim()).filter(Boolean)
    : String(channel || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

// Subscribe to one or more realtime channels. All hooks share a single
// multiplexed EventSource (see lib/realtimeClient) instead of each opening its
// own connection, so a page no longer exhausts the browser's connection pool.
export default function useRealtimeChannel(channel, onMessage, options = {}) {
  const { enabled = true, onStatusChange } = options;
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  const channels = useMemo(() => normalizeChannels(channel), [channel]);
  const channelsKey = channels.join(",");

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    if (!enabled || channels.length === 0) {
      return undefined;
    }

    const unsubscribe = subscribeRealtime(
      channels,
      (payload) => onMessageRef.current?.(payload),
      (status) => onStatusChangeRef.current?.(status)
    );

    return unsubscribe;
    // channelsKey captures channel-set changes; refs keep callbacks fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelsKey, enabled]);
}
