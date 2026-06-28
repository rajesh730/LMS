import { applyRateLimit } from "@/lib/rateLimit";

// No Upstash env in the test runner → exercises the in-memory rolling window.
describe("applyRateLimit (in-memory fallback)", () => {
  it("allows up to max hits, then blocks with a retryAfter", async () => {
    const key = `test-${Date.now()}-a`;
    const opts = { key, windowMs: 60_000, max: 3 };

    expect((await applyRateLimit(opts)).ok).toBe(true); // 1
    expect((await applyRateLimit(opts)).ok).toBe(true); // 2
    expect((await applyRateLimit(opts)).ok).toBe(true); // 3

    const blocked = await applyRateLimit(opts); // 4 → over the limit
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("keeps separate keys independent", async () => {
    const a = `test-${Date.now()}-b`;
    const b = `test-${Date.now()}-c`;
    await applyRateLimit({ key: a, windowMs: 60_000, max: 1 });
    const overA = await applyRateLimit({ key: a, windowMs: 60_000, max: 1 });
    const firstB = await applyRateLimit({ key: b, windowMs: 60_000, max: 1 });

    expect(overA.ok).toBe(false);
    expect(firstB.ok).toBe(true);
  });

  it("forgets hits once the window has elapsed", async () => {
    const key = `test-${Date.now()}-d`;
    // 1ms window: the previous hit is already stale on the next call.
    expect((await applyRateLimit({ key, windowMs: 1, max: 1 })).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 5));
    expect((await applyRateLimit({ key, windowMs: 1, max: 1 })).ok).toBe(true);
  });
});
