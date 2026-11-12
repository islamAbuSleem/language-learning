/**
 * A small in-memory rate limiter for the auth endpoints.
 *
 * The point is to make password guessing and magic-link farming boring, not
 * to survive a determined flood: a single process holds the counts, so a
 * second server instance would hold its own. That limit is written here so a
 * later move to shared state knows what to replace.
 */
interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/**
 * Whether one more attempt is allowed, counting this one if so.
 *
 * @param key Who is asking, e.g. `login:203.0.113.7`.
 * @param limit How many attempts fit in the window.
 * @param windowMs How long the window lasts.
 * @param now Epoch milliseconds.
 */
export function allowAttempt(key: string, limit: number, windowMs: number, now: number): boolean {
  // Forget old buckets when an attempt arrives, so the map cannot grow
  // without bound on a long-lived server.
  if (buckets.size > 10_000) {
    for (const [other, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(other)
    }
  }

  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) return false

  bucket.count += 1
  return true
}

/** Forget everything. Tests only. */
export function resetRateLimits(): void {
  buckets.clear()
}
