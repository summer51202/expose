import { createHash } from "node:crypto";

type RateLimitEntry = {
  count: number;
  windowStart: number;
  blockedUntil?: number;
  lastSeen: number;
};

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  blockMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

type MemoryRateLimiterOptions = {
  now?: () => number;
  maxEntries?: number;
};

export type MemoryRateLimiter = {
  check(key: string, options: RateLimitOptions): RateLimitResult;
  reset(key: string): void;
};

const DEFAULT_MAX_ENTRIES = 5_000;

export function hashLimiterIdentity(value: string) {
  return createHash("sha256").update(value || "anonymous").digest("hex");
}

function getAllowedResult(limit: number, count: number): RateLimitResult {
  return {
    allowed: true,
    remaining: Math.max(0, limit - count),
    retryAfterMs: 0,
  };
}

function getBlockedResult(retryAfterMs: number): RateLimitResult {
  return {
    allowed: false,
    remaining: 0,
    retryAfterMs: Math.max(0, retryAfterMs),
  };
}

export function createMemoryRateLimiter(
  options: MemoryRateLimiterOptions = {},
): MemoryRateLimiter {
  const now = options.now ?? (() => Date.now());
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const entries = new Map<string, RateLimitEntry>();

  function sweep(currentTime: number) {
    for (const [key, entry] of entries) {
      const expired =
        entry.lastSeen + 60 * 60 * 1000 < currentTime &&
        (!entry.blockedUntil || entry.blockedUntil <= currentTime);

      if (expired) {
        entries.delete(key);
      }
    }

    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (!oldestKey) {
        break;
      }

      entries.delete(oldestKey);
    }
  }

  return {
    check(key, config) {
      const currentTime = now();
      sweep(currentTime);

      const existing = entries.get(key);
      if (existing?.blockedUntil && existing.blockedUntil > currentTime) {
        existing.lastSeen = currentTime;
        return getBlockedResult(existing.blockedUntil - currentTime);
      }

      if (!existing || currentTime - existing.windowStart >= config.windowMs) {
        const nextEntry: RateLimitEntry = {
          count: 1,
          windowStart: currentTime,
          lastSeen: currentTime,
        };

        entries.set(key, nextEntry);
        return getAllowedResult(config.limit, nextEntry.count);
      }

      existing.count += 1;
      existing.lastSeen = currentTime;

      if (existing.count > config.limit) {
        existing.blockedUntil = currentTime + config.blockMs;
        return getBlockedResult(config.blockMs);
      }

      return getAllowedResult(config.limit, existing.count);
    },
    reset(key) {
      entries.delete(key);
    },
  };
}

export const rateLimiter = createMemoryRateLimiter();
