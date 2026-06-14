import { EventEmitter } from "events";
import { randomUUID } from "crypto";

const INSTANCE_ID = randomUUID();
const REDIS_STREAM_KEY = "pravyo:realtime:events";
const REDIS_POLL_INTERVAL_MS = 1500;
const REDIS_BATCH_SIZE = 100;

function getMetrics() {
  if (!globalThis.__pravyoRealtimeMetrics) {
    globalThis.__pravyoRealtimeMetrics = {
      startedAt: new Date().toISOString(),
      localPublished: 0,
      redisPublishAttempts: 0,
      redisPublishFailures: 0,
      redisPollAttempts: 0,
      redisPollFailures: 0,
      redisEventsReceived: 0,
      lastPublishedAt: null,
      lastRedisPublishFailureAt: null,
      lastRedisPublishError: null,
      lastRedisPollFailureAt: null,
      lastRedisPollError: null,
    };
  }

  return globalThis.__pravyoRealtimeMetrics;
}

function getBus() {
  if (!globalThis.__pravyoRealtimeBus) {
    globalThis.__pravyoRealtimeBus = new EventEmitter();
    globalThis.__pravyoRealtimeBus.setMaxListeners(100);
  }

  return globalThis.__pravyoRealtimeBus;
}

function getRedisConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REALTIME_REDIS_REST_URL ||
    "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REALTIME_REDIS_REST_TOKEN ||
    "";

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

function isRedisEnabled() {
  return Boolean(getRedisConfig());
}

async function runRedisCommand(command) {
  const config = getRedisConfig();
  if (!config) return null;

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Redis command failed with status ${response.status}`);
  }

  return response.json();
}

function buildEvent(channel, payload = {}) {
  return {
    id: randomUUID(),
    instanceId: INSTANCE_ID,
    channel,
    payload,
    timestamp: new Date().toISOString(),
  };
}

function dispatchEvent(event) {
  if (!event?.channel) return;
  getBus().emit(event.channel, event);
}

function normalizeError(error) {
  return error?.message || String(error || "Unknown realtime error");
}

function recordLocalPublish() {
  const metrics = getMetrics();
  metrics.localPublished += 1;
  metrics.lastPublishedAt = new Date().toISOString();
}

function recordRedisPublishAttempt() {
  getMetrics().redisPublishAttempts += 1;
}

function recordRedisPublishFailure(error) {
  const metrics = getMetrics();
  metrics.redisPublishFailures += 1;
  metrics.lastRedisPublishFailureAt = new Date().toISOString();
  metrics.lastRedisPublishError = normalizeError(error);
  console.error("Realtime Redis publish failed:", metrics.lastRedisPublishError);
}

function recordRedisPollAttempt() {
  getMetrics().redisPollAttempts += 1;
}

function recordRedisPollFailure(error) {
  const metrics = getMetrics();
  metrics.redisPollFailures += 1;
  metrics.lastRedisPollFailureAt = new Date().toISOString();
  metrics.lastRedisPollError = normalizeError(error);
  console.error("Realtime Redis poll failed:", metrics.lastRedisPollError);
}

function recordRedisEventsReceived(count) {
  getMetrics().redisEventsReceived += count;
}

async function publishToRedis(event) {
  recordRedisPublishAttempt();
  await runRedisCommand([
    "XADD",
    REDIS_STREAM_KEY,
    "*",
    "event",
    JSON.stringify(event),
  ]);
}

async function pollRedisEvents(lastId) {
  recordRedisPollAttempt();
  const result = await runRedisCommand([
    "XRANGE",
    REDIS_STREAM_KEY,
    lastId ? `(${lastId}` : "-",
    "+",
    "COUNT",
    String(REDIS_BATCH_SIZE),
  ]);

  const entries = Array.isArray(result?.result) ? result.result : [];
  const events = entries
    .map((entry) => {
      const [, fields] = entry;
      const pairs = Array.isArray(fields) ? fields : [];
      for (let index = 0; index < pairs.length; index += 2) {
        if (pairs[index] === "event" && pairs[index + 1]) {
          try {
            return {
              redisId: entry[0],
              ...JSON.parse(pairs[index + 1]),
            };
          } catch (_error) {
            return null;
          }
        }
      }
      return null;
    })
    .filter(Boolean);

  return {
    lastId: events.length > 0 ? events[events.length - 1].redisId : lastId,
    events,
  };
}

function startRedisSubscription(listener) {
  let lastId = "";
  let stopped = false;
  let timeoutId = null;
  const seenEventIds = new Set();

  const schedulePoll = (delay = REDIS_POLL_INTERVAL_MS) => {
    timeoutId = setTimeout(async () => {
      try {
        const polled = await pollRedisEvents(lastId);
        lastId = polled.lastId || lastId;
        recordRedisEventsReceived(polled.events.length);

        polled.events.forEach((event) => {
          if (seenEventIds.has(event.id)) return;
          seenEventIds.add(event.id);
          if (seenEventIds.size > 500) {
            const oldest = seenEventIds.values().next().value;
            seenEventIds.delete(oldest);
          }
          if (event.instanceId === INSTANCE_ID) return;
          listener(event);
        });
      } catch (error) {
        recordRedisPollFailure(error);
      } finally {
        if (!stopped) {
          schedulePoll();
        }
      }
    }, delay);
  };

  schedulePoll(0);

  return () => {
    stopped = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}

export function publishRealtimeEvent(channel, payload = {}) {
  const event = buildEvent(channel, payload);
  dispatchEvent(event);
  recordLocalPublish();

  if (isRedisEnabled()) {
    void publishToRedis(event).catch(recordRedisPublishFailure);
  }
}

export function subscribeRealtimeEvent(channel, listener) {
  const bus = getBus();
  const wrappedListener = (event) => {
    if (event?.channel === channel) {
      listener(event);
    }
  };
  bus.on(channel, wrappedListener);
  const stopRedisSubscription = isRedisEnabled()
    ? startRedisSubscription((event) => {
        if (event?.channel === channel) {
          listener(event);
        }
      })
    : () => {};

  return () => {
    stopRedisSubscription();
    bus.off(channel, wrappedListener);
  };
}

export function getRealtimeHealthSnapshot() {
  const metrics = getMetrics();
  return {
    provider: isRedisEnabled() ? "redis-rest-stream" : "in-memory",
    redisConfigured: isRedisEnabled(),
    instanceId: INSTANCE_ID,
    streamKey: REDIS_STREAM_KEY,
    pollIntervalMs: REDIS_POLL_INTERVAL_MS,
    startedAt: metrics.startedAt,
    counters: {
      localPublished: metrics.localPublished,
      redisPublishAttempts: metrics.redisPublishAttempts,
      redisPublishFailures: metrics.redisPublishFailures,
      redisPollAttempts: metrics.redisPollAttempts,
      redisPollFailures: metrics.redisPollFailures,
      redisEventsReceived: metrics.redisEventsReceived,
    },
    lastPublishedAt: metrics.lastPublishedAt,
    lastErrors: {
      redisPublish: metrics.lastRedisPublishError
        ? {
            message: metrics.lastRedisPublishError,
            at: metrics.lastRedisPublishFailureAt,
          }
        : null,
      redisPoll: metrics.lastRedisPollError
        ? {
            message: metrics.lastRedisPollError,
            at: metrics.lastRedisPollFailureAt,
          }
        : null,
    },
  };
}
