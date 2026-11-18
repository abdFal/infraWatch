import "server-only";

/**
 * Minimal in-memory rate limiter for failed logins.
 * Scope: a single Node.js process (fine for one PM2 instance). For several
 * instances, move this to a shared store such as Redis or PostgreSQL.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failures = new Map<string, { count: number; first: number }>();

export function isRateLimited(key: string) {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordFailure(key: string) {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    failures.set(key, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
}

export function clearFailures(key: string) {
  failures.delete(key);
}
