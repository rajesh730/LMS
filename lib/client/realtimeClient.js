"use client";

// A single shared SSE connection for the whole tab.
//
// Previously every useRealtimeChannel() opened its own EventSource. With the
// sidebar, notification bell, work-indicators and per-page panels all mounting
// at once, a page held 4-6 permanent connections — and browsers cap HTTP/1.1 at
// ~6 per origin, so real fetch() calls queued behind them and the whole app felt
// slow. This bus keeps ONE EventSource subscribed to the union of every active
// channel and fans messages out to the registered listeners.

let eventSource = null;
let connectedKey = ""; // the channels key the current EventSource is using
let reconnectTimer = null;
let ensureTimer = null;
let retryDelay = 1000;
const MAX_RETRY = 15000;

// listener: { channels: Set<string>, onMessage, onStatusChange }
const listeners = new Set();
// channel -> number of listeners (so we drop a channel from the union only when
// nobody needs it anymore).
const channelCounts = new Map();

function activeChannelsKey() {
  return [...channelCounts.keys()].sort().join(",");
}

function emitStatus(status, detail = {}) {
  for (const listener of listeners) {
    listener.onStatusChange?.({ status, ...detail });
  }
}

function dispatch(payload) {
  const channel = payload?.channel;
  if (!channel) return;
  for (const listener of listeners) {
    if (listener.channels.has(channel)) {
      try {
        listener.onMessage(payload);
      } catch {
        /* a bad listener must not break the bus */
      }
    }
  }
}

function closeSource() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  const delay = retryDelay;
  retryDelay = Math.min(retryDelay * 2, MAX_RETRY);
  emitStatus("retrying", { retryInMs: delay });
  reconnectTimer = setTimeout(() => {
    connectedKey = "";
    ensureConnection();
  }, delay);
}

function connect(key) {
  closeSource();
  connectedKey = key;
  emitStatus("connecting");

  eventSource = new EventSource(
    `/api/realtime/stream?channels=${encodeURIComponent(key)}`
  );

  eventSource.onmessage = (event) => {
    let payload = {};
    try {
      payload = JSON.parse(event.data || "{}");
    } catch {
      return;
    }
    if (payload.channel === "system" || payload.channel === "ping") {
      retryDelay = 1000;
      emitStatus("connected", { payload });
      return;
    }
    dispatch(payload);
  };

  eventSource.onerror = () => {
    emitStatus("disconnected");
    closeSource();
    scheduleReconnect();
  };
}

function ensureConnection() {
  if (typeof window === "undefined") return;
  const key = activeChannelsKey();

  if (key === "") {
    clearTimeout(reconnectTimer);
    closeSource();
    connectedKey = "";
    return;
  }
  // Already streaming exactly the channels we need.
  if (eventSource && key === connectedKey) return;
  connect(key);
}

// Batch the storm of subscribe/unsubscribe calls that happens while a page's
// components mount, so we open the connection once with the full union.
function scheduleEnsure() {
  clearTimeout(ensureTimer);
  ensureTimer = setTimeout(ensureConnection, 60);
}

export function subscribeRealtime(channels, onMessage, onStatusChange) {
  const channelSet = new Set(channels);
  const listener = { channels: channelSet, onMessage, onStatusChange };
  listeners.add(listener);
  for (const channel of channelSet) {
    channelCounts.set(channel, (channelCounts.get(channel) || 0) + 1);
  }
  scheduleEnsure();

  return () => {
    listeners.delete(listener);
    for (const channel of channelSet) {
      const next = (channelCounts.get(channel) || 0) - 1;
      if (next <= 0) channelCounts.delete(channel);
      else channelCounts.set(channel, next);
    }
    scheduleEnsure();
  };
}
