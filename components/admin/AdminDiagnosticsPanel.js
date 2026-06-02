"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaBroadcastTower,
  FaCheckCircle,
  FaDatabase,
  FaExclamationTriangle,
  FaHeartbeat,
  FaRedoAlt,
  FaSatelliteDish,
} from "react-icons/fa";
import useRealtimeChannel from "@/lib/useRealtimeChannel";

const DIAGNOSTIC_CHANNELS = [
  {
    id: "admin-diagnostics",
    label: "Admin diagnostics",
    description: "Safe control channel used by this page.",
  },
  {
    id: "public-feed",
    label: "Public feed",
    description: "Verifies public feed realtime delivery.",
  },
  {
    id: "student-notifications",
    label: "Student notifications",
    description: "Verifies student notice channel delivery.",
  },
  {
    id: "school-notifications",
    label: "School notifications",
    description: "Verifies school notice channel delivery.",
  },
];

function formatDateTime(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function StatCard({ icon: Icon, label, value, tone = "blue" }) {
  const toneClasses = {
    blue: "border-[#bfd7f7] bg-[#eaf2ff] text-[#0a2f66]",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <div className={`rounded-2xl border p-5 ${toneClasses[tone] || toneClasses.blue}`}>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/70">
          <Icon />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em]">{label}</p>
          <p className="mt-1 text-2xl font-black">{value}</p>
        </div>
      </div>
    </div>
  );
}

