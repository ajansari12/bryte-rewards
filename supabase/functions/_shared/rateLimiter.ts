// Token-bucket rate limiter (in-memory, per-IP, per function instance)
// Allows CAPACITY requests per WINDOW_MS; refills linearly.

const CAPACITY = 10;
const WINDOW_MS = 60_000; // 1 minute

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

function getIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function refill(bucket: Bucket, now: number): void {
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = (elapsed / WINDOW_MS) * CAPACITY;
  bucket.tokens = Math.min(CAPACITY, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

/**
 * Returns a 429 Response if the caller has exceeded the rate limit, or null if allowed.
 * Usage: const limited = checkRateLimit(req); if (limited) return limited;
 */
export function checkRateLimit(req: Request): Response | null {
  const ip = getIP(req);
  const now = Date.now();

  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { tokens: CAPACITY, lastRefill: now };
    buckets.set(ip, bucket);
  }

  refill(bucket, now);

  if (bucket.tokens < 1) {
    const msToRefillOne = ((1 - bucket.tokens) / CAPACITY) * WINDOW_MS;
    const retryAfterSec = Math.max(1, Math.ceil(msToRefillOne / 1000));
    const resetEpoch = Math.ceil((now + msToRefillOne) / 1000);
    return new Response(JSON.stringify({ message: "Rate limit exceeded. Try again in a moment.", retry_after: retryAfterSec }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(CAPACITY),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(resetEpoch),
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  bucket.tokens -= 1;
  return null;
}
