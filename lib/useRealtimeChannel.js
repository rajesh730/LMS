"use client";

import { useEffect, useMemo, useRef } from "react";

function normalizeChannels(channel) {
  return Array.isArray(channel)
    ? channel.map((item) => String(item || "").trim()).filter(Boolean)
    : String(channel || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export default function useRealtimeChannel(channel, onMessage, options = {}) {
  const {
    enabled = true,
    initialRetryMs = 1000,
    maxRetryMs = 15000,
    onStatusChange,
  } = options;
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
    if (!enabled || channels.length === 0 || typeof onMessageRef.current !== "function") {
      return undefined;
    }

    let active = true;
    let eventSource = null;
    let retryDelay = initialRetryMs;
    let retryTimeoutId = null;
    const channelSet = new Set(channels);

    const emitStatus = (status, detail = {}) => {
      if (typeof onStatusChangeRef.current === "function") {
        onStatusChangeRef.current({ status, ...detail });
      }
    };

    const scheduleReconnect = () => {
      if (!active) return;
      const delay = retryDelay;
      retryDelay = Math.min(retryDelay * 2, maxRetryMs);
      emitStatus("retrying", { retryInMs: delay });
      retryTimeoutId = setTimeout(connect, delay);
    };

    const closeCurrentSource = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    function connect() {
      if (!active) return;

      closeCurrentSource();
      emitStatus("connecting");

      eventSource = new EventSource(
        `/api/realtime/stream?channels=${encodeURIComponent(channelsKey)}`
      );

      eventSource.onmessage = (event) => {
        let payload = {};
        try {
          payload = JSON.parse(event.data || "{}");
        } catch (_error) {
          return;
        }

        if (payload.channel === "system") {
          retryDelay = initialRetryMs;
          emitStatus("connected", { payload });
          return;
        }

        if (payload.channel === "ping") {
          emitStatus("connected", { payload });
          return;
        }

        if (channelSet.has(payload.channel)) {
          retryDelay = initialRetryMs;
          onMessageRef.current(payload);
        }
      };

      eventSource.onerror = () => {
        emitStatus("disconnected");
        closeCurrentSource();
        scheduleReconnect();
      };
    }

    connect();

    return () => {
      active = false;
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
      closeCurrentSource();
      emitStatus("closed");
    };
  }, [channels, channelsKey, enabled, initialRetryMs, maxRetryMs]);
}
