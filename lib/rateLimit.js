const buckets = new Map();

/**
 * Simple in-memory rate limiter (per key) using a rolling window.
 * Not production-grade across multiple servers, but adequate for dev/single-node.
 */
export async function applyRateLimit({
  key,
  windowMs = 10 * 60 * 1000,
  max = 20,
}) {
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
