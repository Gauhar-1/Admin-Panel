/**
 * Lightweight in-memory rate limiter for the login endpoint.
 *
 * Tracks failed login attempts by IP address and blocks after a configurable
 * threshold within a time window. Stale entries are cleaned up periodically.
 *
 * NOTE: This is suitable for a single-tenant, single-process deployment.
 * For multi-instance deployments, use Redis or a similar shared store.
 */

interface RateLimitEntry {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;         // 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000;  // 15-minute block after exceeding limit
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean stale entries every 5 minutes

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup of expired entries to prevent memory leaks
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      const isWindowExpired = now - entry.firstAttemptAt > WINDOW_MS;
      const isBlockExpired = entry.blockedUntil && now > entry.blockedUntil;

      if (isWindowExpired && (!entry.blockedUntil || isBlockExpired)) {
        store.delete(key);
      }
    }

    // Stop the timer if the store is empty
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);

  // Allow the Node.js process to exit even if the timer is active
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * Check if an IP is currently rate-limited.
 * Returns the number of seconds remaining if blocked, or 0 if allowed.
 */
export function isRateLimited(ip: string): { blocked: boolean; retryAfterSeconds: number } {
  const entry = store.get(ip);

  if (!entry) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  const now = Date.now();

  // Check if there's an active block
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    return { blocked: true, retryAfterSeconds };
  }

  // Check if the window has expired — reset if so
  if (now - entry.firstAttemptAt > WINDOW_MS) {
    store.delete(ip);
    return { blocked: false, retryAfterSeconds: 0 };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

/**
 * Record a failed login attempt for the given IP.
 * Returns `true` if the IP is now blocked.
 */
export function recordFailedAttempt(ip: string): boolean {
  ensureCleanup();

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    // Start a new window
    store.set(ip, {
      count: 1,
      firstAttemptAt: now,
      blockedUntil: null,
    });
    return false;
  }

  entry.count += 1;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    return true;
  }

  return false;
}

/**
 * Reset the rate limit for an IP after a successful login.
 */
export function resetRateLimit(ip: string): void {
  store.delete(ip);
}

/**
 * Get remaining attempts for an IP (useful for response headers).
 */
export function getRemainingAttempts(ip: string): number {
  const entry = store.get(ip);
  if (!entry) return MAX_ATTEMPTS;

  const now = Date.now();
  if (now - entry.firstAttemptAt > WINDOW_MS) return MAX_ATTEMPTS;

  return Math.max(0, MAX_ATTEMPTS - entry.count);
}