function CheckRow({ label, ok, detail }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[#d7cdbb] bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-[#17120a]">{label}</p>
        <p className="mt-1 text-sm text-[#52657d]">{detail}</p>
      </div>
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
          ok
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border border-amber-200 bg-amber-50 text-amber-700"
        }`}
      >
        {ok ? <FaCheckCircle /> : <FaExclamationTriangle />}
        {ok ? "OK" : "Attention"}
      </span>
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#d7cdbb] bg-white px-3 py-2">
      <span className="text-sm text-[#52657d]">{label}</span>
      <span className="text-sm font-bold text-[#17120a]">{value}</span>
    </div>
  );
}

function ChannelPingRow({ channel, lastPing, pending, onPing }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#d7cdbb] bg-white p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold text-[#17120a]">{channel.label}</p>
        <p className="mt-1 text-sm text-[#52657d]">{channel.description}</p>
        <p className="mt-2 text-xs text-[#52657d]">
          Last received:{" "}
          <span className="font-semibold text-[#17120a]">
            {lastPing ? formatDateTime(lastPing.timestamp) : "Not yet"}
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => onPing(channel.id)}
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#bfd7f7] bg-white px-4 py-2 text-sm font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff] disabled:cursor-wait disabled:opacity-70"
      >
        <FaSatelliteDish />
        {pending ? "Sending..." : "Ping"}
      </button>
    </div>
  );
}

export default function AdminDiagnosticsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [streamConnected, setStreamConnected] = useState(false);
  const [lastPing, setLastPing] = useState(null);
  const [channelPings, setChannelPings] = useState({});
  const [pendingChannel, setPendingChannel] = useState("");
  const [eventChannelId, setEventChannelId] = useState("");

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/diagnostics", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to load diagnostics");
      }
      setSummary(data);
    } catch (loadError) {
      setError(loadError.message || "Failed to load diagnostics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const realtimeChannels = useMemo(
    () => [
      ...DIAGNOSTIC_CHANNELS.map((channel) => channel.id),
      ...(eventChannelId ? [`event-${eventChannelId}-notices`] : []),
    ],
    [eventChannelId]
  );

  useRealtimeChannel(
    realtimeChannels,
    useCallback((data) => {
      setStreamConnected(true);
      if (data.payload?.kind !== "diagnostic-ping") return;
      setLastPing(data);
      setChannelPings((current) => ({
        ...current,
        [data.channel]: data,
      }));
    }, []),
    {
      onStatusChange: ({ status }) => {
        setStreamConnected(status === "connected");
      },
    }
  );

  const sendPing = useCallback(async (channel = "admin-diagnostics") => {
    try {
      setPendingChannel(channel);
      const res = await fetch("/api/admin/diagnostics/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          channel === "event-notices"
            ? { channel, eventId: eventChannelId }
            : { channel }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to send realtime ping");
      }
    } catch (pingError) {
      setError(pingError.message || "Failed to send realtime ping");
    } finally {
      setPendingChannel("");
    }
  }, [eventChannelId]);

  const checks = useMemo(() => {
    if (!summary) return [];

    return [
      {
        label: "Database connection",
        ok: Boolean(summary.database?.connected),
        detail: "Diagnostics summary loaded from MongoDB-backed APIs.",
      },
      {
        label: "Realtime stream",
        ok: streamConnected,
        detail: streamConnected
          ? "Admin diagnostics stream is connected."
          : "Open stream did not confirm connection yet.",
      },
      {
        label: "Realtime provider",
        ok: true,
        detail: `Current provider: ${summary.realtime?.provider || "unknown"}.`,
      },
      {
        label: "Realtime publish health",
        ok: !summary.realtime?.lastErrors?.redisPublish,
        detail: summary.realtime?.lastErrors?.redisPublish
          ? `Last publish failure: ${summary.realtime.lastErrors.redisPublish.message}`
          : "No Redis publish failures recorded for this server instance.",
      },
      {
        label: "Realtime poll health",
        ok: !summary.realtime?.lastErrors?.redisPoll,
        detail: summary.realtime?.lastErrors?.redisPoll
          ? `Last poll failure: ${summary.realtime.lastErrors.redisPoll.message}`
          : "No Redis polling failures recorded for this server instance.",
      },
      {
        label: "Round-trip ping",
        ok: Boolean(lastPing),
        detail: lastPing
          ? `Last ping received at ${formatDateTime(lastPing.timestamp)}.`
          : "No diagnostics ping received yet in this session.",
      },
    ];
  }, [lastPing, streamConnected, summary]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#d7cdbb] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-[#52657d]">
              Internal QA
            </p>
            <h1 className="mt-2 text-3xl font-black text-[#17120a]">
              Platform Diagnostics
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52657d]">
              Verify realtime delivery, notices, and core public counters without
              jumping across multiple accounts and screens.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadSummary()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#bfd7f7] bg-white px-4 py-2 text-sm font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff]"
            >
              <FaRedoAlt />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void sendPing("admin-diagnostics")}
              disabled={Boolean(pendingChannel)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#123f7d] disabled:cursor-wait disabled:opacity-70"
            >
              <FaSatelliteDish />
              {pendingChannel === "admin-diagnostics"
                ? "Sending..."
                : "Send Realtime Ping"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !summary ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl border border-[#d7cdbb] bg-white"
            />
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              icon={FaBell}
              label="Platform Notices"
              value={summary.notifications?.platformNoticeCount ?? 0}
            />
            <StatCard
              icon={FaBroadcastTower}
              label="Event Notices"
              value={summary.notifications?.eventNoticeCount ?? 0}
              tone="emerald"
            />
            <StatCard
              icon={FaHeartbeat}
              label="Public Events"
              value={summary.publicEvents?.publicEventCount ?? 0}
              tone="amber"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4 rounded-2xl border border-[#d7cdbb] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#17120a]">Checks</h2>
              {checks.map((check) => (
                <CheckRow
                  key={check.label}
                  label={check.label}
                  ok={check.ok}
                  detail={check.detail}
                />
              ))}
            </div>

            <div className="space-y-4 rounded-2xl border border-[#d7cdbb] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#17120a]">Summary</h2>
              <div className="rounded-xl border border-[#d7cdbb] bg-[#f8fbff] p-4 text-sm text-[#344f77]">
                <p>
                  Diagnostics generated:{" "}
                  <span className="font-semibold text-[#17120a]">
                    {formatDateTime(summary.generatedAt)}
                  </span>
                </p>
                <p className="mt-2">
                  Realtime backend:{" "}
                  <span className="font-semibold text-[#17120a]">
                    {summary.realtime?.provider || "unknown"}
                  </span>
                </p>
                <p className="mt-2">
                  Redis configured:{" "}
                  <span className="font-semibold text-[#17120a]">
                    {summary.realtime?.redisConfigured ? "Yes" : "No"}
                  </span>
                </p>
                <p className="mt-2">
                  Realtime instance:{" "}
                  <span className="font-semibold text-[#17120a]">
                    {summary.realtime?.instanceId || "unknown"}
                  </span>
                </p>
                <p className="mt-2">
                  Student-targeted notices:{" "}
                  <span className="font-semibold text-[#17120a]">
                    {summary.notifications?.studentNoticeCount ?? 0}
                  </span>
                </p>
              </div>

              <div className="rounded-xl border border-[#d7cdbb] bg-white p-4 text-sm text-[#52657d]">
                <p className="font-semibold text-[#17120a]">Realtime QA note</p>
                <p className="mt-2 leading-6">
                  Use the ping buttons to verify each channel can receive a published
                  realtime event on demand. Diagnostic payloads use a safe kind and do
                  not create notices or user-facing records.
                </p>
              </div>

              <div className="rounded-xl border border-[#d7cdbb] bg-[#f8fbff] p-4">
                <p className="text-sm font-semibold text-[#17120a]">
                  Realtime Counters
                </p>
                <div className="mt-3 grid gap-2">
                  <MetricRow
                    label="Local publishes"
                    value={summary.realtime?.counters?.localPublished ?? 0}
                  />
                  <MetricRow
                    label="Redis publish attempts"
                    value={
                      summary.realtime?.counters?.redisPublishAttempts ?? 0
                    }
                  />
                  <MetricRow
                    label="Redis publish failures"
                    value={
                      summary.realtime?.counters?.redisPublishFailures ?? 0
                    }
                  />
                  <MetricRow
                    label="Redis poll attempts"
                    value={summary.realtime?.counters?.redisPollAttempts ?? 0}
                  />
                  <MetricRow
                    label="Redis poll failures"
                    value={summary.realtime?.counters?.redisPollFailures ?? 0}
                  />
                  <MetricRow
                    label="Redis events received"
                    value={summary.realtime?.counters?.redisEventsReceived ?? 0}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d7cdbb] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#17120a]">
                  Channel Pings
                </h2>
                <p className="mt-1 text-sm text-[#52657d]">
                  Send diagnostic-only events through each realtime channel.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={eventChannelId}
                  onChange={(event) => setEventChannelId(event.target.value)}
                  placeholder="Event ID"
                  className="min-h-10 rounded-lg border border-[#d7cdbb] px-3 text-sm text-[#17120a] outline-none transition focus:border-[#2f7fdb]"
                />
                <button
                  type="button"
                  onClick={() => void sendPing("event-notices")}
                  disabled={!eventChannelId.trim() || Boolean(pendingChannel)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0a2f66] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#123f7d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaSatelliteDish />
                  {pendingChannel === "event-notices"
                    ? "Sending..."
                    : "Ping Event"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {DIAGNOSTIC_CHANNELS.map((channel) => (
                <ChannelPingRow
                  key={channel.id}
                  channel={channel}
                  lastPing={channelPings[channel.id]}
                  pending={pendingChannel === channel.id}
                  onPing={sendPing}
                />
              ))}
              {eventChannelId.trim() && (
                <ChannelPingRow
                  channel={{
                    id: "event-notices",
                    label: "Event notices",
                    description: `Verifies event-${eventChannelId.trim()}-notices delivery.`,
                  }}
                  lastPing={
                    channelPings[`event-${eventChannelId.trim()}-notices`]
                  }
                  pending={pendingChannel === "event-notices"}
                  onPing={sendPing}
                />
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
