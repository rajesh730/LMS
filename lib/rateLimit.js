const buckets = new Map();

function getRedisConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REALTIME_REDIS_REST_URL ||
    "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REALTIME_REDIS_REST_TOKEN ||
    "";
  if (!url || !token) return null;
  return { url, token };
}

async function redisCommand(config, command) {
  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis command failed (${res.status})`);
  const json = await res.json();
  return json.result;
}

// Fixed-window counter shared across instances via Redis. One INCR per hit; the
// key expires at the end of the window so it self-cleans.
async function applyRedisRateLimit({ config, key, windowMs, max }) {
  const bucket = Math.floor(Date.now() / windowMs);
  const redisKey = `ratelimit:${key}:${bucket}`;
  const count = await redisCommand(config, ["INCR", redisKey]);
  if (count === 1) {
    await redisCommand(config, [
      "EXPIRE",
      redisKey,
      String(Math.ceil(windowMs / 1000)),
    ]);
  }
  if (count > max) {
    const elapsed = Date.now() - bucket * windowMs;
    return { ok: false, retryAfter: Math.ceil((windowMs - elapsed) / 1000) };
  }
  return { ok: true };
}

/**
 * Per-key rate limit. Uses Redis (cross-instance) when configured, otherwise an
 * in-memory rolling window. Never throws — on a Redis error it degrades to the
 * in-memory limiter so a transient outage can't lock everyone out or in.
 */
export async function applyRateLimit({
  key,
  windowMs = 10 * 60 * 1000,
  max = 20,
}) {
  const config = getRedisConfig();
  if (config) {
    try {
      return await applyRedisRateLimit({ config, key, windowMs, max });
    } catch {
      // fall through to in-memory
    }
  }

  const now = Date.now();
  const bucket = buckets.get(key) || [];
  const fresh = bucket.filter((ts) => now - ts < windowMs);
  fresh.push(now);
  buckets.set(key, fresh);

  if (fresh.length > max) {
    const retryAfter = Math.ceil((windowMs - (now - fresh[0])) / 1000);
    return { ok: false, retryAfter };
  }
  return { ok: true };
}
