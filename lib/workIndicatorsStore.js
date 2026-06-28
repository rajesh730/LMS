"use client";

import { subscribeRealtime } from "@/lib/realtimeClient";

// A single shared work-indicators store for the whole tab. Every component that
// needs the indicator badges (sidebar, page panels, …) used to fetch
// /api/me/work-indicators independently and poll it every 60s — N copies of the
// same request. They now share one fetch, one poll, and one realtime
// subscription through this store.

const POLL_MS = 60000;
const REALTIME_CHANNELS = [
  "work-indicators",
  "student-notifications",
  "school-notifications",
  "public-feed",
  "admin-diagnostics",
];

const DEFAULT_SNAPSHOT = { indicators: {}, loading: false, error: "" };

let state = DEFAULT_SNAPSHOT;
const subscribers = new Set();
let pollId = null;
let unsubRealtime = null;
let started = false;

function emit() {
  for (const callback of subscribers) callback();
}

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

async function load({ silent = false } = {}) {
  if (!silent) setState({ loading: true });
  try {
    const res = await fetch("/api/me/work-indicators", { cache: "no-store" });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload.message || "Failed to load work indicators");
    }
    setState({ indicators: payload.indicators || {}, loading: false, error: "" });
    return payload.indicators || {};
  } catch (error) {
    setState({
      loading: false,
      error: error.message || "Failed to load work indicators",
    });
    return {};
  }
}

function start() {
  if (started) return;
  started = true;
  void load();
  pollId = setInterval(() => void load({ silent: true }), POLL_MS);
  unsubRealtime = subscribeRealtime(REALTIME_CHANNELS, () =>
    void load({ silent: true })
  );
}

function stop() {
  started = false;
  if (pollId) clearInterval(pollId);
  pollId = null;
  unsubRealtime?.();
  unsubRealtime = null;
}

export function subscribeWorkIndicators(callback) {
  subscribers.add(callback);
  if (subscribers.size === 1) start();
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) stop();
  };
}

export function getWorkIndicatorsSnapshot() {
  return state;
}

export function getServerWorkIndicatorsSnapshot() {
  return DEFAULT_SNAPSHOT;
}

export function reloadWorkIndicators(options) {
  return load(options);
}

export async function markWorkSurfaceSeen(surface) {
  if (!surface) return;
  await fetch("/api/me/work-indicators/seen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ surface }),
  }).catch(() => {});
  await load({ silent: true });
}
